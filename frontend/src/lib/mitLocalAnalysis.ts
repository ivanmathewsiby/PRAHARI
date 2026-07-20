import type { AnalysisResponse, EvidenceItem, ScamPhase } from "../data/mockAnalysis";

type RuleKey = "authority" | "isolation" | "payment" | "legal" | "urgency" | "hook";

const PATTERNS: Record<RuleKey, RegExp[]> = {
  authority: [
    /\bCBI\b/gi, /\bED\b/gi, /Enforcement Directorate/gi, /\bCustoms\b/gi,
    /\bRBI\b/gi, /Reserve Bank of India/gi, /\bTRAI\b/gi, /\bpolice\b/gi,
    /cyber (?:cell|crime|branch)/gi, /\bInterpol\b/gi, /\bjudge\b/gi,
    /सीबीआई|ईडी|पुलिस|कस्टम्स|आरबीआई|अधिकारी/gi,
  ],
  isolation: [
    /don'?t tell anyone/gi, /do not tell anyone/gi, /don'?t inform (?:your )?family/gi,
    /do not inform (?:your )?family/gi, /keep this secret/gi, /stay on (?:the )?video call/gi,
    /do not disconnect/gi, /don'?t hang up/gi, /stay on the line/gi,
    /don'?t talk to anyone/gi, /keep (?:this|the audit) confidential/gi,
    /किसी को मत बताना|परिवार को मत बताना|फोन मत काटना|कॉल पर रहो/gi,
    /kisi ko mat bata(?:na|o)|family ko mat bata(?:na|o)|phone mat kaat(?:na|o)|call par raho/gi,
  ],
  payment: [
    /transfer (?:money|rs\.?\s?[\d,]+)/gi, /send money/gi, /safe account/gi,
    /verification (?:amount|fee|vault)/gi, /\b[\w.-]{3,}@[\w.-]{2,}\b/gi, /\bUPI\b/gi, /bank account/gi,
    /\bcrypto(?:currency)?\b/gi, /\bBitcoin\b/gi, /\bOTP\b/gi, /card details/gi,
    /account number/gi, /\b\d{9,18}\b/gi, /\bIFSC\b/gi, /\bNEFT\b/gi, /\bRTGS\b/gi,
    /deposit(?:ed)?/gi, /pay(?:ment)? (?:of )?(?:rs\.?|inr|rupees)/gi,
    /पैसे ट्रांसफर|रुपये भेजो|सुरक्षित खात(?:ा|े)|सत्यापन शुल्क|यूपीआई|ओटीपी/gi,
    /paise transfer|rupaye bhejo|safe khaate?|verification ke liye paisa/gi,
  ],
  legal: [
    /\bFIR\b/gi, /\bwarrant\b/gi, /court order/gi, /case number/gi,
    /legal notice/gi, /narcotics parcel/gi, /customs seizure/gi,
    /non[- ]?bailable warrant/gi, /\bsummons\b/gi,
    /एफआईआर|वारंट|अदालत का आदेश|केस नंबर/gi, /giraftari warrant|case number/gi,
  ],
  urgency: [
    /\barrest(?:ed)?\b/gi, /\bjail\b/gi, /immediate(?:ly)?/gi, /suspend (?:your )?SIM/gi,
    /freeze(?:d)? (?:your )?account/gi, /within \d+ (?:hours?|minutes?)/gi,
    /right now/gi, /last warning/gi, /final warning/gi, /or else/gi,
    /गिरफ्तार|जेल|तुरंत|अभी|खाता फ्रीज/gi, /giraftar|turant|abhi|khata freeze/gi,
  ],
  hook: [
    /\bparcel\b/gi, /\bnarcotics?\b/gi, /money laundering/gi, /KYC/gi,
    /SIM (?:suspension|disconnection)/gi, /tax (?:notice|evasion)/gi,
    /unauthori[sz]ed transaction/gi, /Aadhaar.*linked/gi,
  ],
};

const LABELS: Record<RuleKey, string> = {
  authority: "Authority impersonation",
  isolation: "Isolation pressure",
  payment: "Payment or credential demand",
  legal: "Fabricated legal evidence",
  urgency: "Urgency or threat",
  hook: "Scam hook",
};

function collectMatches(text: string, patterns: RegExp[]): string[] {
  const values = patterns.flatMap((pattern) => Array.from(text.matchAll(pattern), (match) => match[0]));
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildTimeline(hits: Record<RuleKey, string[]>): ScamPhase[] {
  const phases = [
    ["Hook", "प्रारंभिक बहाना", "hook", "A parcel, account, KYC, SIM, tax, or laundering pretext starts the pressure."],
    ["Authority", "अधिकारी होने का दावा", "authority", "The caller claims government, police, banking, or enforcement authority."],
    ["Fabricated Evidence", "झूठा कानूनी सबूत", "legal", "An FIR, warrant, court order, case number, or seizure is used as proof."],
    ["Isolation", "अलगाव", "isolation", "The target is told not to disconnect, consult family, or seek independent help."],
    ["Drain", "भुगतान की मांग", "payment", "Money, account details, OTP, UPI, or a verification transfer is requested."],
  ] as const;

  return phases.map(([phase, phaseHi, key, detectedExplanation]) => ({
    phase,
    phase_hi: phaseHi,
    detected: hits[key].length > 0,
    explanation: hits[key].length > 0
      ? `${detectedExplanation} Found: ${hits[key].join(", ")}.`
      : `No ${phase.toLowerCase()} evidence was found in this text.`,
    explanation_hi: hits[key].length > 0 ? detectedExplanation : `इस चरण का कोई स्पष्ट संकेत नहीं मिला।`,
  }));
}

function complaintFor(text: string, evidence: EvidenceItem[]): string {
  const excerpts = evidence.map((item) => `- ${item.text} (${item.reason})`).join("\n");
  return `To,\nThe Cyber Crime Investigation Unit,\n\nSubject: Report of a suspected digital-arrest scam\n\nI am reporting a suspicious communication that PRAHARI identified using its private device-side safety analysis. The communication used coercive scam indicators and may require verification.\n\nEvidence reviewed by me:\n${excerpts || "- No excerpt selected"}\n\nTranscript excerpt:\n${text.slice(0, 700)}\n\nI understand this is a complaint draft and will verify its contents before submission.\n\nSincerely,\n[Your name]\n[Contact details]`;
}

export async function analyzeLocally(text: string): Promise<AnalysisResponse> {
  const hits = Object.fromEntries(
    (Object.keys(PATTERNS) as RuleKey[]).map((key) => [key, collectMatches(text, PATTERNS[key])]),
  ) as Record<RuleKey, string[]>;

  const present = (key: RuleKey) => hits[key].length > 0;
  let score = 0;
  score += present("authority") ? 15 : 0;
  score += present("isolation") ? 15 : 0;
  score += present("payment") ? 15 : 0;
  score += present("legal") ? 15 : 0;
  score += present("urgency") ? 10 : 0;
  score += present("hook") ? 8 : 0;

  const combinations = [
    present("authority") && present("isolation") && present("payment"),
    present("legal") && present("payment"),
    present("legal") && present("authority"),
    present("authority") && present("payment") && present("urgency"),
    present("isolation") && present("payment") && present("urgency"),
  ].filter(Boolean).length;
  score += combinations * 20;
  const categoryCount = (Object.keys(hits) as RuleKey[]).filter(present).length;
  score += categoryCount >= 4 ? 15 : categoryCount === 3 ? 10 : categoryCount === 2 ? 5 : 0;
  score = Math.min(100, score);

  const hardCritical =
    (present("authority") && present("isolation") && present("payment")) ||
    (present("legal") && present("payment"));
  const risk: AnalysisResponse["risk"] = hardCritical || score >= 70
    ? "critical"
    : score >= 40
      ? "suspicious"
      : "safe";

  const evidence: EvidenceItem[] = (Object.keys(hits) as RuleKey[])
    .filter((key) => hits[key].length > 0)
    .flatMap((key) => hits[key].slice(0, 2).map((value) => ({
      text: value,
      text_hi: value,
      reason: LABELS[key],
      reason_hi: LABELS[key],
      severity: (risk === "critical" || key === "payment" || key === "isolation" ? "high" : "medium") as EvidenceItem["severity"],
    })))
    .slice(0, 8);

  const reasons = evidence.length > 0
    ? [...new Set(evidence.map((item) => item.reason))]
    : ["No coercion, impersonation, legal-pressure, isolation, or payment pattern was found."];
  const recommendations = risk === "critical"
    ? ["Hang up now and do not transfer money.", "Call a trusted person immediately.", "For financial cyber fraud, call 1930 and preserve the evidence."]
    : risk === "suspicious"
      ? ["Verify the caller through an official number.", "Do not share an OTP, PIN, account balance, or payment details."]
      : ["No immediate scam pattern was detected.", "Continue to protect financial credentials and verify unexpected requests."];

  await new Promise((resolve) => window.setTimeout(resolve, 350));
  const complaintDraft = complaintFor(text, evidence);
  return {
    risk,
    score,
    confidence: Math.min(0.96, 0.55 + categoryCount * 0.07 + combinations * 0.06),
    timeline: buildTimeline(hits),
    evidence,
    recommendations,
    recommendations_hi: recommendations,
    complaintDraft,
    complaintDraft_hi: complaintDraft,
    whyExplanation: reasons,
    whyExplanation_hi: reasons,
  };
}
