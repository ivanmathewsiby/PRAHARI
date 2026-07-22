from app.core.neo4j import run_query, run_write_query


class GraphRepository:

    @staticmethod
    def get_all_rings():
        query = """
        MATCH (r:Report)
        WHERE r.ring_id IS NOT NULL
        WITH r.ring_id AS ring_id, collect(r) AS reports
        RETURN ring_id,
               size(reports) AS report_count,
               [x IN reports | x.risk_label][0..5] AS risk_labels,
               [x IN reports | x.claimed_agency][0..5] AS agencies,
               [x IN reports | x.city][0..5] AS cities
        ORDER BY report_count DESC
        """
        return run_query(query)

    @staticmethod
    def get_ring_detail(ring_id: str):
        query = """
        MATCH (r:Report {ring_id: $ring_id})
        OPTIONAL MATCH (r)-[:USED_NUMBER]->(pn:PhoneNumber)
        OPTIONAL MATCH (r)-[:REQUESTED_PAYMENT_TO]->(u:UPI_ID)
        OPTIONAL MATCH (r)-[:REQUESTED_PAYMENT_TO]->(b:BankAccount)
        OPTIONAL MATCH (r)-[:CLAIMED_TO_BE]->(a:ClaimedAgency)
        WITH r, collect(DISTINCT pn.value) AS phones,
             collect(DISTINCT u.value) AS upis,
             collect(DISTINCT b.value) AS banks,
             collect(DISTINCT a.name) AS agencies
        RETURN r.report_id AS report_id,
               r.transcript_preview AS transcript_preview,
               r.risk_label AS risk_label,
               r.claimed_agency AS claimed_agency,
               r.city AS city,
               r.created_at AS created_at,
               phones, upis, banks, agencies
        ORDER BY r.created_at DESC
        """
        return run_query(query, {"ring_id": ring_id})

    @staticmethod
    def get_hub_identifiers(ring_id: str, top_k: int = 5):
        query = """
        MATCH (r:Report {ring_id: $ring_id})
        MATCH (r)-[:USED_NUMBER]->(pn:PhoneNumber)
        RETURN pn.value AS identifier, 'PhoneNumber' AS type,
               count(*) AS connection_count,
               pn.hub_rank AS hub_rank
        ORDER BY pn.hub_rank DESC, connection_count DESC
        LIMIT $top_k
        """
        phones = run_query(query, {"ring_id": ring_id, "top_k": top_k})

        query2 = """
        MATCH (r:Report {ring_id: $ring_id})
        MATCH (r)-[:REQUESTED_PAYMENT_TO]->(u:UPI_ID)
        RETURN u.value AS identifier, 'UPI_ID' AS type,
               count(*) AS connection_count,
               u.hub_rank AS hub_rank
        ORDER BY u.hub_rank DESC, connection_count DESC
        LIMIT $top_k
        """
        upis = run_query(query2, {"ring_id": ring_id, "top_k": top_k})

        query3 = """
        MATCH (r:Report {ring_id: $ring_id})
        MATCH (r)-[:REQUESTED_PAYMENT_TO]->(b:BankAccount)
        RETURN b.value AS identifier, 'BankAccount' AS type,
               count(*) AS connection_count,
               b.hub_rank AS hub_rank
        ORDER BY b.hub_rank DESC, connection_count DESC
        LIMIT $top_k
        """
        banks = run_query(query3, {"ring_id": ring_id, "top_k": top_k})

        sorted_all = sorted(
            phones + upis + banks,
            key=lambda x: (x.get("hub_rank") or 0, x.get("connection_count") or 0),
            reverse=True,
        )

        return sorted_all[:top_k]

    @staticmethod
    def get_evidence_package(ring_id: str):
        query = """
        MATCH (r:Report {ring_id: $ring_id})
        OPTIONAL MATCH (r)-[:USED_NUMBER]->(pn:PhoneNumber)
        OPTIONAL MATCH (r)-[:REQUESTED_PAYMENT_TO]->(u:UPI_ID)
        OPTIONAL MATCH (r)-[:REQUESTED_PAYMENT_TO]->(b:BankAccount)
        OPTIONAL MATCH (r)-[:CLAIMED_TO_BE]->(a:ClaimedAgency)
        WITH r, collect(DISTINCT pn.value) AS phones,
             collect(DISTINCT u.value) AS upis,
             collect(DISTINCT b.value) AS banks,
             collect(DISTINCT a.name) AS agencies
        RETURN {
            report_id: r.report_id,
            transcript_preview: r.transcript_preview,
            risk_label: r.risk_label,
            claimed_agency: r.claimed_agency,
            city: r.city,
            created_at: r.created_at,
            phones: phones,
            upis: upis,
            banks: banks,
            agencies: agencies
        } AS report
        ORDER BY r.created_at DESC
        """
        reports = run_query(query, {"ring_id": ring_id})

        hubs = GraphRepository.get_hub_identifiers(ring_id, top_k=10)

        query_stats = """
        MATCH (r:Report {ring_id: $ring_id})
        RETURN count(r) AS report_count,
               count(DISTINCT r.city) AS city_count,
               collect(DISTINCT r.claimed_agency) AS agencies
        """
        stats = run_query(query_stats, {"ring_id": ring_id})

        return {
            "ring_id": ring_id,
            "stats": stats[0] if stats else {},
            "reports": [r["report"] for r in reports],
            "top_hubs": hubs,
            "legal_reference": {
                "caption": "For law-enforcement review - not a legal determination, requires human verification.",
                "possible_sections": ["BNS 204", "BNS 318", "BNS 336", "BNS 308"],
                "note": "This intelligence brief describes suspected shared infrastructure and must be verified by an authorized human reviewer before action.",
            },
        }

    @staticmethod
    def get_graph_json(ring_id: str):
        query = """
        MATCH (r:Report {ring_id: $ring_id})
        OPTIONAL MATCH (r)-[rel]->(target)
        RETURN r.report_id AS source_id,
               type(rel) AS rel_type,
               coalesce(target.value, target.name) AS target_value,
              [lbl IN labels(target) WHERE lbl IN ['PhoneNumber','UPI_ID','BankAccount','ClaimedAgency']][0] AS target_type,
               target.hub_rank AS hub_rank
        """
        rows = run_query(query, {"ring_id": ring_id})

        nodes = {}
        edges = []

        for row in rows:
            sid = f"Report:{row['source_id']}"
            if sid not in nodes:
                nodes[sid] = {"id": sid, "label": row["source_id"], "type": "Report"}

            if row.get("target_value") and row.get("target_type"):
                ttype = row["target_type"]
                tid = f"{ttype}:{row['target_value']}"
                if tid not in nodes:
                    nodes[tid] = {
                        "id": tid,
                        "label": str(row["target_value"]),
                        "type": ttype,
                        "hub_rank": row.get("hub_rank"),
                    }
                edges.append({
                    "source": sid,
                    "target": tid,
                    "label": row["rel_type"],
                })

        return {"nodes": list(nodes.values()), "edges": edges}

    @staticmethod
    def get_rings_summary():
        query = """
        MATCH (r:Report)
        WHERE r.ring_id IS NOT NULL
        WITH r.ring_id AS ring_id,
             collect(r) AS reports,
             count(DISTINCT r.city) AS city_count
        WHERE size(reports) > 1
        RETURN ring_id,
               size(reports) AS report_count,
               city_count,
               size([x IN reports WHERE x.risk_label = 'CRITICAL']) AS critical_count,
               [x IN reports | x.claimed_agency][0..3] AS agencies
        ORDER BY critical_count DESC, report_count DESC
        """
        raw = run_query(query)

        results = []
        for row in raw:
            report_count = row["report_count"] or 0
            city_count = row["city_count"] or 0
            critical_count = row["critical_count"] or 0
            early_warning_index = min(
                100,
                round((report_count * 8) + (city_count * 7) + (critical_count * 10), 1),
            )
            results.append({
                "ring_id": row["ring_id"],
                "report_count": report_count,
                "city_count": city_count,
                "critical_count": critical_count,
                "agencies": list(set(a for a in row["agencies"] if a)),
                "campaign_early_warning_index": early_warning_index,
            })
        return results

    @staticmethod
    def clear_graph():
        query = "MATCH (n) DETACH DELETE n"
        run_write_query(query)
        return {"status": "cleared"}
