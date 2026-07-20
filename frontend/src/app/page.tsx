"use client";

import React from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { useTranslation } from "../context/LanguageContext";
import { Shield, ShieldAlert, Eye, Users, FileSearch, ArrowRight } from "lucide-react";

export default function Home() {
  const { t } = useTranslation();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const features = [
    {
      title: t("hero.features.scam.title"),
      desc: t("hero.features.scam.desc"),
      icon: <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      title: t("hero.features.fraud.title"),
      desc: t("hero.features.fraud.desc"),
      icon: <FileSearch className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      title: t("hero.features.shield.title"),
      desc: t("hero.features.shield.desc"),
      icon: <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      title: t("hero.features.xai.title"),
      desc: t("hero.features.xai.desc"),
      icon: <Eye className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
    },
  ];

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center overflow-hidden bg-gray-50/30 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* Background Dotted Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#1f1f23_1px,transparent_1px)] opacity-60 dark:opacity-40 z-0 pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center space-y-8 flex flex-col items-center">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-150/40 dark:border-indigo-900/30 shadow-sm"
        >
          <Shield className="h-3.5 w-3.5" />
          AI Digital Public Safety Initiative
        </motion.div>

        {/* Hero Headers */}
        <div className="space-y-4 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white"
          >
            {t("hero.title")}
          </motion.h1>
          
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 dark:from-indigo-400 dark:via-indigo-300 dark:to-indigo-500 bg-clip-text text-transparent"
          >
            {t("hero.subtitle")}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed"
          >
            {t("hero.tagline")}
          </motion.p>
        </div>

        {/* Call to Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          <Link
            href="/check"
            className="group flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 transition-all duration-200"
          >
            {t("hero.cta")}
            <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex flex-col text-left p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-250 dark:hover:border-zinc-700 transition-all duration-200"
            >
              {/* Feature Icon box */}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950/20 mb-5">
                {feature.icon}
              </div>

              {/* Title & Desc */}
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
