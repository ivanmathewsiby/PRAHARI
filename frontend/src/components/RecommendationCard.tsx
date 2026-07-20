"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

interface RecommendationCardProps {
  text: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ text }) => {
  return (
    <div className="flex gap-3 items-start p-4 bg-gray-50/50 dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-xl transition-all duration-200 text-left">
      <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 mt-0.5">
        <ShieldAlert className="h-3.5 w-3.5" />
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
        {text}
      </p>
    </div>
  );
};
export default RecommendationCard;
