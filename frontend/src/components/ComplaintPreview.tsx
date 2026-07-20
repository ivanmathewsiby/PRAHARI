"use client";

import React, { useState } from "react";
import { useTranslation } from "../context/LanguageContext";
import { Copy, FileDown, Printer, Check, FileText } from "lucide-react";

interface ComplaintPreviewProps {
  draftText: string;
}

export const ComplaintPreview: React.FC<ComplaintPreviewProps> = ({ draftText }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([draftText], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = "PRAHARI_Cybercrime_Complaint.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>PRAHARI - Cybercrime Complaint Draft</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 40px;
              line-height: 1.6;
              color: #000;
              background: #fff;
              white-space: pre-wrap;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>OFFICIAL CYBERCRIME COMPLAINT DRAFT</h2>
            <p>Generated via PRAHARI Digital Public Safety Intelligence</p>
          </div>
          <div>${draftText.replace(/\n/g, "<br>")}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex flex-col rounded-2xl border border-gray-155 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 overflow-hidden shadow-sm w-full text-left">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-150 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {t("results.complaint")}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 shadow-sm"
            title={t("complaint.toolbar.copy")}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>{t("complaint.toolbar.copy")}</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 shadow-sm"
            title={t("complaint.toolbar.download")}
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>{t("complaint.toolbar.download")}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 shadow-sm"
            title={t("complaint.toolbar.print")}
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Document Sheet Body */}
      <div className="p-6 md:p-8 bg-white dark:bg-zinc-900/40 overflow-x-auto max-h-[380px] overflow-y-auto">
        <pre className="font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
          {draftText}
        </pre>
      </div>

      {/* Footer warning */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-zinc-900/60 border-t border-gray-150 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
        Disclaimer: This complaint draft is automatically compiled based on linguistic cues. Please review carefully and verify specific facts prior to official filing.
      </div>
    </div>
  );
};
export default ComplaintPreview;
