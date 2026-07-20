"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "../context/LanguageContext";
import { EvidenceItem } from "../data/mockAnalysis";
import { AlertCircle, AlertTriangle, Info, Quote } from "lucide-react";

interface EvidenceCardProps {
  evidence: EvidenceItem;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  const { language } = useTranslation();

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          borderClass: "border-l-red-500 dark:border-l-red-600",
          badgeClass: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30",
          icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
        };
      case "medium":
        return {
          borderClass: "border-l-amber-500 dark:border-l-amber-600",
          badgeClass: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
        };
      default:
        return {
          borderClass: "border-l-emerald-500 dark:border-l-emerald-600",
          badgeClass: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30",
          icon: <Info className="h-3.5 w-3.5 text-emerald-500" />,
        };
    }
  };

  const styles = getSeverityStyles(evidence.severity);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative p-5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-150 dark:border-zinc-800 border-l-4 ${styles.borderClass} shadow-sm hover:shadow-md hover:border-gray-250 dark:hover:border-zinc-700 transition-all duration-200 text-left`}
    >
      <div className="absolute right-4 top-4 text-gray-100 dark:text-zinc-800 select-none">
        <Quote className="h-8 w-8 stroke-[1.5]" />
      </div>

      <div className="flex flex-col gap-3">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Badge */}
          <span className={`flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${styles.badgeClass}`}>
            {styles.icon}
            {evidence.severity}
          </span>

          {/* Reason Badge */}
          <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20">
            {language === "hi" ? evidence.reason_hi : evidence.reason}
          </span>
        </div>

        {/* Highlighted Quote Text */}
        <blockquote className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed italic border-left pl-3 border-gray-100 dark:border-zinc-800">
          "{language === "hi" ? evidence.text_hi : evidence.text}"
        </blockquote>
      </div>
    </motion.div>
  );
};
export default EvidenceCard;
