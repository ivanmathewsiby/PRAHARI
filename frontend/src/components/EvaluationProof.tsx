import benchmark from "../../public/evaluation.json";
import { Activity, Gauge, ShieldAlert, TimerReset } from "lucide-react";

export function EvaluationProof() {
  const metrics = [
    { label: "Scam recall", value: `${benchmark.metrics.scam_recall}%`, icon: ShieldAlert },
    { label: "Benign false positives", value: `${benchmark.metrics.benign_false_positive_rate}%`, icon: Gauge },
    { label: "Before payment language", value: `${benchmark.metrics.detected_before_payment_language}%`, icon: TimerReset },
    { label: "Test cases", value: String(benchmark.dataset_size), icon: Activity },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-zinc-950 text-white dark:border-zinc-800">
      <div className="flex flex-col gap-2 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold">Offline safety benchmark</h2>
          <p className="mt-1 text-xs text-zinc-400">English, Hindi and Hinglish deterministic evaluation</p>
        </div>
        <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase text-amber-300">
          Synthetic prototype benchmark
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-zinc-800 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-4">
            <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-[10px] font-semibold uppercase text-zinc-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-zinc-800 px-5 py-2 text-[10px] text-zinc-500">{benchmark.disclosure}</p>
    </section>
  );
}

