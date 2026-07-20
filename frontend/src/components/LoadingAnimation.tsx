"use client";

import React from "react";
import { useTranslation } from "../context/LanguageContext";
import { Shield } from "lucide-react";

export const LoadingAnimation: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-pulse">
      {/* Scanning status banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/20 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <Shield className="h-5 w-5 animate-spin" />
            <span className="absolute inline-flex h-full w-full rounded-xl bg-indigo-400 opacity-75 animate-ping" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("check.analyzing")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Evaluating compliance flags & linguistic pressure points...
            </p>
          </div>
        </div>
        <div className="w-full sm:w-48 bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full w-1/3 rounded-full animate-infinite-slide" style={{
            animation: 'infinite-slide 1.5s infinite linear'
          }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Risk Gauge & Confidence Skeleton */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-850 shadow-sm space-y-6">
            <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded" />
            
            {/* Mock Gauge (Semi-circle) */}
            <div className="flex justify-center py-4">
              <div className="relative w-44 h-24 border-8 border-b-0 border-gray-200 dark:border-zinc-800 rounded-t-full flex items-end justify-center">
                <div className="w-16 h-8 bg-gray-100 dark:bg-zinc-800 rounded-t-full" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded mx-auto" />
              <div className="h-8 w-20 bg-gray-200 dark:bg-zinc-800 rounded mx-auto" />
            </div>
          </div>
        </div>

        {/* Right Column: Progressive Timeline Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-850 shadow-sm space-y-6">
            <div className="h-4 w-44 bg-gray-200 dark:bg-zinc-800 rounded" />
            
            <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-zinc-800">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="relative flex gap-4 items-start">
                  {/* Timeline dot */}
                  <span className="absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <span className="h-2 w-2 rounded-full bg-gray-200 dark:bg-zinc-800" />
                  </span>
                  
                  {/* Timeline text skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-gray-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-5/6 bg-gray-100 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section: Evidence Panel & Recommendations Skeletons */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-850 shadow-sm space-y-6">
        <div className="h-4 w-36 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border border-gray-100 dark:border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="h-5 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full" />
              </div>
              <div className="h-4 w-full bg-gray-100 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Inline styles for custom infinite sliding animation */}
      <style jsx global>{`
        @keyframes infinite-slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
      `}</style>
    </div>
  );
};
export default LoadingAnimation;
