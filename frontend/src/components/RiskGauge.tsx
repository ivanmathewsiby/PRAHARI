"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface RiskGaugeProps {
  risk: "safe" | "suspicious" | "critical";
  score: number;
  confidence: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, score, confidence }) => {
  const details = risk === "critical"
    ? { label: "High risk", help: "Stop the call and do not send money.", icon: ShieldAlert, classes: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200" }
    : risk === "suspicious"
      ? { label: "Be careful", help: "Do not share an OTP or make a payment yet.", icon: AlertTriangle, classes: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200" }
      : { label: "No strong scam signs", help: "Stay alert before sharing personal information.", icon: CheckCircle2, classes: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200" };
  const Icon = details.icon;

  return (
    <div className={`rounded-lg border p-5 ${details.classes}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-6 w-6 shrink-0" />
        <div>
          <p className="text-lg font-extrabold">{details.label}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-85">{details.help}</p>
        </div>
      </div>
      <details className="mt-4 border-t border-current/15 pt-3 text-xs opacity-80">
        <summary className="cursor-pointer font-semibold">See technical score</summary>
        <p className="mt-2">Risk score: {score}/100. Model confidence: {(confidence * 100).toFixed(0)}%.</p>
      </details>
    </div>
  );
};

export default RiskGauge;
