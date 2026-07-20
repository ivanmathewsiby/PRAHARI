import uuid
import random

from app.core.database import SessionLocal
from app.models.incident import IncidentEvent
from app.models.audit import AuditLog


db = SessionLocal()


RING_A_PHONE = "9812345678"
RING_A_UPI = "cbi.verify@upi"
RING_A_BANK = "123456789012345678"

RING_B_PHONE = "9988776655"
RING_B_UPI = "ed.notice@paytm"
RING_B_BANK = "876543210987654321"

RING_C_PHONE = "9876543210"
RING_C_UPI = "customs.fee@upi"


incidents_data = [
    # ---- RING A: CBI Impersonation (5 incidents) ----
    {
        "citizen_name": "Rahul Sharma",
        "phone_number": RING_A_PHONE,
        "transcript": "This is CBI officer Sharma. A parcel containing narcotics was booked under your Aadhaar at Mumbai customs. You are under digital arrest. Do not tell your family. Transfer Rs.85,000 to this verification account: cbi.verify@upi immediately or we will arrest you.",
        "location": "Mumbai",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "HIGH",
        "status": "OPEN",
    },
    {
        "citizen_name": "Priya Patel",
        "phone_number": RING_A_PHONE,
        "transcript": "CBI cyber cell here. Your Aadhaar was used in a money laundering case. Keep this confidential. We need you to transfer Rs.1,20,000 to cbi.verify@upi for verification. Do not involve your family.",
        "location": "Delhi",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "HIGH",
        "status": "OPEN",
    },
    {
        "citizen_name": "Amit Singh",
        "phone_number": "9876123450",
        "transcript": "Sir, this is from CBI Headquarters. Your bank account 123456789012345678 is linked to a terror funding case. You must transfer all funds to cbi.verify@upi for safe-keeping. This is a confidential matter.",
        "location": "Bengaluru",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "HIGH",
        "status": "UNDER_REVIEW",
    },
    {
        "citizen_name": "Sneha Reddy",
        "phone_number": RING_A_PHONE,
        "transcript": "I am calling from CBI. A case has been filed against you under IPC 420. You need to pay Rs.50,000 verification fee to cbi.verify@upi. Do not discuss this with anyone or you will be arrested immediately.",
        "location": "Hyderabad",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "CRITICAL",
        "status": "OPEN",
    },
    {
        "citizen_name": "Vikram Joshi",
        "phone_number": RING_A_PHONE,
        "transcript": "CBI warning: your account 123456789012345678 is frozen by Supreme Court order. Pay Rs.2,00,000 to cbi.verify@upi for verification and release. Do not inform family - this is a sealed matter.",
        "location": "Pune",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "CRITICAL",
        "status": "OPEN",
    },
    # ---- RING B: ED Impersonation (4 incidents) ----
    {
        "citizen_name": "Arjun Menon",
        "phone_number": RING_B_PHONE,
        "transcript": "Enforcement Directorate officer speaking. Your account 876543210987654321 is under investigation for FEMA violation. Pay Rs.95,000 to ed.notice@paytm for compliance verification. Keep this strictly confidential.",
        "location": "Kochi",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "HIGH",
        "status": "OPEN",
    },
    {
        "citizen_name": "Neha Kapoor",
        "phone_number": RING_B_PHONE,
        "transcript": "ED cyber crime unit. Your transactions are flagged for money laundering. Do not tell anyone. Deposit Rs.1,50,000 to ed.notice@paytm immediately for verification or arrest warrant will be issued.",
        "location": "Delhi",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "HIGH",
        "status": "UNDER_REVIEW",
    },
    {
        "citizen_name": "Rohan Das",
        "phone_number": "8765432109",
        "transcript": "ED compliance officer here. Your bank account 876543210987654321 is linked to hawala transactions. Pay verification amount of Rs.75,000 to ed.notice@paytm. Do not discuss this with your family or bank staff.",
        "location": "Kolkata",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "CRITICAL",
        "status": "OPEN",
    },
    {
        "citizen_name": "Karan Mehta",
        "phone_number": RING_B_PHONE,
        "transcript": "This is ED Directorate. A case has been opened against you under PMLA. You must transfer Rs.3,00,000 to ed.notice@paytm for safe-keeping. This conversation is confidential - do not tell anyone.",
        "location": "Ahmedabad",
        "fraud_type": "Digital Arrest Scam",
        "risk_level": "CRITICAL",
        "status": "OPEN",
    },
    # ---- RING C: Customs Impersonation (4 incidents) ----
    {
        "citizen_name": "Ananya Gupta",
        "phone_number": RING_C_PHONE,
        "transcript": "Customs department calling. Your international parcel is detained containing illegal goods. Pay customs clearance fee of Rs.45,000 to customs.fee@upi. Do not share this with anyone.",
        "location": "Mumbai",
        "fraud_type": "Courier Scam",
        "risk_level": "HIGH",
        "status": "OPEN",
    },
    {
        "citizen_name": "Ishaan Verma",
        "phone_number": RING_C_PHONE,
        "transcript": "Customs clearance officer. Your courier from Dubai is held. Pay Rs.67,000 to customs.fee@upi for release or the parcel will be seized and NCB will be informed. Keep this confidential.",
        "location": "Chennai",
        "fraud_type": "Courier Scam",
        "risk_level": "HIGH",
        "status": "OPEN",
    },
    {
        "citizen_name": "Divya Nair",
        "phone_number": "7654321098",
        "transcript": "Senior customs inspector here. A parcel in your name contains undeclared foreign currency. Pay Rs.1,10,000 penalty to customs.fee@upi immediately. Do not inform anyone or you will be arrested.",
        "location": "Bengaluru",
        "fraud_type": "Courier Scam",
        "risk_level": "CRITICAL",
        "status": "UNDER_REVIEW",
    },
    {
        "citizen_name": "Rajat Bansal",
        "phone_number": RING_C_PHONE,
        "transcript": "Customs authority final notice. Your package has been seized by DRI. To avoid legal action, deposit Rs.88,000 to customs.fee@upi. This is a confidential matter - do not tell family.",
        "location": "Jaipur",
        "fraud_type": "Courier Scam",
        "risk_level": "CRITICAL",
        "status": "OPEN",
    },
    # ---- Benign / Other (7 more to round out) ----
    {
        "citizen_name": "Sunita Devi",
        "phone_number": "9898989898",
        "transcript": "Hi beta, I reached home safely. The train was on time. Send the photos when you get time. Take care and eat properly. Love you.",
        "location": "Lucknow",
        "fraud_type": "Clean / Low Risk",
        "risk_level": "LOW",
        "status": "CLOSED",
    },
    {
        "citizen_name": "Rajesh Kumar",
        "phone_number": "8877665544",
        "transcript": "Your ICICI bank credit card statement is ready. Your payment of Rs.12,500 is due on 15th. Please pay through the official app or net banking. Call 1800-XXX-XXXX for queries.",
        "location": "Delhi",
        "fraud_type": "Clean / Low Risk",
        "risk_level": "LOW",
        "status": "CLOSED",
    },
    {
        "citizen_name": "Meera Joshi",
        "phone_number": "7766554433",
        "transcript": "Your Aadhaar update request has been processed. Visit the nearest Seva Kendra with original documents to complete the update. This is a free service.",
        "location": "Pune",
        "fraud_type": "Clean / Low Risk",
        "risk_level": "LOW",
        "status": "CLOSED",
    },
    {
        "citizen_name": "Vijay Pandey",
        "phone_number": "9555666777",
        "transcript": "Thank you for registering for the cyber safety workshop. The event is on Saturday at 10 AM at the Police Commissioner's office. Please bring a government ID.",
        "location": "Mumbai",
        "fraud_type": "Clean / Low Risk",
        "risk_level": "LOW",
        "status": "CLOSED",
    },
    {
        "citizen_name": "Pooja Agarwal",
        "phone_number": "84448888",
        "transcript": "Your Swiggy order #ORD12345 has been delivered. Enjoy your meal! Rate your delivery experience in the app.",
        "location": "Bengaluru",
        "fraud_type": "Clean / Low Risk",
        "risk_level": "LOW",
        "status": "CLOSED",
    },
    {
        "citizen_name": "Manoj Tiwari",
        "phone_number": "7333555666",
        "transcript": "RBI KYC update: Your bank account needs annual KYC update. Visit your home branch with Aadhaar and PAN card. No payment required. RBI never asks for OTP or password.",
        "location": "Lucknow",
        "fraud_type": "Clean / Low Risk",
        "risk_level": "LOW",
        "status": "CLOSED",
    },
]

print("Seeding PRAHARI database with planted fraud rings...")

for data in incidents_data:
    incident_id = str(uuid.uuid4())[:8]
    incident = IncidentEvent(
        incident_id=incident_id,
        citizen_name=data["citizen_name"],
        phone_number=data["phone_number"],
        transcript=data["transcript"],
        location=data["location"],
        fraud_type=data["fraud_type"],
        risk_level=data["risk_level"],
        status=data["status"],
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    audit = AuditLog(
        incident_id=incident_id,
        action="INCIDENT_CREATED",
        rule_hits={
            "keyword_match": True,
            "authority_impersonation": data["risk_level"] in ("HIGH", "CRITICAL"),
            "isolation_detected": "do not tell" in data["transcript"].lower() or "confidential" in data["transcript"].lower(),
            "payment_requested": "@upi" in data["transcript"] or "@paytm" in data["transcript"],
        },
        model_version="v1.0",
        prompt_version="v1",
        score_components={
            "phase_count": 3 if data["risk_level"] == "CRITICAL" else 2 if data["risk_level"] == "HIGH" else 0,
            "risk_score": 85 if data["risk_level"] == "CRITICAL" else 65 if data["risk_level"] == "HIGH" else 10,
        },
        threshold_version="v1",
    )
    db.add(audit)
    db.commit()

print(f"Successfully inserted {len(incidents_data)} incidents with 3 planted fraud rings.")

ring_a_count = sum(1 for d in incidents_data if d["phone_number"] == RING_A_PHONE or RING_A_UPI in d["transcript"])
ring_b_count = sum(1 for d in incidents_data if d["phone_number"] == RING_B_PHONE or RING_B_UPI in d["transcript"])
ring_c_count = sum(1 for d in incidents_data if d["phone_number"] == RING_C_PHONE or RING_C_UPI in d["transcript"])
print(f"  Ring A (CBI, phone={RING_A_PHONE}): ~{ring_a_count} reports")
print(f"  Ring B (ED, phone={RING_B_PHONE}): ~{ring_b_count} reports")
print(f"  Ring C (Customs, phone={RING_C_PHONE}): ~{ring_c_count} reports")

db.close()
