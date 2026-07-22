"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useTranslation } from "../../context/LanguageContext";
import type { AnalysisResponse } from "../../data/mockAnalysis";
import { analyzeConsentedEvidence, deleteIncident } from "../../lib/api";
import { analyzeLocally } from "../../lib/mitLocalAnalysis";
import { UploadDropzone } from "../../components/UploadDropzone";
import { LoadingAnimation } from "../../components/LoadingAnimation";
import { RiskGauge } from "../../components/RiskGauge";
import { Timeline } from "../../components/Timeline";
import { EvidenceCard } from "../../components/EvidenceCard";
import { AlertBanner } from "../../components/AlertBanner";
import { FamilyShieldModal } from "../../components/FamilyShieldModal";
import { ComplaintPreview } from "../../components/ComplaintPreview";
import { RecommendationCard } from "../../components/RecommendationCard";
import { LocalWhisperCapture, type SpeechPrivacyStatus } from "../../components/LocalWhisperCapture";
import { ConsentReceipt, PrivacyProofBar, type ConsentReceiptData } from "../../components/PrivacyProof";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
  ChevronDown,
  FileUp,
  Lock,
  MessageSquareText,
  Mic,
  PlayCircle,
  Send,
  ShieldCheck,
  SearchCheck,
  Trash2,
} from "lucide-react";

type PrivacyShareScope = "selected_evidence" | "redacted_transcript" | "full_transcript";

interface LocalReviewPayload {
  transcript: string;
  redactedTranscript: string;
  selectedEvidence: string[];
  redactionSummary: string;
}

const LIVE_PHASES = [
  { key: "Hook", label: "Scam story" },
  { key: "Authority", label: "Fake authority" },
  { key: "Fabricated Evidence", label: "Fake proof" },
  { key: "Isolation", label: "Isolation" },
  { key: "Drain", label: "Payment" },
];

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
  const [activeTab, setActiveTab] = useState("live");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [localReviewPayload, setLocalReviewPayload] = useState<LocalReviewPayload | null>(null);
  const [sharedScope, setSharedScope] = useState<PrivacyShareScope | "local_only" | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sharedRingId, setSharedRingId] = useState<string | null>(null);
  const [sharedIncidentId, setSharedIncidentId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"not_shared" | "shared" | "local_only" | "offline">("not_shared");
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [scanId, setScanId] = useState(() => `PR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [evidenceBytes, setEvidenceBytes] = useState(0);
  const [retentionDays, setRetentionDays] = useState<1 | 7 | 30>(7);
  const [consentReceipt, setConsentReceipt] = useState<ConsentReceiptData | null>(null);
  const [whisperPrivacy, setWhisperPrivacy] = useState<SpeechPrivacyStatus>({
    modelState: "Browser speech recognition (English)",
    audioStored: false,
    analysisLocation: "Browser service",
    speechMayLeaveDevice: true,
    captureState: "ready",
  });
  const [liveResult, setLiveResult] = useState<AnalysisResponse | null>(null);
  const [liveChecking, setLiveChecking] = useState(false);
  const [liveDemoRunning, setLiveDemoRunning] = useState(false);
  const liveAnalysisVersionRef = useRef(0);
  const liveDemoTimersRef = useRef<number[]>([]);

  // Quick Demo texts to help judges evaluate the app easily
  const demoScenarios = {
    critical: "This is CBI officer Sharma. A narcotics parcel was booked under your Aadhaar at Mumbai customs. You are under digital arrest. Do not tell your family and do not disconnect. Transfer Rs.85,000 to cbi.verify@upi immediately or we will arrest you within 30 minutes.",
    suspicious: "SECURITY ALERT: We have noticed an unusual foreign transaction on your card. To verify your compliance status and prevent an immediate account block, please confirm your current savings bank account balance and click the official verify link. Keep this audit details confidential.",
    safe: "Hi dad, I reached the hostel safely. The train was on time. I'll call you in the evening when I get free. Please send me the notes we left on the table if you find them. Love you!",
  };

  useEffect(() => {
    if (activeTab !== "live" || result || inputText.trim().length < 8) return;

    const version = ++liveAnalysisVersionRef.current;
    const timeout = window.setTimeout(async () => {
      setLiveChecking(true);
      const text = inputText.trim();
      const analysis = await analyzeLocally(text);
      if (version !== liveAnalysisVersionRef.current) return;

      setLiveResult(analysis);
      setLiveChecking(false);
      if (analysis.risk === "critical") {
        liveDemoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        liveDemoTimersRef.current = [];
        setLiveDemoRunning(false);
        setResult(analysis);
        setLocalReviewPayload(buildReviewPayload(text, analysis));
        setSyncStatus("not_shared");
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      liveAnalysisVersionRef.current += 1;
    };
  }, [activeTab, inputText, result]);

  useEffect(() => () => {
    liveDemoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const stopLiveDemo = () => {
    liveDemoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    liveDemoTimersRef.current = [];
    setLiveDemoRunning(false);
  };

  const handleRunLiveDemo = () => {
    stopLiveDemo();
    setActiveTab("live");
    setInputText("");
    setLiveResult(null);
    setLiveDemoRunning(true);

    const segments = [
      "This is CBI officer Sharma.",
      "A narcotics parcel was booked using your Aadhaar.",
      "You are under digital arrest and must stay on this call.",
      "Do not tell your family and do not disconnect.",
      "Transfer Rs.85,000 to cbi.verify@upi immediately.",
    ];
    segments.forEach((segment, index) => {
      const timer = window.setTimeout(() => {
        setInputText((current) => [current.trim(), segment].filter(Boolean).join(" "));
        if (index === segments.length - 1) setLiveDemoRunning(false);
      }, index * 1_300);
      liveDemoTimersRef.current.push(timer);
    });
  };

  const handleDemoLoad = (type: "critical" | "suspicious" | "safe") => {
    stopLiveDemo();
    setInputText(demoScenarios[type]);
    setLiveResult(null);
    setSelectedFile(null);
    setActiveTab("text");
  };

  const handleAnalyze = async () => {
    let textToAnalyze = inputText.trim();
    
    if (activeTab !== "text" && selectedFile) {
      const isTextFile = selectedFile.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(selectedFile.name);
      if (!isTextFile) {
        showToast("Private extraction for this file type is not available yet. Use a text file or paste the transcript.");
        return;
      }
      textToAnalyze = (await selectedFile.text()).trim();
    }

    if (!textToAnalyze && !selectedFile) return;

    setLoading(true);
    setLiveResult(null);
    setResult(null);
    setLocalReviewPayload(null);
    setSharedScope(null);
    setSharedRingId(null);
    setSharedIncidentId(null);
    setSyncStatus("not_shared");
    setEvidenceBytes(0);
    setConsentReceipt(null);

    try {
      const analysisResult = await analyzeLocally(textToAnalyze);
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
      const sharedAnalysis = await analyzeConsentedEvidence({
        citizen_name: "Anonymous Citizen",
        transcript: transcriptToShare,
        location: "Consent-based citizen report",
        language: language === "hi" ? "hi-IN" : "en-IN",
        source_channel: "citizen_web",
        consent_status: "GRANTED",
        consent_scope: scope,
        redaction_summary: scope === "full_transcript"
          ? "User explicitly chose to share the full transcript."
          : localReviewPayload.redactionSummary,
        retention_days: retentionDays,
      });

      if (!sharedAnalysis.persisted) {
        setSyncStatus("local_only");
        showToast("The approved excerpt did not contain enough risk evidence to create a report. It remains private.");
        return;
      }

      setSharedScope(scope);
      setSharedRingId(sharedAnalysis.ring_id || null);
      setSharedIncidentId(sharedAnalysis.incident_id || null);
      setSyncStatus("shared");
      const payloadBytes = new Blob([transcriptToShare]).size;
      setEvidenceBytes(payloadBytes);
      const createdAt = new Date();
      setConsentReceipt({
        scanId,
        incidentId: sharedAnalysis.incident_id || "not-persisted",
        consentScope: scope,
        evidenceBytes: payloadBytes,
        redactionSummary: scope === "full_transcript"
          ? "User explicitly chose to share the full transcript."
          : localReviewPayload.redactionSummary,
        createdAt: createdAt.toISOString(),
        expiresAt: sharedAnalysis.expires_at || new Date(createdAt.getTime() + retentionDays * 86_400_000).toISOString(),
        retentionDays: sharedAnalysis.retention_days || retentionDays,
        ringId: sharedAnalysis.ring_id,
      });
      if (sharedAnalysis.ring_id && sharedAnalysis.incident_id) {
        localStorage.setItem("prahari:last-ring-join", JSON.stringify({
          ringId: sharedAnalysis.ring_id,
          incidentId: sharedAnalysis.incident_id,
          joinedAt: new Date().toISOString(),
        }));
      }
      showToast(sharedAnalysis.ring_id
        ? `Shared with consent and linked to ${sharedAnalysis.ring_id}.`
        : "Shared with consent. The report is available for graph intelligence.");
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

  const handleWithdrawConsent = async () => {
    if (!sharedIncidentId) return;
    setSharing(true);
    try {
      await deleteIncident(sharedIncidentId);
      setSharedIncidentId(null);
      setSharedRingId(null);
      setSharedScope("local_only");
      setSyncStatus("local_only");
      setEvidenceBytes(0);
      setConsentReceipt(null);
      showToast("Consent withdrawn. The incident, audit payload, and graph report were deleted.");
    } catch {
      showToast("Deletion could not be confirmed. Please try again while the backend is online.");
    } finally {
      setSharing(false);
    }
  };

  const handleReset = () => {
    stopLiveDemo();
    setResult(null);
    setInputText("");
    setSelectedFile(null);
    setLocalReviewPayload(null);
    setSharedScope(null);
    setSharedRingId(null);
    setSharedIncidentId(null);
    setSyncStatus("not_shared");
    setEvidenceBytes(0);
    setConsentReceipt(null);
    setLiveResult(null);
    setLiveChecking(false);
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

  const handleDownloadEvidencePacket = () => {
    if (!result || !localReviewPayload) return;
    const packet = {
      document_type: "PRAHARI_1930_READY_EVIDENCE_PACKET",
      submission_status: "NOT_SUBMITTED",
      notice: "Citizen aid for review and manual submission through 1930 or cybercrime.gov.in.",
      scan_id: scanId,
      incident_id: sharedIncidentId,
      created_at: new Date().toISOString(),
      risk: { label: result.risk.toUpperCase(), score: result.score, confidence: result.confidence },
      phases: result.timeline.filter((phase) => phase.detected).map((phase) => phase.phase),
      evidence_spans: localReviewPayload.selectedEvidence,
      redaction_summary: localReviewPayload.redactionSummary,
      graph_ring_id: sharedRingId,
      consent_receipt: consentReceipt,
      complaint_draft: language === "hi" ? result.complaintDraft_hi : result.complaintDraft,
      next_actions: ["Call 1930", "Do not transfer money", "Submit through cybercrime.gov.in", "Preserve original messages and payment identifiers"],
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `PRAHARI-1930-packet-${scanId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("1930-ready evidence packet downloaded. It has not been submitted automatically.");
  };

  const handleCheckNcrp = () => {
    const source = inputText || localReviewPayload?.transcript || "";
    const patterns = [
      /\b[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}\b/,
      /(?:\+91[\s-]?)?[6-9]\d{9}\b/,
      /\b\d{9,18}\b/,
    ];
    const identifier = patterns.map((pattern) => source.match(pattern)?.[0]).find(Boolean);

    window.open(
      "https://cybercrime.gov.in/Webform/suspect_search_repository.aspx",
      "_blank",
      "noopener,noreferrer",
    );

    if (!identifier) {
      showToast("NCRP opened. Paste a suspect mobile number, email, account number, URL, or other identifier there.");
      return;
    }

    const copyIdentifier = async () => {
      try {
        await navigator.clipboard.writeText(identifier);
        return true;
      } catch {
        const input = document.createElement("textarea");
        input.value = identifier;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        return copied;
      }
    };

    void copyIdentifier().then((copied) => {
      showToast(copied
        ? `NCRP opened and ${identifier} was copied. Paste it into the official search field.`
        : "NCRP opened. Copy the suspect identifier from the evidence and paste it into the search field.");
    });
  };

  return (
    <div className="relative flex-grow px-4 py-8 sm:px-6 sm:py-10 lg:px-8 bg-gray-50/20 dark:bg-zinc-950 transition-colors duration-200">

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
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Is this call or message a scam?
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
              Choose the easiest way to check. You do not need to create an account.
            </p>
            <p className="mx-auto flex w-fit items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <Lock className="h-4 w-4" /> Nothing is shared without your permission
            </p>
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
                  Check another call or message
                </button>

                <details className="text-right text-xs text-gray-500"><summary className="cursor-pointer font-semibold">Reference number</summary><p className="mt-1">{scanId}</p></details>
              </div>

              <PrivacyProofBar
                evidenceBytes={evidenceBytes}
                modelStatus={whisperPrivacy.modelState}
                audioInMemory={whisperPrivacy.audioStored}
                analysisLocation={whisperPrivacy.analysisLocation}
                speechMayLeaveDevice={whisperPrivacy.speechMayLeaveDevice}
              />

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
                        {syncStatus === "shared" ? "Shared with your permission" : "This result is private"}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                        {syncStatus === "shared"
                          ? `Only the ${sharedScope?.replaceAll("_", " ")} package was sent after your approval.${sharedRingId ? ` It joined ${sharedRingId}.` : ""}`
                          : "The check happened on this device. You decide whether anything is shared."}
                      </p>
                    </div>
                  </div>
                  {syncStatus === "shared" ? (
                    <button
                      type="button"
                      onClick={handleWithdrawConsent}
                      disabled={sharing || !sharedIncidentId}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-800/20 px-3 py-2 text-xs font-semibold transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-emerald-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Withdraw and delete
                    </button>
                  ) : (
                    <span className="rounded-full border border-current/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      Not shared
                    </span>
                  )}
                </div>
              </div>

              {/* Critical Alert Banner */}
              {result.risk === "critical" && (
                <AlertBanner
                  onNotifyFamily={() => setFamilyModalOpen(true)}
                  onGenerateComplaint={handleScrollToComplaint}
                  onCopyComplaint={handleCopyComplaint}
                  onReturnHome={handleReset}
                  onDownloadEvidence={handleDownloadEvidencePacket}
                  onCheckNcrp={handleCheckNcrp}
                  complaintGenerated={true}
                />
              )}

              {/* Suspicious Warning Banner */}
              {result.risk === "suspicious" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-2xl flex gap-3 text-left">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">
                      Be careful. This may be a scam.
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                      Do not send money, share an OTP, or follow links until you verify the caller independently.
                    </p>
                    <button
                      type="button"
                      onClick={handleCheckNcrp}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      <SearchCheck className="h-3.5 w-3.5" />
                      Check number on official NCRP
                    </button>
                  </div>
                </div>
              )}

              {consentReceipt && <ConsentReceipt receipt={consentReceipt} />}

              {result.risk !== "safe" && localReviewPayload && syncStatus !== "shared" && (
                <details className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <summary className="cursor-pointer text-base font-bold text-gray-950 dark:text-white">
                    Help warn other people (optional)
                  </summary>
                  <div className="mt-5 flex flex-col gap-4 border-t border-gray-100 pt-5 dark:border-zinc-800 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <h3 className="flex items-center gap-2 text-base font-bold text-gray-950 dark:text-white">
                        <Lock className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                        Choose what to share
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
                        You can share only the warning signs from this conversation. Your full conversation stays private unless you choose otherwise.
                      </p>
                      <p className="mt-2 text-xs font-medium text-gray-500 dark:text-zinc-500">
                        {localReviewPayload.redactionSummary}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:min-w-64">
                      <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                        Delete shared information after
                        <select
                          value={retentionDays}
                          onChange={(event) => setRetentionDays(Number(event.target.value) as 1 | 7 | 30)}
                          className="mt-1.5 w-full rounded-lg border border-gray-250 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                        >
                          <option value={1}>After 24 hours</option>
                          <option value={7}>After 7 days</option>
                          <option value={30}>After 30 days</option>
                        </select>
                      </label>
                      <button
                        disabled={sharing}
                        onClick={() => handleShareEvidence("selected_evidence")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        Share warning signs only
                      </button>
                      <button
                        disabled={sharing}
                        onClick={() => handleShareEvidence("redacted_transcript")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-250 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Share message with private details hidden
                      </button>
                      <button
                        disabled={sharing}
                        onClick={handleKeepPrivate}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        <Trash2 className="h-4 w-4" />
                        Do not share anything
                      </button>
                    </div>
                  </div>

                  <details className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <summary className="cursor-pointer text-sm font-bold text-gray-700 dark:text-zinc-300">Preview exactly what can be shared</summary>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                        Warning signs
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
                        Message with private details hidden
                      </h4>
                      <p className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
                        {localReviewPayload.redactedTranscript}
                      </p>
                    </div>
                  </div>
                  </details>
                </details>
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
                      What you should do now
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
                          See why PRAHARI warned you
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
                      Words that raised the warning
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      These parts of the conversation matched common scam tactics.
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
                      Ready-to-use complaint
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Review this draft before sending it to the authorities.
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
                onSuccess={() => {
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
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

                {/* Header title tab bar */}
                <div className="px-5 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">How would you like to check?</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Choose one option below.</p>
                  </div>

                  {/* Quick-try buttons for demo evaluations */}
                  <div className="hidden items-center gap-1.5">
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

                <PrivacyProofBar
                  evidenceBytes={evidenceBytes}
                  modelStatus={whisperPrivacy.modelState}
                  audioInMemory={whisperPrivacy.audioStored}
                  analysisLocation={whisperPrivacy.analysisLocation}
                  speechMayLeaveDevice={whisperPrivacy.speechMayLeaveDevice}
                />

                <div className="p-4 sm:p-6">
                  <Tabs value={activeTab} onValueChange={(val) => {
                    if (val !== "live") stopLiveDemo();
                    setActiveTab(val);
                    setSelectedFile(null);
                    setLiveResult(null);
                    }} className="space-y-5">
                    <TabsList style={{ height: "auto" }} className="grid grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
                      <TabsTrigger
                        value="live"
                        style={{ height: "auto" }}
                        className="min-h-20 rounded-lg border-2 border-gray-200 px-4 py-3 text-left data-[state=active]:border-indigo-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800 dark:border-zinc-700 dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:bg-indigo-950/30 dark:data-[state=active]:text-indigo-200"
                      >
                        <span className="flex items-start gap-3"><Mic className="mt-0.5 h-5 w-5 shrink-0" /><span><strong className="block text-sm">Protect me during a call</strong><span className="mt-1 block text-xs font-normal opacity-75">Get warnings while the call continues</span></span></span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="text"
                        style={{ height: "auto" }}
                        className="min-h-20 rounded-lg border-2 border-gray-200 px-4 py-3 text-left data-[state=active]:border-indigo-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800 dark:border-zinc-700 dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:bg-indigo-950/30 dark:data-[state=active]:text-indigo-200"
                      >
                        <span className="flex items-start gap-3"><MessageSquareText className="mt-0.5 h-5 w-5 shrink-0" /><span><strong className="block text-sm">Paste a message</strong><span className="mt-1 block text-xs font-normal opacity-75">SMS, WhatsApp, or email</span></span></span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="transcript"
                        style={{ height: "auto" }}
                        className="min-h-20 rounded-lg border-2 border-gray-200 px-4 py-3 text-left data-[state=active]:border-indigo-600 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800 dark:border-zinc-700 dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:bg-indigo-950/30 dark:data-[state=active]:text-indigo-200"
                      >
                        <span className="flex items-start gap-3"><FileUp className="mt-0.5 h-5 w-5 shrink-0" /><span><strong className="block text-sm">Upload a text file</strong><span className="mt-1 block text-xs font-normal opacity-75">TXT, MD, or CSV</span></span></span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Quick-try buttons for mobile view */}
                    <div className="hidden items-center justify-center gap-1.5 pt-1">
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

                    {/* Tab Contents: Transcript Dropzone */}
                    <TabsContent value="transcript" className="mt-0">
                      <UploadDropzone
                        accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                        onFileSelect={setSelectedFile}
                        selectedFile={selectedFile}
                      />
                    </TabsContent>

                    <TabsContent value="live" className="mt-0">
                      <div className="space-y-3">
                        <LocalWhisperCapture
                          transcript={inputText}
                          onTranscript={setInputText}
                          onPrivacyStatus={setWhisperPrivacy}
                        />
                        <div className={`rounded-lg border p-4 ${
                          liveResult?.risk === "suspicious"
                            ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                            : "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/20"
                        }`} aria-live="polite">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                whisperPrivacy.captureState === "recording" || liveDemoRunning
                                  ? "animate-pulse bg-red-500"
                                  : "bg-emerald-500"
                              }`} />
                              <div>
                                <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                                  {whisperPrivacy.captureState === "recording" || liveDemoRunning
                                    ? "Live protection is active"
                                    : "Live protection is ready"}
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                                  {liveChecking
                                    ? "Checking the latest words on this device..."
                                    : liveResult?.risk === "suspicious"
                                      ? "Warning signs found. Do not pay while PRAHARI keeps checking."
                                      : liveResult
                                        ? "No strong scam pattern yet. PRAHARI is still listening."
                                        : "Start listening, or run the live demo below."}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRunLiveDemo}
                              disabled={liveDemoRunning || whisperPrivacy.captureState === "recording"}
                              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-zinc-900 dark:text-indigo-300"
                            >
                              <PlayCircle className="h-4 w-4" />
                              {liveDemoRunning ? "Demo running" : "Run live demo"}
                            </button>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {LIVE_PHASES.map((phase) => {
                              const detected = liveResult?.timeline.find((item) => item.phase === phase.key)?.detected;
                              return (
                                <div
                                  key={phase.key}
                                  className={`flex min-h-11 items-center justify-center rounded-md border px-2 py-2 text-center text-[11px] font-bold ${
                                    detected
                                      ? "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                                      : "border-gray-200 bg-white text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                                  }`}
                                >
                                  {phase.label}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="The live transcript appears here as the call continues..."
                          rows={6}
                          className="mt-4 w-full resize-none rounded-xl border border-gray-250 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-800 placeholder-gray-500 focus:border-indigo-500/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200 dark:placeholder-zinc-500"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Actions area */}
                  <details className="mt-5 text-sm text-gray-600 dark:text-zinc-400">
                    <summary className="cursor-pointer font-semibold">Try an example</summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleDemoLoad("critical")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"><PlayCircle className="h-4 w-4" />Scam example</button>
                      <button type="button" onClick={() => handleDemoLoad("suspicious")} className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300">Suspicious example</button>
                      <button type="button" onClick={() => handleDemoLoad("safe")} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300">Safe example</button>
                    </div>
                  </details>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors"
                      type="button"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Clear
                    </button>

                    <button
                      disabled={(!inputText && !selectedFile)}
                      onClick={handleAnalyze}
                      className="min-h-12 w-full rounded-lg bg-indigo-600 px-6 py-3 text-base font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                      {activeTab === "live" ? "Check full result now" : "Check if this is a scam"}
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
