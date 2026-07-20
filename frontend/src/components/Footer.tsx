"use client";

import React from "react";
import { useTranslation } from "../context/LanguageContext";
import { Shield } from "lucide-react";

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-zinc-900 bg-gray-50 dark:bg-zinc-950 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-gray-900 dark:text-white">PRAHARI</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
            © {currentYear} {t("footer.text")}
          </p>
          <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>National Cyber Crime Helpline: 1930</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
