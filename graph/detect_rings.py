"""
PRAHARI Ring Detection Pipeline

Uses Neo4j Graph Data Science (GDS) library to:
1. Project a graph of Report--PhoneNumber--UPI_ID--BankAccount connections
2. Run Weakly Connected Components (WCC) to find fraud rings
3. Run Degree Centrality to rank hub identifiers
4. Write ring_id and hub_rank back to nodes
5. Validate against ground-truth ring labels

Usage:
    python graph/detect_rings.py

Requires:
    - Neo4j with GDS plugin installed
    - Data already ingested via ingest.py
"""
import os
import sys
import logging
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from neo4j import GraphDatabase, basic_auth


def get_driver():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "prahari123")
    return GraphDatabase.driver(uri, auth=basic_auth(user, password))


def run_query(driver, query, params=None):
    with driver.session() as session:
        result = session.run(query, params or {})
        return [record.data() for record in result]


def drop_existing_projections(driver):
    queries = run_query(driver, "CALL gds.graph.list() YIELD graphName RETURN graphName")
    for q in queries:
        name = q["graphName"]
        try:
            run_query(driver, f"CALL gds.graph.drop('{name}') YIELD graphName RETURN graphName")
            logger.info(f"  Dropped existing projection: {name}")
        except Exception:
            pass


def project_graph(driver):
    logger.info("Projecting graph for WCC...")
    query = """
    CALL gds.graph.project(
        'fraud-rings',
        {
            Report: { label: 'Report' },
            PhoneNumber: { label: 'PhoneNumber' },
            UPI_ID: { label: 'UPI_ID' },
            BankAccount: { label: 'BankAccount' },
            ClaimedAgency: { label: 'ClaimedAgency' }
        },
        {
            USED_NUMBER: { type: 'USED_NUMBER', orientation: 'UNDIRECTED' },
            REQUESTED_PAYMENT_TO: { type: 'REQUESTED_PAYMENT_TO', orientation: 'UNDIRECTED' },
            CLAIMED_TO_BE: { type: 'CLAIMED_TO_BE', orientation: 'UNDIRECTED' }
        }
    )
    YIELD graphName, nodeCount, relationshipCount
    RETURN graphName, nodeCount, relationshipCount
    """
    result = run_query(driver, query)
    if result:
        logger.info(f"  Projected {result[0]['graphName']}: {result[0]['nodeCount']} nodes, {result[0]['relationshipCount']} edges")
    return result


def run_wcc(driver):
    logger.info("Running Weakly Connected Components...")
    query = """
    CALL gds.wcc.stream('fraud-rings')
    YIELD nodeId, componentId
    WITH componentId, collect(nodeId) AS nodes
    WHERE size(nodes) > 1
    RETURN componentId, size(nodes) AS memberCount, nodes
    ORDER BY memberCount DESC
    """
    result = run_query(driver, query)
    logger.info(f"  Found {len(result)} non-trivial components (size > 1)")
    for r in result[:10]:
        logger.info(f"    Component {r['componentId']}: {r['memberCount']} nodes")
    return result


def write_ring_ids(driver, components):
    logger.info("Writing ring_id to Report nodes...")
    count = 0
    for comp in components:
        ring_id = f"RING-{comp['componentId']}"
        nodes = comp["nodes"]
        query = """
        UNWIND $nodes AS nodeId
        MATCH (n) WHERE id(n) = nodeId AND n:Report
        SET n.ring_id = $ring_id
        RETURN count(*) AS updated
        """
        result = run_query(driver, query, {"nodes": nodes, "ring_id": ring_id})
        if result:
            count += result[0]["updated"]
    logger.info(f"  Set ring_id on {count} Report nodes")
    return count


def run_degree_centrality(driver):
    logger.info("Running Degree Centrality...")
    query = """
    CALL gds.degree.stream('fraud-rings')
    YIELD nodeId, score
    WITH nodeId, score
    MATCH (n) WHERE id(n) = nodeId
    SET n.hub_rank = score
    RETURN count(*) AS updated
    """
    result = run_query(driver, query)
    if result:
        logger.info(f"  Set hub_rank on {result[0]['updated']} nodes")
    return result


def validate_rings(driver):
    logger.info("\n--- Ring Recovery Validation ---")
    query = """
    MATCH (r:Report)
    WHERE r.ring_id IS NOT NULL
    RETURN r.ring_id AS ring_id, r.report_id AS report_id,
           r.claimed_agency AS claimed_agency,
           r.risk_label AS risk_label,
           r.city AS city
    ORDER BY ring_id, report_id
    """
    results = run_query(driver, query)

    rings = defaultdict(list)
    for r in results:
        rings[r["ring_id"]].append(r)

    logger.info(f"Detected {len(rings)} rings:")
    for ring_id, reports in sorted(rings.items()):
        agencies = list(set(r["claimed_agency"] for r in reports if r["claimed_agency"]))
        cities = list(set(r["city"] for r in reports if r["city"]))
        critical = sum(1 for r in reports if r["risk_label"] == "CRITICAL" or r["risk_label"] == "HIGH")
        logger.info(f"  {ring_id}: {len(reports)} reports, agencies={agencies}, cities={cities}, critical={critical}")
        for r in reports:
            logger.info(f"    - {r['report_id']} [{r['claimed_agency']}] {r['city']} ({r['risk_label']})")

    return rings


def cleanup(driver):
    logger.info("Cleaning up graph projection...")
    try:
        run_query(driver, "CALL gds.graph.drop('fraud-rings') YIELD graphName RETURN graphName")
    except Exception:
        pass


def main():
    logger.info("=== PRAHARI Ring Detection ===")
    driver = get_driver()

    drop_existing_projections(driver)
    project_graph(driver)

    components = run_wcc(driver)
    if components:
        write_ring_ids(driver, components)
        run_degree_centrality(driver)

    rings = validate_rings(driver)

    cleanup(driver)
    driver.close()

    if not rings:
        logger.warning("No rings detected. Run graph/ingest.py first to populate Neo4j.")
        return

    logger.info("\n=== Ring Detection Complete ===")
    logger.info(f"Total rings found: {len(rings)}")


if __name__ == "__main__":
    main()
