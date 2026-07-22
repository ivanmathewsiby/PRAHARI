from neo4j import GraphDatabase, basic_auth

from app.core.config import settings

_driver = None


def get_neo4j_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=basic_auth(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
    return _driver


def close_neo4j_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def run_query(query, params=None):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(query, params or {})
        return [record.data() for record in result]


def run_write_query(query, params=None):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(query, params or {})
        records = [record.data() for record in result]
        session.last_bookmarks()
        return records


def apply_schema():
    constraints = [
        "CREATE CONSTRAINT report_id IF NOT EXISTS FOR (r:Report) REQUIRE r.report_id IS UNIQUE",
        "CREATE CONSTRAINT phone_number IF NOT EXISTS FOR (p:PhoneNumber) REQUIRE p.value IS UNIQUE",
        "CREATE CONSTRAINT upi_id IF NOT EXISTS FOR (u:UPI_ID) REQUIRE u.value IS UNIQUE",
        "CREATE CONSTRAINT bank_account IF NOT EXISTS FOR (b:BankAccount) REQUIRE b.value IS UNIQUE",
        "CREATE CONSTRAINT agency_name IF NOT EXISTS FOR (a:ClaimedAgency) REQUIRE a.name IS UNIQUE",
    ]
    for cql in constraints:
        run_write_query(cql)
    return {"applied": len(constraints)}
