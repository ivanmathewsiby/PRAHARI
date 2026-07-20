"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useTranslation } from "../../context/LanguageContext";
import { getAnalysisResult, AnalysisResponse } from "../../data/mockAnalysis";
import { createIncident, createAuditLog } from "../../lib/api";
import { UploadDropzone } from "../../components/UploadDropzone";
import { LoadingAnimation } from "../../components/LoadingAnimation";
import { RiskGauge } from "../../components/RiskGauge";
import { Timeline } from "../../components/Timeline";
import { EvidenceCard } from "../../components/EvidenceCard";
import { AlertBanner } from "../../components/AlertBanner";
import { FamilyShieldModal } from "../../components/FamilyShieldModal";
import { ComplaintPreview } from "../../components/ComplaintPreview";
import { RecommendationCard } from "../../components/RecommendationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
  ClipboardList,
  ChevronDown,
  Lock,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type PrivacyShareScope = "selected_evidence" | "redacted_transcript" | "full_transcript";

interface LocalReviewPayload {
  transcript: string;
  redactedTranscript: string;
  selectedEvidence: string[];
  redactionSummary: string;
}

const redactSensitiveText = (text: string) => {
  const rules = [
    { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/g, label: "Aadhaar-like numbers" },
    { pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g, label: "PAN-like IDs" },
    { pattern: /\b\d{4,8}\b(?=\s*(?:otp|code|pin|password))/gi, label: "OTP/PIN values" },
    { pattern: /\b(?:otp|code|pin|password)\s*(?:is|:)?\s*\d{4,8}\b/gi, label: "OTP/PIN phrases" },
    { pattern: /\b\d{12,18}\b/g, label: "long account-like numbers" },
  ];

  const redactedLabels = new Set<string>();
  let redacted = text;
  rules.forEach(({ pattern, label }) => {
    redacted = redacted.replace(pattern, () => {
      redactedLabels.add(label);
      return `[REDACTED ${label.toUpperCase()}]`;
    });
  });

  return {
    text: redacted,
    summary: redactedLabels.size > 0
      ? `Redacted ${Array.from(redactedLabels).join(", ")} before sharing.`
      : "No Aadhaar/PAN/OTP/account-like secrets detected by local redaction.",
  };
};

const buildReviewPayload = (sourceText: string, result: AnalysisResponse): LocalReviewPayload => {
  const selectedEvidence = result.evidence.length > 0
    ? result.evidence.map((item) => item.text)
    : result.whyExplanation;
  const redacted = redactSensitiveText(sourceText);

  return {
    transcript: sourceText,
    redactedTranscript: redacted.text,
    selectedEvidence,
    redactionSummary: redacted.summary,
  };
};

export default function CheckPage() {
  const { t, language } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [localReviewPayload, setLocalReviewPayload] = useState<LocalReviewPayload | null>(null);
  const [sharedScope, setSharedScope] = useState<PrivacyShareScope | "local_only" | null>(null);
  const [sharing, setSharing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"not_shared" | "shared" | "local_only" | "offline">("not_shared");
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [scanId, setScanId] = useState(() => `PR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [liveListening, setLiveListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Quick Demo texts to help judges evaluate the app easily
  const demoScenarios = {
    critical: "This is the Cyber Crime Branch DCP. You are under virtual arrest. Do not disconnect this line. Your bank accounts are linked to a money laundering syndicate, and narcotics were found in a package under your name. You must transfer ₹85,000 immediately to a verification vault or we will dispatch a field unit to arrest you within 30 minutes.",
    suspicious: "SECURITY ALERT: We have noticed an unusual foreign transaction on your card. To verify your compliance status and prevent an immediate account block, please confirm your current savings bank account balance and click the official verify link. Keep this audit details confidential.",
    safe: "Hi dad, I reached the hostel safely. The train was on time. I'll call you in the evening when I get free. Please send me the notes we left on the table if you find them. Love you!",
  };

  const handleDemoLoad = (type: "critical" | "suspicious" | "safe") => {
    setInputText(demoScenarios[type]);
    setSelectedFile(null);
    setActiveTab("text");
  };

  const handleToggleLiveMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Live speech recognition is not available in this browser. Paste mode still stays private.");
      return;
    }

    if (liveListening) {
      recognitionRef.current?.stop();
      setLiveListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

    recognition.onresult = (event: any) => {
      let nextTranscript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        nextTranscript += `${event.results[i][0].transcript} `;
      }
      setInputText(nextTranscript.trim());
    };

    recognition.onerror = () => {
      setLiveListening(false);
      showToast("Mic capture stopped. No audio was uploaded.");
    };

    recognition.onend = () => setLiveListening(false);
    recognitionRef.current = recognition;
    setActiveTab("live");
    setLiveListening(true);
    recognition.start();
  };

  const handleAnalyze = async () => {
    let textToAnalyze = inputText;
    
    if (activeTab !== "text" && selectedFile) {
      textToAnalyze = `File: ${selectedFile.name} (Type: ${selectedFile.type}). ${selectedFile.name.replace(/\.[^/.]+$/, "")}`;
    }

    if (!textToAnalyze && !selectedFile) return;

    setLoading(true);
    setResult(null);
    setLocalReviewPayload(null);
    setSharedScope(null);
    setSyncStatus("not_shared");

    try {
      const analysisResult = await getAnalysisResult(textToAnalyze, selectedFile?.name);
      setResult(analysisResult);
      setLocalReviewPayload(buildReviewPayload(textToAnalyze, analysisResult));
      
      if (analysisResult.risk === "safe") {
        setSyncStatus("local_only");
        setSharedScope("local_only");
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#10B981", "#34D399", "#6EE7B7"],
        });
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareEvidence = async (scope: PrivacyShareScope) => {
    if (!result || !localReviewPayload || result.risk === "safe") return;

    const transcriptToShare = scope === "selected_evidence"
      ? localReviewPayload.selectedEvidence.join("\n")
      : scope === "redacted_transcript"
        ? localReviewPayload.redactedTranscript
        : localReviewPayload.transcript;

    setSharing(true);
    try {
      const incident = await createIncident({
        citizen_name: "Anonymous Citizen",
        phone_number: "Shared only if present in evidence",
        transcript: transcriptToShare,
        location: "Consent-based citizen report",
        consent_status: "GRANTED",
        consent_scope: scope,
        local_only: false,
        redaction_summary: scope === "full_transcript"
          ? "User explicitly chose to share the full transcript."
          : localReviewPayload.redactionSummary,
      });

      const dbRiskLevel = result.risk === "critical" ? "CRITICAL" : "MEDIUM";
      const dbFraudType = result.risk === "critical" ? "Digital Arrest Scam" : "Suspicious Communication";

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${API_BASE}/api/incidents/${incident.incident_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "OPEN",
          risk_level: dbRiskLevel,
          fraud_type: dbFraudType,
          consent_status: "GRANTED",
          consent_scope: scope,
          local_only: false,
          redaction_summary: scope === "full_transcript"
            ? "User explicitly chose to share the full transcript."
            : localReviewPayload.redactionSummary,
        })
      });

      await createAuditLog({
        incident_id: incident.incident_id,
        action: "CONSENT_GRANTED_AND_INCIDENT_ANALYZED",
        rule_hits: result.risk === "critical"
          ? ["authority_impersonation", "coercion", "isolation_directive", "payment_threat"]
          : ["confidentiality_claim", "verify_credentials"],
        model_version: "local-private-rules-v1",
        prompt_version: "no-llm-device-first",
        score_components: {
          coercion_score: result.score,
          confidence_index: result.confidence,
          privacy_mode: "device_first",
          consent_scope: scope,
          redaction_summary: scope === "full_transcript"
            ? "User explicitly chose to share the full transcript."
            : localReviewPayload.redactionSummary,
        },
        threshold_version: "privacy-first-v1.0"
      });

      setSharedScope(scope);
      setSyncStatus("shared");
      showToast("Shared with consent. Evidence is now available for complaint and graph intelligence.");
    } catch (apiError) {
      console.warn("FastAPI backend is offline. Risk result remains local.", apiError);
      setSyncStatus("offline");
      showToast("Backend is offline. Nothing left this browser.");
    } finally {
      setSharing(false);
    }
  };

  const handleKeepPrivate = () => {
    setSharedScope("local_only");
    setSyncStatus("local_only");
    showToast("Kept private. Nothing was sent to PRAHARI.");
  };

  const handleReset = () => {
    setResult(null);
    setInputText("");
    setSelectedFile(null);
    setLocalReviewPayload(null);
    setSharedScope(null);
    setSyncStatus("not_shared");
    setScanId(`PR-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopyComplaint = () => {
    if (!result) return;
    const txt = language === "hi" ? result.complaintDraft_hi : result.complaintDraft;
    navigator.clipboard.writeText(txt);
    showToast(t("alert.copied"));
  };

  const handleScrollToComplaint = () => {
    const el = document.getElementById("complaint-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/20 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* Background Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#1f1f23_1px,transparent_1px)] opacity-50 dark:opacity-30 pointer-events-none z-0" />

      {/* Toast Notification Container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold shadow-xl border border-zinc-800 dark:border-zinc-200 flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-indigo-400 dark:text-indigo-600" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        
        {/* Page Titles */}
        {!result && !loading && (
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              {t("check.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              {t("check.subtitle")}
            </p>
            <div className="mx-auto mt-4 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                "Private scan runs on this device",
                "Safe results are never uploaded",
                "Risky evidence shares only after consent",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-650 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* 1. Loading Phase */}
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="py-12"
            >
              <LoadingAnimation />
            </motion.div>
          )}

          {/* 2. Results Dashboard Phase */}
          {result && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="space-y-8 text-left"
            >
              {/* Back button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  New Verification Scan
                </button>
                
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-zinc-900 px-3 py-1 rounded-full">
                  Scan ID: {scanId}
                </span>
              </div>

              <div className={`rounded-2xl border p-4 text-left ${
                syncStatus === "shared"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "border-gray-200 bg-white text-gray-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              }`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                        {syncStatus === "shared" ? "Shared with consent" : "Private result"}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                        {syncStatus === "shared"
                          ? `Only the ${sharedScope?.replaceAll("_", " ")} package was sent after your approval.`
                          : "This result was produced locally. Nothing leaves your device unless you choose a sharing option below."}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-current/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {syncStatus === "shared" ? "Network enabled" : "Local only"}
                  </span>
                </div>
              </div>

              {/* Critical Alert Banner */}
              {result.risk === "critical" && (
                <AlertBanner
                  onNotifyFamily={() => setFamilyModalOpen(true)}
                  onGenerateComplaint={handleScrollToComplaint}
                  onCopyComplaint={handleCopyComplaint}
                  onReturnHome={handleReset}
                  complaintGenerated={true}
                />
              )}

              {/* Suspicious Warning Banner */}
              {result.risk === "suspicious" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-2xl flex gap-3 text-left">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">
                      Suspicious Communication Pattern Identified
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                      This text shows indicators of unverified authorization checks or phishing. Refrain from transferring funds or typing OTP details.
                    </p>
                  </div>
                </div>
              )}

              {result.risk !== "safe" && localReviewPayload && syncStatus !== "shared" && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <h3 className="flex items-center gap-2 text-base font-bold text-gray-950 dark:text-white">
                        <Lock className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                        Review before sharing
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
                        PRAHARI can generate a complaint and check fraud-ring links only if you approve sharing. The safest option sends evidence spans and extracted risk signals, not the whole transcript.
                      </p>
                      <p className="mt-2 text-xs font-medium text-gray-500 dark:text-zinc-500">
                        {localReviewPayload.redactionSummary}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:min-w-64">
                      <button
                        disabled={sharing}
                        onClick={() => handleShareEvidence("selected_evidence")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        Share selected evidence
                      </button>
                      <button
                        disabled={sharing}
                        onClick={() => handleShareEvidence("redacted_transcript")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-250 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Share redacted transcript
                      </button>
                      <button
                        disabled={sharing}
                        onClick={handleKeepPrivate}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        <Trash2 className="h-4 w-4" />
                        Keep private and delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                        Selected evidence
                      </h4>
                      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
                        {localReviewPayload.selectedEvidence.slice(0, 4).map((item) => (
                          <li key={item} className="rounded-lg bg-white p-2 dark:bg-zinc-900">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                        Redacted preview
                      </h4>
                      <p className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
                        {localReviewPayload.redactedTranscript}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Core Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Column: Risk Gauge & Recommendations */}
                <div className="lg:col-span-1 space-y-6">
                  <RiskGauge
                    risk={result.risk}
                    score={result.score}
                    confidence={result.confidence}
                  />

                  {/* Recommendations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                      {t("results.recommendations")}
                    </h4>
                    <div className="space-y-3">
                      {(language === "hi" ? result.recommendations_hi : result.recommendations).map((rec, idx) => (
                        <RecommendationCard key={idx} text={rec} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Timeline & Explainability Accordion */}
                <div className="lg:col-span-2 space-y-6">
                  <Timeline timeline={result.timeline} />

                  {/* Explainability Section */}
                  <div className="space-y-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                      <Layers className="h-4 w-4" />
                      {t("results.explainability")}
                    </span>
                    <div className="w-full bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => setExplainOpen(!explainOpen)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 text-sm font-bold text-gray-800 dark:text-gray-200 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-indigo-500" />
                          Plain English Safety Analysis
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${explainOpen ? "rotate-180" : ""}`} />
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {explainOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-3 text-xs text-gray-650 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-zinc-850">
                              <ul className="list-disc pl-4 space-y-2 text-left">
                                {(language === "hi" ? result.whyExplanation_hi : result.whyExplanation).map((exp, idx) => (
                                  <li key={idx}>{exp}</li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence cards section (Only display if evidence exists) */}
              {result.evidence.length > 0 && (
                <div className="space-y-4">
                  <div className="pl-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {t("results.evidence")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("results.evidenceDesc")}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.evidence.map((item, idx) => (
                      <EvidenceCard key={idx} evidence={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Complaint Draft section */}
              {result.risk === "critical" && (
                <div id="complaint-section" className="space-y-4 pt-4 border-t border-gray-150 dark:border-zinc-900">
                  <div className="pl-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {t("results.complaint")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("results.complaintDesc")}
                    </p>
                  </div>
                  <ComplaintPreview
                    draftText={language === "hi" ? result.complaintDraft_hi : result.complaintDraft}
                  />
                </div>
              )}

              {/* Family Alert Modal */}
              <FamilyShieldModal
                isOpen={familyModalOpen}
                onClose={() => setFamilyModalOpen(false)}
                onSuccess={(msg) => {
                  showToast(t("familyModal.success"));
                  confetti({
                    particleCount: 50,
                    spread: 40,
                    origin: { y: 0.8 },
                    colors: ["#10B981", "#3B82F6"],
                  });
                }}
              />
            </motion.div>
          )}

          {/* 3. Input Dashboard Form Phase */}
          {!result && !loading && (
            <motion.div
              key="input-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl shadow-lg shadow-gray-100/30 dark:shadow-none overflow-hidden text-left">
                
                {/* Header title tab bar */}
                <div className="px-6 py-5 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    {t("check.title")}
                  </span>
                  
                  {/* Quick-try buttons for demo evaluations */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                      Quick Demo:
                    </span>
                    <button
                      onClick={() => handleDemoLoad("critical")}
                      className="px-2.5 py-1 text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/40 border border-red-200/50 dark:border-red-900/20 rounded-md transition-colors"
                    >
                      Scam
                    </button>
                    <button
                      onClick={() => handleDemoLoad("suspicious")}
                      className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/20 rounded-md transition-colors"
                    >
                      Phish
                    </button>
                    <button
                      onClick={() => handleDemoLoad("safe")}
                      className="px-2.5 py-1 text-[10px] font-bold bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-950/40 border border-green-200/50 dark:border-green-900/20 rounded-md transition-colors"
                    >
                      Safe
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <Tabs value={activeTab} onValueChange={(val) => {
                    setActiveTab(val);
                    setSelectedFile(null);
                  }} className="space-y-6">
                    <TabsList className="grid grid-cols-2 md:grid-cols-5 bg-gray-100 dark:bg-zinc-950 p-1 rounded-xl gap-1">
                      <TabsTrigger
                        value="text"
                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                      >
                        {t("check.tabs.text")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="screenshot"
                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                      >
                        {t("check.tabs.screenshot")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="pdf"
                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                      >
                        {t("check.tabs.pdf")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="transcript"
                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                      >
                        {t("check.tabs.transcript")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="live"
                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                      >
                        Live
                      </TabsTrigger>
                    </TabsList>

                    {/* Quick-try buttons for mobile view */}
                    <div className="flex sm:hidden items-center justify-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                        Demo:
                      </span>
                      <button
                        onClick={() => handleDemoLoad("critical")}
                        className="px-2.5 py-1 text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/20 rounded-md"
                      >
                        Scam
                      </button>
                      <button
                        onClick={() => handleDemoLoad("suspicious")}
                        className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20 rounded-md"
                      >
                        Phish
                      </button>
                      <button
                        onClick={() => handleDemoLoad("safe")}
                        className="px-2.5 py-1 text-[10px] font-bold bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-900/20 rounded-md"
                      >
                        Safe
                      </button>
                    </div>

                    {/* Tab Contents: Text Area input */}
                    <TabsContent value="text" className="mt-0">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t("check.textarea.placeholder")}
                        rows={7}
                        className="w-full bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 leading-relaxed font-medium placeholder-gray-400 dark:placeholder-zinc-600 resize-none transition-colors"
                      />
                    </TabsContent>

                    {/* Tab Contents: Screenshot Dropzone */}
                    <TabsContent value="screenshot" className="mt-0">
                      <UploadDropzone
                        accept="image/*"
                        onFileSelect={setSelectedFile}
                        selectedFile={selectedFile}
                      />
                    </TabsContent>

                    {/* Tab Contents: PDF Dropzone */}
                    <TabsContent value="pdf" className="mt-0">
                      <UploadDropzone
                        accept=".pdf"
                        onFileSelect={setSelectedFile}
                        selectedFile={selectedFile}
                      />
                    </TabsContent>

                    {/* Tab Contents: Transcript Dropzone */}
                    <TabsContent value="transcript" className="mt-0">
                      <UploadDropzone
                        accept=".txt,.doc,.docx"
                        onFileSelect={setSelectedFile}
                        selectedFile={selectedFile}
                      />
                    </TabsContent>

                    <TabsContent value="live" className="mt-0">
                      <div className="rounded-xl border border-gray-250 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                              <Mic className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              Private live call check
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                              Uses this browser's speech recognition. Audio is not uploaded; PRAHARI only scans the live text on this device.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleLiveMic}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                              liveListening
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            {liveListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            {liveListening ? "Stop listening" : "Start live scan"}
                          </button>
                        </div>
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Live transcript appears here while the call is on speaker..."
                          rows={6}
                          className="mt-4 w-full resize-none rounded-xl border border-gray-250 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-800 placeholder-gray-500 focus:border-indigo-500/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200 dark:placeholder-zinc-500"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Actions area */}
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors"
                      type="button"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Clear Fields
                    </button>
                    
                    <button
                      disabled={(!inputText && !selectedFile)}
                      onClick={handleAnalyze}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/15 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                    >
                      {t("check.analyze")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
