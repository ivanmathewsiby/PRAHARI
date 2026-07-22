"use client";

import React from "react";
import {
  AlertTriangle,
  Clipboard,
  FileDown,
  FileEdit,
  PhoneCall,
  SearchCheck,
  Users,
} from "lucide-react";

interface AlertBannerProps {
  onNotifyFamily: () => void;
  onGenerateComplaint: () => void;
  onCopyComplaint: () => void;
  onReturnHome: () => void;
  onDownloadEvidence: () => void;
  onCheckNcrp: () => void;
  complaintGenerated: boolean;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  onNotifyFamily,
  onGenerateComplaint,
  onCopyComplaint,
  onDownloadEvidence,
  onCheckNcrp,
  complaintGenerated,
}) => (
  <section className="rounded-lg border-2 border-red-300 bg-red-50 p-5 text-left dark:border-red-900 dark:bg-red-950/25" aria-live="assertive">
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <h2 className="text-2xl font-extrabold text-red-950 dark:text-red-200">Stop. Do not send money.</h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-red-800 dark:text-red-300">
          This looks like a scam. End the call now. Police, CBI, or banks will never ask you to move money to a “safe” account.
        </p>
      </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <a href="tel:1930" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-base font-bold text-white transition hover:bg-red-700">
        <PhoneCall className="h-5 w-5" />
        Call 1930 now
      </a>
      <button type="button" onClick={onNotifyFamily} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border-2 border-red-200 bg-white px-5 text-base font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">
        <Users className="h-5 w-5" />
        Call someone I trust
      </button>
    </div>

    <details className="mt-5 border-t border-red-200 pt-4 dark:border-red-900/50">
      <summary className="cursor-pointer text-sm font-bold text-red-800 dark:text-red-300">More help and reporting options</summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onCheckNcrp} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/40"><SearchCheck className="h-4 w-4" />Check number on NCRP</button>
        <button type="button" onClick={onDownloadEvidence} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/40"><FileDown className="h-4 w-4" />Save evidence</button>
        <button type="button" onClick={complaintGenerated ? onCopyComplaint : onGenerateComplaint} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/40">
          {complaintGenerated ? <Clipboard className="h-4 w-4" /> : <FileEdit className="h-4 w-4" />}
          {complaintGenerated ? "Copy complaint" : "Prepare complaint"}
        </button>
      </div>
    </details>
  </section>
);

export default AlertBanner;
