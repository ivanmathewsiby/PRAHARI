"use client";

import Link from "next/link";
import { ArrowRight, MessageSquareText, Mic, PhoneCall, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 bg-white text-gray-950 dark:bg-zinc-950 dark:text-white">
      <section className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
            Your conversation stays private unless you choose to share it
          </div>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Stop. Check. Stay safe.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-650 dark:text-zinc-300">
            Is someone threatening arrest, asking for an OTP, or telling you to transfer money? Check the call or message before you pay.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/check"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-indigo-600 px-6 text-base font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-950"
            >
              <Mic className="h-5 w-5" />
              Check a call or message
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="tel:1930"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg border-2 border-red-200 px-6 text-base font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              <PhoneCall className="h-5 w-5" />
              Money sent? Call 1930
            </a>
          </div>
        </div>

        <div className="mt-14 border-t border-gray-200 pt-8 dark:border-zinc-800">
          <h2 className="text-lg font-bold">It takes less than a minute</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <div className="flex gap-3">
              <Mic className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div><p className="font-bold">Speak or listen</p><p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Put a suspicious call on speaker.</p></div>
            </div>
            <div className="flex gap-3">
              <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div><p className="font-bold">Paste a message</p><p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Use text from SMS, WhatsApp, or email.</p></div>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div><p className="font-bold">Get a clear answer</p><p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">See what to do before money moves.</p></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
