"use client";

import React, { useState, useRef } from "react";
import { useTranslation } from "../context/LanguageContext";
import { UploadCloud, File, FileText, Image as ImageIcon, X } from "lucide-react";

interface UploadDropzoneProps {
  accept: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  accept,
  onFileSelect,
  selectedFile,
}) => {
  const { t } = useTranslation();
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-10 w-10 text-indigo-500" />;
    }
    if (file.type === "application/pdf") {
      return <FileText className="h-10 w-10 text-red-500" />;
    }
    return <File className="h-10 w-10 text-amber-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={`relative flex flex-col items-center justify-center w-full min-h-[220px] p-6 text-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
        isDragActive
          ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10 ring-4 ring-indigo-500/10"
          : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-gray-50/50 dark:hover:bg-zinc-900/80 hover:border-gray-300 dark:hover:border-zinc-700"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-md p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 text-left">
              {getFileIcon(selectedFile)}
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-[280px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Remove file"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("check.dropzone.dragText")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("check.dropzone.support")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default UploadDropzone;
