"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "../context/LanguageContext";
import { AlertTriangle, Users, PhoneCall, FileEdit, Clipboard, Home, FileDown } from "lucide-react";

interface AlertBannerProps {
  onNotifyFamily: () => void;
  onGenerateComplaint: () => void;
  onCopyComplaint: () => void;
  onReturnHome: () => void;
  onDownloadEvidence: () => void;
  complaintGenerated: boolean;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  onNotifyFamily,
  onGenerateComplaint,
  onCopyComplaint,
  onReturnHome,
  onDownloadEvidence,
  complaintGenerated,
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-full bg-red-50 dark:bg-red-950/20 border-y sm:border border-red-200 dark:border-red-900/30 sm:rounded-2xl p-6 shadow-sm overflow-hidden transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto">
        
        {/* Left Warning Info */}
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-red-600 text-white shadow-lg shadow-red-500/20"
          >
            <AlertTriangle className="h-6 w-6" />
          </motion.div>
          
          <div className="space-y-1 text-left">
            <h2 className="text-lg font-bold text-red-900 dark:text-red-400 flex items-center gap-1.5">
              {t("alert.criticalTitle")}
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 max-w-2xl leading-relaxed">
              {t("alert.criticalDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Family Shield CTA */}
          <button
            onClick={onNotifyFamily}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-zinc-800 border border-red-200 dark:border-red-900/30 transition-all duration-200 shadow-sm"
          >
            <Users className="h-4 w-4" />
            {t("alert.notifyFamily")}
          </button>

          {/* Cybercrime Helpline Call */}
          <a
            href="tel:1930"
            onClick={onReturnHome} // Small backup callback or handler
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white transition-all duration-200 shadow-md shadow-red-600/10"
          >
            <PhoneCall className="h-4 w-4" />
            {t("alert.callHelpline")}
          </a>
        </div>
      </div>

      {/* Secondary Quick Action Bar */}
      <div className="mt-5 pt-5 border-t border-red-200/50 dark:border-red-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-red-700/80 dark:text-red-400/80 font-medium">
          {t("results.helplineText")}
        </span>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onDownloadEvidence}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-100/50 dark:hover:bg-zinc-850 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            1930-ready packet
          </button>
          {!complaintGenerated ? (
            <button
              onClick={onGenerateComplaint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-100/50 dark:hover:bg-zinc-850 transition-colors"
            >
              <FileEdit className="h-3.5 w-3.5" />
              {t("alert.generateComplaint")}
            </button>
          ) : (
            <button
              onClick={onCopyComplaint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-100/50 dark:hover:bg-zinc-850 transition-colors"
            >
              <Clipboard className="h-3.5 w-3.5" />
              {t("alert.copyComplaint")}
            </button>
          )}

          <button
            onClick={onReturnHome}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-red-100/50 dark:hover:bg-zinc-850 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            {t("alert.returnHome")}
          </button>
        </div>
      </div>
    </div>
  );
};
export default AlertBanner;
