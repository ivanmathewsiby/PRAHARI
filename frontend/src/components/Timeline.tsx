"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../context/LanguageContext";
import { ScamPhase } from "../data/mockAnalysis";
import { AlertOctagon, HelpCircle, ChevronDown, Check } from "lucide-react";

interface TimelineProps {
  timeline: ScamPhase[];
}

export const Timeline: React.FC<TimelineProps> = ({ timeline }) => {
  const { language } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const animatedIndex = timeline.length - 1;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const getPhaseIcon = (phase: ScamPhase, index: number) => {
    if (index > animatedIndex) {
      return <HelpCircle className="h-4 w-4 text-gray-300 dark:text-zinc-700" />;
    }
    
    if (phase.detected) {
      return <AlertOctagon className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
    }

    return <Check className="h-4 w-4 text-green-500 dark:text-green-400" />;
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-200 w-full text-left">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          How the caller tried to pressure you
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Tap a step to see what PRAHARI noticed.
        </p>
      </div>

      <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-150 dark:before:bg-zinc-800">
        {timeline.map((phase, index) => {
          const isNodeAnimated = index <= animatedIndex;
          const isExpanded = expandedIndex === index;
          const isDetected = phase.detected;

          return (
            <motion.div
              key={phase.phase}
              initial={{ opacity: 0, x: -10 }}
              animate={isNodeAnimated ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className={`relative group ${
                isNodeAnimated ? "cursor-pointer" : "opacity-40 select-none"
              }`}
              onClick={() => isNodeAnimated && toggleExpand(index)}
            >
              {/* Timeline Connection Line Overlay for Active Nodes */}
              {index > 0 && index <= animatedIndex && timeline[index - 1].detected && isDetected && (
                <div className="absolute -left-[27.5px] -top-8 w-[3px] h-8 bg-amber-500/80 dark:bg-amber-400/80" />
              )}
              {index > 0 && index <= animatedIndex && !timeline[index - 1].detected && !isDetected && (
                <div className="absolute -left-[27px] -top-8 w-[2px] h-8 bg-green-500/60 dark:bg-green-400/60" />
              )}

              {/* Timeline Indicator Node */}
              <span
                className={`absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  index > animatedIndex
                    ? "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    : isDetected
                    ? "border-amber-400 dark:border-amber-500/80 bg-amber-50 dark:bg-amber-950/20 ring-4 ring-amber-500/10 shadow-sm"
                    : "border-green-400 dark:border-green-500/80 bg-green-50 dark:bg-green-950/20 ring-4 ring-green-500/10 shadow-sm"
                }`}
              >
                {getPhaseIcon(phase, index)}
              </span>

              {/* Node Contents */}
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-semibold transition-colors duration-200 ${
                        index > animatedIndex
                          ? "text-gray-400"
                          : isDetected
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {language === "hi" ? phase.phase_hi : phase.phase}
                    </h4>
                    {isNodeAnimated && isDetected && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20 animate-pulse">
                        Detected
                      </span>
                    )}
                  </div>
                  {isNodeAnimated && (
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </div>

                {/* Animated Accordion Explanation */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 border-t border-gray-100 dark:border-zinc-850 pt-2 leading-relaxed">
                        {language === "hi" ? phase.explanation_hi : phase.explanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
export default Timeline;
