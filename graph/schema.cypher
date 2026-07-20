CREATE CONSTRAINT report_id IF NOT EXISTS
FOR (r:Report) REQUIRE r.report_id IS UNIQUE;

CREATE CONSTRAINT phone_number IF NOT EXISTS
FOR (p:PhoneNumber) REQUIRE p.value IS UNIQUE;

CREATE CONSTRAINT upi_id IF NOT EXISTS
FOR (u:UPI_ID) REQUIRE u.value IS UNIQUE;

CREATE CONSTRAINT bank_account IF NOT EXISTS
FOR (b:BankAccount) REQUIRE b.value IS UNIQUE;

CREATE CONSTRAINT claimed_agency IF NOT EXISTS
FOR (a:ClaimedAgency) REQUIRE a.name IS UNIQUE;

CREATE CONSTRAINT script_template IF NOT EXISTS
FOR (s:ScriptTemplate) REQUIRE s.fingerprint IS UNIQUE;

CREATE CONSTRAINT document_fingerprint IF NOT EXISTS
FOR (d:Document) REQUIRE d.fingerprint IS UNIQUE;
