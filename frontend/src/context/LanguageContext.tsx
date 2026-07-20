"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import en from "../translations/en.json";
import hi from "../translations/hi.json";
import ml from "../translations/ml.json";
import ta from "../translations/ta.json";
import te from "../translations/te.json";
import kn from "../translations/kn.json";
import mr from "../translations/mr.json";

type Language = "en" | "hi" | "ml" | "ta" | "te" | "kn" | "mr";
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, any> = {
  en,
  hi,
  ml,
  ta,
  te,
  kn,
  mr,
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("prahari_lang") as Language;
    const validLanguages: Language[] = ["en", "hi", "ml", "ta", "te", "kn", "mr"];
    if (validLanguages.includes(savedLang)) {
      setLanguageState(savedLang);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("prahari_lang", lang);
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split(".");
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary if key not found in active language
        let fallback: any = translations["en"];
        for (const fallbackKey of keys) {
          if (fallback && typeof fallback === "object" && fallbackKey in fallback) {
            fallback = fallback[fallbackKey];
          } else {
            return keyPath; // return key path as fallback
          }
        }
        return fallback;
      }
    }

    if (typeof current === "string") {
      return current;
    }

    return keyPath;
  };

  // Prevent layout shift/hydration mismatch while loading persisted preference
  if (!mounted) {
    // Return a dummy translation provider during SSR hydration
    return (
      <LanguageContext.Provider value={{ language: "en", setLanguage: () => {}, t: (k) => k }}>
        <div style={{ visibility: "hidden" }}>{children}</div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
