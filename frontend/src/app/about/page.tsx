"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { useTranslation } from "../../context/LanguageContext";
import { Shield, ShieldAlert, AlertOctagon, HelpCircle, CheckCircle, Info } from "lucide-react";

export default function AboutPage() {
  const { t } = useTranslation();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  const phases = [
    {
      title: t("about.phases.authority").split(":")[0],
      desc: t("about.phases.authority").split(":")[1],
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-105 dark:border-blue-900/30",
    },
    {
      title: t("about.phases.fear").split(":")[0],
      desc: t("about.phases.fear").split(":")[1],
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-105 dark:border-amber-900/30",
    },
    {
      title: t("about.phases.isolation").split(":")[0],
      desc: t("about.phases.isolation").split(":")[1],
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border-purple-105 dark:border-purple-900/30",
    },
    {
      title: t("about.phases.money").split(":")[0],
      desc: t("about.phases.money").split(":")[1],
      color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-105 dark:border-red-900/30",
    },
    {
      title: t("about.phases.control").split(":")[0],
      desc: t("about.phases.control").split(":")[1],
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-105 dark:border-indigo-900/30",
    },
  ];

  const facts = [
    t("about.facts.fact1"),
    t("about.facts.fact2"),
    t("about.facts.fact3"),
  ];

  return (
    <div className="relative flex-grow py-16 px-4 sm:px-6 lg:px-8 bg-gray-50/20 dark:bg-zinc-950 transition-colors duration-200 text-left">
      
      {/* Background Dotted mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#1f1f23_1px,transparent_1px)] opacity-50 dark:opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-12">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/25 mb-2"
          >
            <Info className="h-5 w-5" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white"
          >
            {t("about.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto"
          >
            {t("about.subtitle")}
          </motion.p>
        </div>

        {/* Intro Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 md:p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm leading-relaxed text-sm text-gray-650 dark:text-gray-300 space-y-4"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            What is a Digital Arrest Scam?
          </h2>
          <p>{t("about.scamIntro")}</p>
        </motion.div>

        {/* Scam progression stages */}
        <div className="space-y-6">
          <div className="pl-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("about.phases.title")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Scammers transition through these highly predictable stages to compromise victims.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-5 gap-4"
          >
            {phases.map((phase, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="flex flex-col p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-sm text-left gap-3"
              >
                <div className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border w-max ${phase.color}`}>
                  Phase {idx + 1}
                </div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {phase.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  {phase.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Crucial Facts Callout */}
        <div className="space-y-4 pt-4 border-t border-gray-150 dark:border-zinc-900">
          <div className="pl-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("about.facts.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {facts.map((fact, idx) => (
              <div
                key={idx}
                className="p-5 bg-gray-50/50 dark:bg-zinc-900/40 rounded-2xl border border-gray-150 dark:border-zinc-850 flex gap-3 text-left items-start"
              >
                <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                  {fact}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent Helpline reminder banner */}
        <div className="p-6 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
              Need immediate legal or technical reporting support?
            </h4>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-400/85">
              The National Cyber Crime Helpline is available 24/7.
            </p>
          </div>
          <a
            href="tel:1930"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-colors"
          >
            Call Helpline 1930
          </a>
        </div>
      </div>
    </div>
  );
}
