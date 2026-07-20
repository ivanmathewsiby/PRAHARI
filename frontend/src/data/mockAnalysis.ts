export interface ScamPhase {
  phase: string;
  phase_hi: string;
  detected: boolean;
  explanation: string;
  explanation_hi: string;
}

export interface EvidenceItem {
  text: string;
  text_hi: string;
  reason: string;
  reason_hi: string;
  severity: "low" | "medium" | "high";
}

export interface AnalysisResponse {
  risk: "safe" | "suspicious" | "critical";
  score: number;
  confidence: number;
  timeline: ScamPhase[];
  evidence: EvidenceItem[];
  recommendations: string[];
  recommendations_hi: string[];
  complaintDraft: string;
  complaintDraft_hi: string;
  whyExplanation: string[];
  whyExplanation_hi: string[];
}

export const mockResponseCritical: AnalysisResponse = {
  risk: "critical",
  score: 96,
  confidence: 0.98,
  timeline: [
    {
      phase: "Authority",
      phase_hi: "प्राधिकरण का दिखावा",
      detected: true,
      explanation: "Caller impersonated a CBI officer and displayed a forged identification badge.",
      explanation_hi: "कॉलर ने सीबीआई अधिकारी होने का ढोंग किया और एक जाली पहचान पत्र दिखाया।"
    },
    {
      phase: "Fear",
      phase_hi: "भय और धमकी",
      detected: true,
      explanation: "Victim threatened with immediate imprisonment for money laundering.",
      explanation_hi: "पीड़ित को मनी लॉन्ड्रिंग के आरोप में तुरंत जेल भेजने की धमकी दी गई।"
    },
    {
      phase: "Isolation",
      phase_hi: "अलगाव (Isolation)",
      detected: true,
      explanation: "Victim was strictly ordered not to disconnect the call, seek legal counsel, or notify family.",
      explanation_hi: "पीड़ित को सख्त हिदायत दी गई कि वह कॉल न काटे, कानूनी सलाह न ले या परिवार को सूचित न करे।"
    },
    {
      phase: "Money",
      phase_hi: "पैसे की मांग",
      detected: true,
      explanation: "Asked to transfer ₹85,000 to a temporary 'safe government verification vault'.",
      explanation_hi: "सत्यापन के लिए ₹85,000 को अस्थायी 'सुरक्षित सरकारी सत्यापन खाते' में ट्रांसफर करने के लिए कहा गया।"
    },
    {
      phase: "Control",
      phase_hi: "पूर्ण नियंत्रण",
      detected: true,
      explanation: "Ordered to stay on video camera surveillance continuously during the transaction.",
      explanation_hi: "लेन-देन के दौरान लगातार वीडियो कैमरा निगरानी में रहने का आदेश दिया गया।"
    }
  ],
  evidence: [
    {
      text: "This is the Cyber Crime Branch. You are under virtual arrest. Do not disconnect the line.",
      text_hi: "यह साइबर क्राइम ब्रांच है। आप वर्चुअल अरेस्ट के तहत हैं। लाइन मत काटिएगा।",
      reason: "Government Impersonation & Coercion",
      reason_hi: "सरकारी प्रतिरूपण और दबाव",
      severity: "high"
    },
    {
      text: "You are prohibited from contacting your family members or anyone else until verification completes.",
      text_hi: "सत्यापन पूरा होने तक आपको अपने परिवार के सदस्यों या किसी अन्य से संपर्क करने की मनाही है।",
      reason: "Forced Isolation Tactic",
      reason_hi: "जबरन अलगाव रणनीति",
      severity: "medium"
    },
    {
      text: "Transfer the money immediately. If you fail to do so, we will send a team to arrest you within 30 minutes.",
      text_hi: "पैसे तुरंत ट्रांसफर करें। यदि आप ऐसा करने में विफल रहते हैं, तो हम आपको 30 मिनट के भीतर गिरफ्तार करने के लिए टीम भेजेंगे।",
      reason: "Urgent Payment Demand & Threat",
      reason_hi: "तत्काल भुगतान की मांग और धमकी",
      severity: "high"
    }
  ],
  recommendations: [
    "Disconnect the video or audio call immediately.",
    "Do NOT transfer any money or share any bank details.",
    "Report the suspicious numbers to cybercrime.gov.in or call Helpline 1930.",
    "Share details of this interaction with a trusted relative."
  ],
  recommendations_hi: [
    "वीडियो या ऑडियो कॉल तुरंत काट दें।",
    "कोई पैसा ट्रांसफर न करें या बैंक विवरण साझा न करें।",
    "cybercrime.gov.in पर संदिग्ध नंबरों की रिपोर्ट करें या हेल्पलाइन 1930 पर कॉल करें।",
    "इस बातचीत के विवरण को एक भरोसेमंद रिश्तेदार के साथ साझा करें।"
  ],
  complaintDraft: `To,
The Cyber Crime Portal / Officer in Charge,
Cyber Crime Investigation Unit,

Subject: Complaint regarding attempt of financial fraud and coercive impersonation (Digital Arrest)

Respected Sir/Madam,

I am writing to report a fraudulent incident that occurred on 19th July 2026. I received a communication from suspicious entities claiming to represent the Cyber Crime Cell and CBI. 

The callers claimed that a consignment containing illegal narcotics was seized in my name, and my bank accounts were linked to a money laundering syndicate. To pressure me, they placed me under a mock "Virtual Arrest" via a video call and prohibited me from speaking with my family or seeking counsel.

They subsequently demanded an immediate money transfer of ₹85,000 for "verification purposes," asserting the amount would be returned post-clearance. 

No funds were transferred, but I felt deeply coerced and isolated. I request you to investigate the associated phone numbers and digital profiles to prevent further scams.

Sincerely,
[Your Name]
Phone: [Your Phone Number]
Address: [Your Address]`,
  complaintDraft_hi: `सेवा में,
प्रभारी अधिकारी,
साइबर अपराध जांच सेल,

विषय: जबरन वसूली, धोखाधड़ी के प्रयास और प्रतिरूपण (डिजिटल अरेस्ट) के संबंध में शिकायत

महोदय/महोदया,

मैं दिनांक 19 जुलाई 2026 को मेरे साथ हुई धोखाधड़ी के प्रयास की घटना की रिपोर्ट करने के लिए लिख रहा हूँ। मुझे कुछ संदिग्ध नंबरों से कॉल आया जिन्होंने खुद को साइबर क्राइम सेल और सीबीआई का प्रतिनिधि बताया।

कॉल करने वालों ने दावा किया कि मेरे नाम से अवैध मादक पदार्थों का एक पार्सल जब्त किया गया है और मेरे बैंक खाते मनी लॉन्ड्रिंग सिंडिकेट से जुड़े हैं। मुझ पर दबाव बनाने के लिए, उन्होंने वीडियो कॉल के माध्यम से मुझे "वर्चुअल अरेस्ट" में रखा और परिवार से बात करने से मना कर दिया।

इसके बाद उन्होंने "सत्यापन उद्देश्यों" के लिए ₹85,000 के तत्काल ट्रांसफर की मांग की, और दावा किया कि निकासी के बाद राशि वापस कर दी जाएगी।

यद्यपि कोई पैसा ट्रांसफर नहीं किया गया, फिर भी मैंने मानसिक दबाव महसूस किया। मेरा आपसे अनुरोध है कि भविष्य में धोखाधड़ी को रोकने के लिए संबंधित फोन नंबरों और डिजिटल प्रोफाइलों की जांच करें।

भवदीय,
[आपका नाम]
फ़ोन: [आपका फ़ोन नंबर]
पता: [आपका पता]`,
  whyExplanation: [
    "Government impersonation (CBI / Cyber Crime) was detected.",
    "Severe threat language and virtual arrest terminology were identified.",
    "Immediate, high-pressure payment demand was detected.",
    "Tactics to isolate the user from seeking family support were actively utilized."
  ],
  whyExplanation_hi: [
    "सरकारी प्रतिरूपण (सीबीआई / साइबर क्राइम) का पता चला था।",
    "गंभीर धमकी की भाषा और वर्चुअल गिरफ्तारी की शब्दावली की पहचान की गई थी।",
    "तत्काल, उच्च दबाव वाले भुगतान की मांग का पता चला था।",
    "उपयोगकर्ता को परिवार से बात करने से रोकने की रणनीति का उपयोग किया गया था।"
  ]
};

export const mockResponseSuspicious: AnalysisResponse = {
  risk: "suspicious",
  score: 64,
  confidence: 0.76,
  timeline: [
    {
      phase: "Authority",
      phase_hi: "प्राधिकरण का दिखावा",
      detected: true,
      explanation: "Caller referenced official bank audits and custom enforcement policies.",
      explanation_hi: "कॉलर ने आधिकारिक बैंक ऑडिट और सीमा शुल्क प्रवर्तन नीतियों का उल्लेख किया।"
    },
    {
      phase: "Fear",
      phase_hi: "भय और धमकी",
      detected: true,
      explanation: "Warned of credit rating blockages and potential tax evasion charges.",
      explanation_hi: "क्रेडिट रेटिंग ब्लॉक होने और संभावित कर चोरी के आरोपों की चेतावनी दी।"
    },
    {
      phase: "Isolation",
      phase_hi: "अलगाव (Isolation)",
      detected: false,
      explanation: "No strict orders of digital isolation detected, but secrecy was encouraged.",
      explanation_hi: "जबरन अलगाव के संकेत नहीं मिले, लेकिन गोपनीयता बनाए रखने की सलाह दी गई।"
    },
    {
      phase: "Money",
      phase_hi: "पैसे की मांग",
      detected: false,
      explanation: "No direct immediate payment requested, but inquired about current bank balance.",
      explanation_hi: "सीधे भुगतान की मांग नहीं की गई, लेकिन बैंक बैलेंस के बारे में पूछताछ की।"
    },
    {
      phase: "Control",
      phase_hi: "पूर्ण नियंत्रण",
      detected: false,
      explanation: "No camera surveillance command was identified.",
      explanation_hi: "कैमरा सर्विलांस कमांड की पहचान नहीं की गई।"
    }
  ],
  evidence: [
    {
      text: "This is a security alert regarding suspicious offshore activity linked to your savings account.",
      text_hi: "यह आपके बचत खाते से जुड़ी संदिग्ध विदेशी गतिविधियों के संबंध में एक सुरक्षा चेतावनी है।",
      reason: "Suspicious Agency Impersonation",
      reason_hi: "संदिग्ध एजेंसी प्रतिरूपण",
      severity: "medium"
    },
    {
      text: "You must keep this audit confidential during the compliance phase to avoid penal fines.",
      text_hi: "जुर्माने से बचने के लिए अनुपालन चरण के दौरान आपको इस ऑडिट को गोपनीय रखना होगा।",
      reason: "Confidentiality Coercion",
      reason_hi: "गोपनीयता के लिए दबाव",
      severity: "medium"
    }
  ],
  recommendations: [
    "Do not provide official banking credentials or credit information.",
    "Contact your bank directly using their official helpline, not the numbers provided by the caller.",
    "Submit the suspicious number to the national fraud registry."
  ],
  recommendations_hi: [
    "आधिकारिक बैंकिंग क्रेडेंशियल या क्रेडिट जानकारी साझा न करें।",
    "अपने बैंक से उनकी आधिकारिक हेल्पलाइन के ज़रिए संपर्क करें, न कि कॉलर द्वारा दिए गए नंबरों से।",
    "राष्ट्रीय धोखाधड़ी रजिस्ट्री में संदिग्ध नंबर दर्ज करें।"
  ],
  complaintDraft: `To,
The Cyber Crime Portal / Officer in Charge,
Cyber Crime Investigation Unit,

Subject: Complaint regarding suspicious communication and identity gathering attempt

Respected Sir/Madam,

I am writing to report a suspicious audit-related communication that took place on 19th July 2026. An unknown individual calling from suspicious lines represented themselves as an auditor linked to government compliance cells. 

They warned of credit restrictions and demanded account compliance audits, claiming confidentiality was critical to avoid legal fines. While they did not request direct fund transfers, their requests for specific account holdings and verification parameters seemed highly indicative of phishing and pre-scam scouting.

I request that this phone number be flagged in official registries.

Sincerely,
[Your Name]
Phone: [Your Phone Number]`,
  complaintDraft_hi: `सेवा में,
प्रभारी अधिकारी,
साइबर अपराध जांच सेल,

विषय: संदिग्ध संचार और व्यक्तिगत पहचान हासिल करने के प्रयास के संबंध में शिकायत

महोदय/महोदया,

मैं दिनांक 19 जुलाई 2026 को हुई एक संदिग्ध ऑडिट-संबंधी बातचीत की रिपोर्ट करने के लिए लिख रहा हूँ। एक अज्ञात व्यक्ति ने खुद को सरकारी अनुपालन सेल से जुड़ा हुआ ऑडिटर बताया।

उन्होंने क्रेडिट प्रतिबंधों की चेतावनी दी और गोपनीयता बनाए रखने को कहा ताकि कानूनी जुर्माने से बचा जा सके। हालांकि उन्होंने पैसे सीधे ट्रांसफर करने के लिए नहीं कहा, फिर भी खाते की विशिष्ट होल्डिंग्स और सत्यापन मापदंडों की मांग करना फ़िशिंग का संकेत देता है।

मेरा अनुरोध है कि इस नंबर को संदिग्ध के रूप में चिह्नित किया जाए।

भवदीय,
[आपका नाम]
फ़ोन: [आपका फ़ोन नंबर]`,
  whyExplanation: [
    "Unverified agency representation was flagged.",
    "Direct pressure to keep audit procedures confidential.",
    "Targeted inquiry into current bank accounts and assets."
  ],
  whyExplanation_hi: [
    "असत्यापित एजेंसी के प्रतिनिधित्व को चिह्नित किया गया था।",
    "ऑडिट प्रक्रियाओं को गोपनीय रखने के लिए सीधा दबाव डाला गया।",
    "बचत खातों और संपत्तियों के संबंध में संदिग्ध पूछताछ की गई।"
  ]
};

export const mockResponseSafe: AnalysisResponse = {
  risk: "safe",
  score: 12,
  confidence: 0.94,
  timeline: [
    {
      phase: "Authority",
      phase_hi: "प्राधिकरण का दिखावा",
      detected: false,
      explanation: "No government impersonation patterns detected.",
      explanation_hi: "किसी सरकारी प्रतिरूपण पैटर्न का पता नहीं चला।"
    },
    {
      phase: "Fear",
      phase_hi: "भय और धमकी",
      detected: false,
      explanation: "No threat language or arrest coercion detected.",
      explanation_hi: "धमकी की भाषा या गिरफ्तारी के दबाव का पता नहीं चला।"
    },
    {
      phase: "Isolation",
      phase_hi: "अलगाव (Isolation)",
      detected: false,
      explanation: "No digital isolation or call retention orders.",
      explanation_hi: "डिजिटल अलगाव या कॉल रोके रखने के आदेश नहीं पाए गए।"
    },
    {
      phase: "Money",
      phase_hi: "पैसे की मांग",
      detected: false,
      explanation: "No suspicious financial demands detected.",
      explanation_hi: "किसी संदिग्ध वित्तीय मांग का पता नहीं चला।"
    },
    {
      phase: "Control",
      phase_hi: "पूर्ण नियंत्रण",
      detected: false,
      explanation: "No video call enforcement patterns identified.",
      explanation_hi: "वीडियो कॉल लागू करने का कोई पैटर्न नहीं पाया गया।"
    }
  ],
  evidence: [],
  recommendations: [
    "No immediate security threats were detected in the provided text.",
    "Always remain cautious when sharing sensitive details over calls."
  ],
  recommendations_hi: [
    "प्रदान किए गए पाठ में कोई तत्काल सुरक्षा खतरा नहीं पाया गया।",
    "कॉल पर संवेदनशील विवरण साझा करते समय हमेशा सतर्क रहें।"
  ],
  complaintDraft: "No complaint needed. The interaction is safe.",
  complaintDraft_hi: "शिकायत की आवश्यकता नहीं है। बातचीत सुरक्षित है।",
  whyExplanation: [
    "No coercion markers or threats were found.",
    "No illegal impersonation claims detected."
  ],
  whyExplanation_hi: [
    "कोई धमकी या जबरदस्ती के संकेत नहीं मिले।",
    "कोई अवैध प्रतिरूपण के दावों का पता नहीं चला।"
  ]
};

/**
 * Simulates analyzing an input text/file and returns an AnalysisResponse based on content.
 */
export const getAnalysisResult = (text: string, fileName?: string): Promise<AnalysisResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerText = (text + (fileName || "")).toLowerCase();
      
      // Keywords for Critical digital arrest scam
      if (
        lowerText.includes("cbi") ||
        lowerText.includes("arrest") ||
        lowerText.includes("police") ||
        lowerText.includes("narco") ||
        lowerText.includes("customs") ||
        lowerText.includes("cyber crime") ||
        lowerText.includes("money laundering") ||
        lowerText.includes("drugs") ||
        lowerText.includes("dcp") ||
        lowerText.includes("1930") ||
        lowerText.includes("jail") ||
        lowerText.includes("court")
      ) {
        resolve(mockResponseCritical);
      } 
      // Keywords for Suspicious
      else if (
        lowerText.includes("bank") ||
        lowerText.includes("audit") ||
        lowerText.includes("verify") ||
        lowerText.includes("card") ||
        lowerText.includes("otp") ||
        lowerText.includes("password") ||
        lowerText.includes("urgent") ||
        lowerText.includes("block") ||
        lowerText.includes("link")
      ) {
        resolve(mockResponseSuspicious);
      } 
      // Default to Safe
      else {
        resolve(mockResponseSafe);
      }
    }, 2000); // 2-second realistic analysis delay
  });
};
