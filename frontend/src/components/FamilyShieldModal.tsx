"use client";

import React, { useState } from "react";
import { useTranslation } from "../context/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ShieldCheck, MessageSquare, AlertTriangle, Send } from "lucide-react";

interface FamilyShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const FamilyShieldModal: React.FC<FamilyShieldModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t, language } = useTranslation();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const getRelationsList = () => {
    return [
      { value: "mother", label: t("familyModal.relations.mother") },
      { value: "father", label: t("familyModal.relations.father") },
      { value: "brother", label: t("familyModal.relations.brother") },
      { value: "friend", label: t("familyModal.relations.friend") },
    ];
  };

  const getMessagePreview = () => {
    const relative = selectedContact
      ? t(`familyModal.relations.${selectedContact}`)
      : "[Contact]";
      
    if (language === "hi") {
      return `आपातकालीन अलर्ट: प्रिय ${relative}, मैं वर्तमान में एक संदिग्ध ऑनलाइन बातचीत का सामना कर रहा हूँ जो डिजिटल अरेस्ट घोटाले (सीबीआई/पुलिस प्रतिरूपण) से मिलती-जुलती है। प्रहरी (PRAHARI) जन सुरक्षा प्लेटफॉर्म ने इस गतिविधि को गंभीर सुरक्षा खतरा चिह्नित किया है। कृपया मुझे तुरंत कॉल करें।`;
    }
    return `Emergency Alert: Dear ${relative}, I am currently facing a suspicious online scenario that matches a Digital Arrest scam pattern (CBI/police impersonation). PRAHARI public safety intelligence has flagged this interaction as a critical threat. Please call me immediately.`;
  };

  const handleSend = () => {
    if (!selectedContact) return;
    
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      
      setTimeout(() => {
        onSuccess(getMessagePreview());
        onClose();
        // Reset state after closing
        setTimeout(() => {
          setSendSuccess(false);
          setSelectedContact(null);
        }, 300);
      }, 1500);
    }, 1200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              {t("familyModal.title")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            {t("familyModal.desc")}
          </DialogDescription>
        </DialogHeader>

        {sendSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400">
              <Send className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {t("familyModal.success")}
              </h4>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Encrypted SMS/WhatsApp dispatch sequence complete.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2 text-left">
            {/* Contact Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("familyModal.contact")}
              </label>
              <Select value={selectedContact} onValueChange={setSelectedContact}>
                <SelectTrigger className="w-full bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 rounded-xl focus:ring-indigo-500">
                  <SelectValue placeholder={t("familyModal.selectContact")} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border border-gray-150 dark:border-zinc-800 rounded-xl">
                  {getRelationsList().map((relation) => (
                    <SelectItem
                      key={relation.value}
                      value={relation.value}
                      className="focus:bg-indigo-50 dark:focus:bg-indigo-950/20 focus:text-indigo-600 dark:focus:text-indigo-400 cursor-pointer"
                    >
                      {relation.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Preview Container */}
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                {t("familyModal.messagePreview")}
              </span>
              <div className="p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-xl">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic">
                  {getMessagePreview()}
                </p>
              </div>
            </div>

            {/* Crucial Warn Banner */}
            <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-normal font-medium">
                Once clicked, this triggers an immediate safety message to your trusted peer. Seek help and do not execute transfers.
              </p>
            </div>
          </div>
        )}

        {!sendSuccess && (
          <DialogFooter className="mt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-gray-250 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-850 rounded-xl text-gray-700 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selectedContact || isSending}
              onClick={handleSend}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/10"
            >
              {isSending ? "Sending..." : t("familyModal.notify")}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default FamilyShieldModal;
