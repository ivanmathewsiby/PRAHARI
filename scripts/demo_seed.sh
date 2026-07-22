#!/bin/bash
set -e

echo "=========================================="
echo "  PRAHARI — One-Command Demo Seed"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose not found.${NC}"
    echo "Install Docker Desktop or Docker Compose first."
    exit 1
fi

# Use `docker compose` if available, otherwise `docker-compose`
COMPOSE_CMD="docker-compose"
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

echo ""
echo "Step 1: Starting services..."
echo "--------------------------"
$COMPOSE_CMD up -d
echo ""

echo "Step 2: Waiting for PostgreSQL..."
echo "--------------------------------"
sleep 5
$COMPOSE_CMD exec -T postgres pg_isready -U postgres || { sleep 5; $COMPOSE_CMD exec -T postgres pg_isready -U postgres; }
echo -e "${GREEN}PostgreSQL is ready.${NC}"
echo ""

echo "Step 3: Waiting for Neo4j..."
echo "----------------------------"
sleep 10
echo -e "${GREEN}Neo4j is ready.${NC}"
echo ""

echo "Step 4: Resetting database..."
echo "----------------------------"
$COMPOSE_CMD exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS prahari;" 2>/dev/null || true
$COMPOSE_CMD exec -T postgres psql -U postgres -c "CREATE DATABASE prahari;" 2>/dev/null || true
echo -e "${GREEN}Database reset.${NC}"
echo ""

echo "Step 5: Running Alembic migrations..."
echo "-------------------------------------"
$COMPOSE_CMD exec -T backend alembic upgrade head
echo -e "${GREEN}Migrations applied.${NC}"
echo ""

echo "Step 6: Seeding incident data with planted rings..."
echo "---------------------------------------------------"
$COMPOSE_CMD exec -T backend python seed.py
echo -e "${GREEN}Seed data inserted.${NC}"
echo ""

echo "Step 7: Initializing Neo4j schema..."
echo "------------------------------------"
$COMPOSE_CMD exec -T backend python -c "
from app.core.neo4j import apply_schema
result = apply_schema()
print(f'Schema applied: {result}')
"
echo -e "${GREEN}Neo4j schema ready.${NC}"
echo ""

echo "Step 8: Ingesting incidents into Neo4j graph..."
echo "------------------------------------------------"
$COMPOSE_CMD exec -T backend python -c "
from app.core.database import SessionLocal
from app.services.graph_service import GraphService
db = SessionLocal()
try:
    result = GraphService.initialize()
    print(f'Init: {result}')
    result = GraphService.ingest_all_incidents(db)
    print(f'Ingest: {result}')
finally:
    db.close()
"
echo -e "${GREEN}Graph ingestion complete.${NC}"
echo ""

echo "Step 9: Running ring detection..."
echo "---------------------------------"
$COMPOSE_CMD exec -T backend python -c "
from app.core.neo4j import run_query, run_write_query

try:
    run_query('CALL gds.graph.drop(\"fraud-rings\") YIELD graphName RETURN graphName')
except:
    pass

proj = run_query(\"\"\"
CALL gds.graph.project(
    'fraud-rings',
    {
        Report: { label: 'Report' },
        PhoneNumber: { label: 'PhoneNumber' },
        UPI_ID: { label: 'UPI_ID' },
        BankAccount: { label: 'BankAccount' }
    },
    {
        USED_NUMBER: { type: 'USED_NUMBER', orientation: 'UNDIRECTED' },
        REQUESTED_PAYMENT_TO: { type: 'REQUESTED_PAYMENT_TO', orientation: 'UNDIRECTED' }
    }
)
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount
\"\"\")
print(f'Projected: {proj}')

wcc = run_query(\"\"\"
CALL gds.wcc.stream('fraud-rings')
YIELD nodeId, componentId
WITH componentId, collect(nodeId) AS nodes
WHERE size(nodes) > 1
RETURN componentId, size(nodes) AS memberCount, nodes
ORDER BY memberCount DESC
\"\"\")
print(f'WCC found {len(wcc)} components (size>1)')

for comp in wcc:
    ring_id = f'RING-{comp[\"componentId\"]}'
    run_write_query(
        'UNWIND \$nodes AS nodeId MATCH (n) WHERE id(n) = nodeId AND n:Report SET n.ring_id = \$ring_id',
        {'nodes': comp['nodes'], 'ring_id': ring_id}
    )
    print(f'  {ring_id}: {comp[\"memberCount\"]} nodes')

deg = run_query(\"\"\"
CALL gds.degree.stream('fraud-rings')
YIELD nodeId, score
WITH nodeId, score
MATCH (n) WHERE id(n) = nodeId
SET n.hub_rank = score
RETURN count(*) AS updated
\"\"\")
print(f'Degree centrality: {deg}')

summary = run_query(\"\"\"
MATCH (r:Report)
WHERE r.ring_id IS NOT NULL
RETURN r.ring_id AS ring_id, count(r) AS cnt
ORDER BY cnt DESC
\"\"\")
print(f'Detected rings:')
for s in summary:
    print(f'  {s[\"ring_id\"]}: {s[\"cnt\"]} reports')

try:
    run_query('CALL gds.graph.drop(\"fraud-rings\") YIELD graphName RETURN graphName')
except:
    pass
"
echo -e "${GREEN}Ring detection complete.${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}  Demo Ready!${NC}"
echo "=========================================="
echo ""
echo "  Citizen Check:      http://localhost:3000/check"
echo "  Command Dashboard:  http://localhost:3000/command"
echo "  Backend API:        http://localhost:8000"
echo "  API Docs:           http://localhost:8000/docs"
echo "  Neo4j Browser:      http://localhost:7474 (neo4j/prahari123)"
echo ""
echo "  Example scam transcripts you can paste at /check:"
echo ""
echo "  --- CBI Scam (Ring A) ---"
echo "  This is CBI officer Sharma. A parcel containing narcotics"
echo "  was booked under your Aadhaar at Mumbai customs. You are"
echo "  under digital arrest. Do not tell your family. Transfer"
echo "  Rs.85,000 to cbi.verify@upi immediately or we will arrest you."
echo ""
echo "  --- ED Scam (Ring B) ---"
echo "  ED cyber crime unit. Your transactions are flagged for"
echo "  money laundering. Do not tell anyone. Deposit Rs.1,50,000"
echo "  to ed.notice@paytm immediately or arrest warrant will be issued."
echo ""
echo "  --- Safe (benign) ---"
echo "  Hi beta, I reached home safely. The train was on time."
echo "  Send the photos when you get time. Love you."
echo ""
echo "  API Endpoints for Rings:"
echo "    GET http://localhost:8000/api/rings"
echo "    GET http://localhost:8000/api/rings/RING-{id}"
echo "    GET http://localhost:8000/api/rings/RING-{id}/graph"
echo "    GET http://localhost:8000/api/rings/RING-{id}/evidence-package"
echo ""
echo "=========================================="
