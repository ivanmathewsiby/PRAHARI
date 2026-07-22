"use client";

import React from "react";
import { Download, Printer, ReceiptText, ShieldCheck } from "lucide-react";

export interface ConsentReceiptData {
  scanId: string;
  incidentId: string;
  consentScope: string;
  evidenceBytes: number;
  redactionSummary: string;
  createdAt: string;
  expiresAt: string;
  retentionDays: number;
  ringId?: string | null;
}

interface PrivacyProofBarProps {
  evidenceBytes: number;
  modelStatus: string;
  audioInMemory: boolean;
  analysisLocation: "Browser service" | "On device";
  speechMayLeaveDevice: boolean;
}

export function PrivacyProofBar({
  evidenceBytes,
  modelStatus,
  audioInMemory,
  analysisLocation,
  speechMayLeaveDevice,
}: PrivacyProofBarProps) {
  return (
    <div className={`border-y px-4 py-3 ${evidenceBytes === 0 ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/15" : "border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-indigo-950/15"}`}>
      <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        {evidenceBytes === 0 ? "Your evidence has not been shared" : "Shared only after your permission"}
      </div>
      <details className="mt-2 pl-7 text-xs text-gray-600 dark:text-zinc-400">
        <summary className="cursor-pointer font-semibold">Privacy details</summary>
        <div className="mt-2 space-y-1 leading-relaxed">
          <p>Speech processing: {analysisLocation}. Evidence shared with PRAHARI: {evidenceBytes.toLocaleString()} bytes.</p>
          <p>Audio: {speechMayLeaveDevice ? "may be processed by your browser's speech service" : audioInMemory ? "held temporarily in device memory" : "not stored"}.</p>
          <p>Engine: {modelStatus}.</p>
        </div>
      </details>
    </div>
  );
}

const formatDate = (value: string) => new Date(value).toLocaleString("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ConsentReceipt({ receipt }: { receipt: ConsentReceiptData }) {
  const downloadReceipt = () => {
    const blob = new Blob([JSON.stringify({
      document_type: "PRAHARI_CONSENT_RECEIPT",
      ...receipt,
      citizen_action: "Consent can be withdrawn from the result screen before expiry.",
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `PRAHARI-consent-${receipt.incidentId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printReceipt = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>PRAHARI Consent Receipt</title><style>
      body{font-family:Arial,sans-serif;color:#111;padding:48px;line-height:1.5}h1{font-size:24px;margin:0 0 6px}p{margin:0}.muted{color:#666}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:30px}.item{border-top:1px solid #ddd;padding-top:10px}.label{font-size:11px;text-transform:uppercase;color:#777;font-weight:700}.value{font-size:14px;font-weight:700;margin-top:4px}.notice{margin-top:32px;padding:16px;background:#f3f7f4;border-left:4px solid #16834b;font-size:13px}</style></head><body>
      <h1>PRAHARI Consent Receipt</h1><p class="muted">Privacy and evidence-sharing record</p><div class="grid">
      <div class="item"><div class="label">Incident</div><div class="value">${receipt.incidentId}</div></div>
      <div class="item"><div class="label">Scan</div><div class="value">${receipt.scanId}</div></div>
      <div class="item"><div class="label">Shared</div><div class="value">${receipt.consentScope.replaceAll("_", " ")}</div></div>
      <div class="item"><div class="label">Payload</div><div class="value">${receipt.evidenceBytes} bytes</div></div>
      <div class="item"><div class="label">Consent time</div><div class="value">${formatDate(receipt.createdAt)}</div></div>
      <div class="item"><div class="label">Automatic expiry</div><div class="value">${formatDate(receipt.expiresAt)}</div></div>
      </div><div class="notice"><strong>Redaction:</strong> ${receipt.redactionSummary}<br><br>This prototype record can be deleted immediately by withdrawing consent. It is not proof of filing with a government authority.</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ReceiptText className="mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-300">Consent receipt</h3>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-400/80">
              {receipt.evidenceBytes} bytes shared as {receipt.consentScope.replaceAll("_", " ")}. Automatic deletion is due {formatDate(receipt.expiresAt)}.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={downloadReceipt} className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/20 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:bg-zinc-950 dark:text-emerald-300">
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button type="button" onClick={printReceipt} title="Print consent receipt" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-700/20 bg-white text-emerald-900 hover:bg-emerald-100 dark:bg-zinc-950 dark:text-emerald-300">
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
