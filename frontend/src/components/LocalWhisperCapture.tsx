"use client";

import React, { useEffect, useRef, useState } from "react";
import { Cpu, Download, LoaderCircle, Mic, MicOff, ShieldCheck } from "lucide-react";

type CaptureState = "idle" | "loading" | "ready" | "recording" | "transcribing" | "error";

interface LocalWhisperCaptureProps {
  transcript: string;
  onTranscript: (text: string) => void;
  onPrivacyStatus: (status: { modelState: string; audioStored: boolean }) => void;
}

const mergeAndResample = (chunks: Float32Array[], inputRate: number) => {
  const inputLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const input = new Float32Array(inputLength);
  let cursor = 0;
  chunks.forEach((chunk) => {
    input.set(chunk, cursor);
    cursor += chunk.length;
  });

  if (inputRate === 16_000) return input;
  const ratio = inputRate / 16_000;
  const output = new Float32Array(Math.max(1, Math.round(input.length / ratio)));
  for (let index = 0; index < output.length; index += 1) {
    const position = index * ratio;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, input.length - 1);
    const weight = position - lower;
    output[index] = input[lower] * (1 - weight) + input[upper] * weight;
  }
  return output;
};

export function LocalWhisperCapture({
  transcript,
  onTranscript,
  onPrivacyStatus,
}: LocalWhisperCaptureProps) {
  const [state, setState] = useState<CaptureState>("idle");
  const [progress, setProgress] = useState(0);
  const [device, setDevice] = useState<"webgpu" | "wasm" | null>(null);
  const [message, setMessage] = useState("Model loads once and is cached by your browser.");
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const transcriptRef = useRef(transcript);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void contextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    onPrivacyStatus({
      modelState: device ? `Whisper ready on ${device.toUpperCase()}` : state,
      audioStored: state === "recording" || state === "transcribing",
    });
  }, [device, onPrivacyStatus, state]);

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../workers/localWhisper.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
      const type = event.data.type;
      if (type === "progress") {
        const detail = event.data.progress as Record<string, unknown> | undefined;
        const rawProgress = Number(detail?.progress || 0);
        if (Number.isFinite(rawProgress)) setProgress(Math.round(rawProgress));
        setMessage("Downloading the speech model only. No microphone audio is uploaded.");
      } else if (type === "fallback") {
        setMessage("WebGPU unavailable. Using the private CPU fallback.");
      } else if (type === "ready") {
        setDevice(event.data.device === "webgpu" ? "webgpu" : "wasm");
        setState("ready");
        setProgress(100);
        setMessage("Ready. Audio stays in this browser and is discarded after transcription.");
      } else if (type === "transcribing") {
        setState("transcribing");
        setDevice(event.data.device === "webgpu" ? "webgpu" : "wasm");
        setMessage("Transcribing locally. Nothing has been uploaded.");
      } else if (type === "result") {
        const text = String(event.data.text || "").trim();
        if (text) onTranscript([transcriptRef.current.trim(), text].filter(Boolean).join(" "));
        chunksRef.current = [];
        setState("ready");
        setMessage(text ? "Local transcript ready." : "No clear speech was detected. Try again closer to the speaker.");
      } else if (type === "error") {
        chunksRef.current = [];
        setState("error");
        setMessage(String(event.data.message || "Local transcription failed."));
      }
    };
    workerRef.current = worker;
    return worker;
  };

  const loadModel = () => {
    setState("loading");
    setProgress(0);
    setMessage("Preparing the private speech model...");
    ensureWorker().postMessage({ type: "load" });
  };

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      processor.onaudioprocess = (event) => {
        chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(context.destination);
      streamRef.current = stream;
      contextRef.current = context;
      processorRef.current = processor;
      setState("recording");
      setMessage("Listening locally. Put the suspicious call on speaker.");
    } catch {
      setState("error");
      setMessage("Microphone permission was not granted. Paste mode remains available.");
    }
  };

  const stopCapture = () => {
    const context = contextRef.current;
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const audio = mergeAndResample(chunksRef.current, context?.sampleRate || 48_000);
    void context?.close();
    contextRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    if (audio.length < 8_000) {
      chunksRef.current = [];
      setState("ready");
      setMessage("Capture at least half a second of speech.");
      return;
    }
    setState("transcribing");
    ensureWorker().postMessage({ type: "transcribe", audio }, [audio.buffer]);
  };

  const primaryAction = () => {
    if (state === "idle" || state === "error") loadModel();
    else if (state === "ready") void startCapture();
    else if (state === "recording") stopCapture();
  };

  const busy = state === "loading" || state === "transcribing";
  const buttonLabel = state === "idle" || state === "error"
    ? "Prepare private audio"
    : state === "recording"
      ? "Stop and transcribe"
      : state === "ready"
        ? "Start private capture"
        : state === "loading"
          ? "Loading local model"
          : "Transcribing locally";

  return (
    <div className="rounded-xl border border-gray-250 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-lg">
          <div className="flex items-center gap-2">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${state === "recording" ? "bg-red-100 text-red-600 dark:bg-red-950/40" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>
              {state === "recording" ? <Mic className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">On-device Whisper shield</h3>
              <p className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                {device ? `${device.toUpperCase()} inference` : "Audio never sent to a server"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">{message}</p>
          {state === "loading" && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.max(progress, 4)}%` }} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={primaryAction}
          disabled={busy}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70 ${state === "recording" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-700 hover:bg-emerald-800"}`}
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : state === "recording" ? <MicOff className="h-4 w-4" /> : state === "idle" || state === "error" ? <Download className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {buttonLabel}
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-[11px] font-medium text-gray-500 dark:border-zinc-850 dark:text-zinc-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        The model file may download once. Captured audio remains in volatile memory and is discarded after transcription.
      </div>
    </div>
  );
}
