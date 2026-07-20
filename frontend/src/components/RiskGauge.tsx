"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "../context/LanguageContext";

interface RiskGaugeProps {
  risk: "safe" | "suspicious" | "critical";
  score: number;
  confidence: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, score, confidence }) => {
  const { t } = useTranslation();

  // Maps score (0 - 100) to rotation angle (-90deg to +90deg)
  const angle = (score / 100) * 180 - 90;

  const getRiskDetails = () => {
    switch (risk) {
      case "critical":
        return {
          colorClass: "text-red-600 dark:text-red-500",
          bgClass: "bg-red-50 dark:bg-red-950/20",
          borderClass: "border-red-200 dark:border-red-900/30",
          label: "CRITICAL",
          label_hi: "गंभीर (Critical)",
        };
      case "suspicious":
        return {
          colorClass: "text-amber-500 dark:text-amber-400",
          bgClass: "bg-amber-50 dark:bg-amber-950/20",
          borderClass: "border-amber-200 dark:border-amber-900/30",
          label: "SUSPICIOUS",
          label_hi: "संदिग्ध (Suspicious)",
        };
      default:
        return {
          colorClass: "text-green-600 dark:text-green-500",
          bgClass: "bg-green-50 dark:bg-green-950/20",
          borderClass: "border-green-200 dark:border-green-900/30",
          label: "SAFE",
          label_hi: "सुरक्षित (Safe)",
        };
    }
  };

  const details = getRiskDetails();

  return (
    <div className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-200 w-full">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">
        {t("results.riskLevel")}
      </h3>

      <div className="relative w-56 h-32 flex justify-center overflow-hidden">
        {/* SVG Arch for the gauge */}
        <svg width="220" height="110" viewBox="0 0 220 110" className="overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" /> {/* Green */}
              <stop offset="50%" stopColor="#F59E0B" /> {/* Amber */}
              <stop offset="100%" stopColor="#EF4444" /> {/* Red */}
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>
          
          {/* Background Arc */}
          <path
            d="M 20 100 A 90 90 0 0 1 200 100"
            fill="none"
            stroke="#E4E4E7"
            strokeWidth="12"
            strokeLinecap="round"
            className="dark:stroke-zinc-800"
          />

          {/* Color Gradient Arc */}
          <path
            d="M 20 100 A 90 90 0 0 1 200 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Needle Pin Indicator */}
          <circle cx="110" cy="100" r="8" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" className="dark:fill-indigo-500 dark:stroke-zinc-900" />

          {/* Needle Needle (Line) */}
          <motion.g
            initial={{ rotate: -90 }}
            animate={{ rotate: angle }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            style={{ originX: "110px", originY: "100px" }}
          >
            <line
              x1="110"
              y1="100"
              x2="110"
              y2="20"
              stroke="#4F46E5"
              strokeWidth="4"
              strokeLinecap="round"
              className="dark:stroke-indigo-500"
              filter="url(#shadow)"
            />
            <polygon
              points="106,30 114,30 110,15"
              fill="#4F46E5"
              className="dark:fill-indigo-500"
            />
          </motion.g>
        </svg>

        {/* Floating details inside the arc */}
        <div className="absolute bottom-0 text-center">
          <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {score}%
          </span>
        </div>
      </div>

      {/* Risk Badge and Confidence Score Details */}
      <div className="mt-4 flex flex-col items-center gap-2 w-full">
        <div
          className={`px-4 py-1 rounded-full text-xs font-bold border tracking-wider transition-all duration-300 ${details.bgClass} ${details.colorClass} ${details.borderClass}`}
        >
          {details.label}
        </div>
        
        <div className="text-center mt-3 space-y-1">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
            {t("results.confidence")}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {(confidence * 100).toFixed(0)}%
            </span>
            <div className="w-16 bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RiskGauge;
