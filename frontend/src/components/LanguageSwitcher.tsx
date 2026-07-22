"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../context/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";

type Language = "en" | "hi" | "ml" | "ta" | "te" | "kn" | "mr";

const languageNames: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  ml: "മലയാളം",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  mr: "मराठी",
};

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-650 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-850 hover:text-gray-900 dark:hover:text-white transition-all duration-200 shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="h-3.5 w-3.5 text-indigo-500" />
        <span>{languageNames[language as Language] || "English"}</span>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-xl border border-gray-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 shadow-lg ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden divide-y divide-gray-50 dark:divide-zinc-900 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="py-1">
            {(["en", "hi", "ml", "ta", "te", "kn", "mr"] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleSelectLanguage(lang)}
                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                  language === lang
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {languageNames[lang]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
