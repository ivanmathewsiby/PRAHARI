"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Cloud,
  Cpu,
  Download,
  LoaderCircle,
  Mic,
  MicOff,
  ShieldCheck,
} from "lucide-react";
import { INDIAN_SPEECH_LANGUAGES } from "../lib/indianSpeechLanguages";

export type CaptureState = "idle" | "loading" | "ready" | "recording" | "transcribing" | "error";
type SpeechEngine = "browser" | "whisper";

export interface SpeechPrivacyStatus {
  modelState: string;
  audioStored: boolean;
  analysisLocation: "Browser service" | "On device";
  speechMayLeaveDevice: boolean;
  captureState: CaptureState;
}

interface LocalWhisperCaptureProps {
  transcript: string;
  onTranscript: (text: string) => void;
  onPrivacyStatus: (status: SpeechPrivacyStatus) => void;
}

interface BrowserSpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<BrowserSpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechConstructor = new () => BrowserSpeechRecognition;

const getBrowserSpeechConstructor = () => {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechConstructor;
    webkitSpeechRecognition?: BrowserSpeechConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
};

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
  const [engine, setEngine] = useState<SpeechEngine>("browser");
  const [languageCode, setLanguageCode] = useState("en");
  const [browserSupported, setBrowserSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<CaptureState>("ready");
  const [progress, setProgress] = useState(0);
  const [device, setDevice] = useState<"webgpu" | "wasm" | null>(null);
  const [message, setMessage] = useState("Instant English transcription. Your browser may process audio online.");
  const workerRef = useRef<Worker | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const transcriptRef = useRef(transcript);
  const browserBaseTranscriptRef = useRef("");
  const whisperIntervalRef = useRef<number | null>(null);
  const whisperStreamingRef = useRef(false);
  const selectedLanguage = INDIAN_SPEECH_LANGUAGES.find((item) => item.code === languageCode)
    || INDIAN_SPEECH_LANGUAGES[0];

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const supported = Boolean(getBrowserSpeechConstructor());
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setBrowserSupported(supported);
      if (!supported) {
        setEngine("whisper");
        setState("idle");
        setMessage("Browser speech is unavailable. Prepare private offline Whisper instead.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (whisperIntervalRef.current) window.clearInterval(whisperIntervalRef.current);
      workerRef.current?.terminate();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void contextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const browserEngine = engine === "browser";
    onPrivacyStatus({
      modelState: browserEngine
        ? `Browser speech recognition (${selectedLanguage.name})`
        : device
          ? `Whisper ${selectedLanguage.name} on ${device.toUpperCase()}`
          : `Whisper ${selectedLanguage.name} ${state}`,
      audioStored: state === "recording" || state === "transcribing",
      analysisLocation: browserEngine ? "Browser service" : "On device",
      speechMayLeaveDevice: browserEngine,
      captureState: state,
    });
  }, [device, engine, onPrivacyStatus, selectedLanguage.name, state]);

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
        setMessage(selectedLanguage.whisperCode
          ? `Ready for ${selectedLanguage.name}. Audio stays on this device.`
          : `${selectedLanguage.name} is not explicitly supported by stock Whisper; private auto-detection will be best effort.`);
      } else if (type === "transcribing") {
        const streaming = Boolean(event.data.stream);
        if (!streaming) setState("transcribing");
        setDevice(event.data.device === "webgpu" ? "webgpu" : "wasm");
        setMessage(streaming
          ? "Checking the latest private audio segment on this device."
          : "Transcribing locally. Nothing has been uploaded.");
      } else if (type === "result") {
        const text = String(event.data.text || "").trim();
        const streaming = Boolean(event.data.stream);
        if (text) {
          const merged = [transcriptRef.current.trim(), text].filter(Boolean).join(" ");
          transcriptRef.current = merged;
          onTranscript(merged);
        }
        if (streaming && whisperStreamingRef.current) {
          setState("recording");
          setMessage(text
            ? "Listening privately. New words are being checked live."
            : "Listening privately. No clear speech in the last segment.");
        } else {
          setState("ready");
          setMessage(text ? "Local transcript ready." : "No clear speech was detected. Try again closer to the phone.");
        }
      } else if (type === "error") {
        chunksRef.current = [];
        setState("error");
        setMessage(String(event.data.message || "Local transcription failed."));
      }
    };
    workerRef.current = worker;
    return worker;
  };

  const stopActiveCapture = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    whisperStreamingRef.current = false;
    if (whisperIntervalRef.current) window.clearInterval(whisperIntervalRef.current);
    whisperIntervalRef.current = null;
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
    processorRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    chunksRef.current = [];
  };

  const selectEngine = (nextEngine: SpeechEngine) => {
    if (nextEngine === engine || (nextEngine === "browser" && !browserSupported)) return;
    stopActiveCapture();
    setEngine(nextEngine);
    if (nextEngine === "browser") {
      setState("ready");
      setMessage(`Instant ${selectedLanguage.name} transcription. Your browser may process audio online.`);
    } else {
      setState(device ? "ready" : "idle");
      setMessage(device
        ? "Offline Whisper is ready. Audio stays on this device."
        : "Load offline Whisper once for private Hindi, Hinglish, and English transcription.");
    }
  };

  const startBrowserCapture = () => {
    const SpeechRecognition = getBrowserSpeechConstructor();
    if (!SpeechRecognition) {
      selectEngine("whisper");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage.bcp47;
    browserBaseTranscriptRef.current = transcriptRef.current.trim();
    recognition.onresult = (event) => {
      let recognized = "";
      for (let index = 0; index < event.results.length; index += 1) {
        recognized += `${event.results[index][0]?.transcript || ""} `;
      }
    const merged = [browserBaseTranscriptRef.current, recognized.trim()].filter(Boolean).join(" ");
      if (merged) {
        transcriptRef.current = merged;
        onTranscript(merged);
      }
    };
    recognition.onerror = (event) => {
      setState("error");
      setMessage(event.error === "not-allowed"
        ? "Microphone permission was not granted. Paste mode remains available."
        : "Browser speech stopped. Try again or use offline Whisper.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setState((current) => current === "error" ? current : "ready");
      setMessage(`${selectedLanguage.name} transcript ready. Browser speech may have used an online service.`);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
    setMessage(`Listening in ${selectedLanguage.name}. Audio may be processed by your browser's speech service.`);
  };

  const loadModel = () => {
    setState("loading");
    setProgress(0);
    setMessage("Preparing the private speech model...");
    ensureWorker().postMessage({ type: "load" });
  };

  const transcribeWhisperSegment = (streaming: boolean) => {
    const context = contextRef.current;
    if (!context || chunksRef.current.length === 0) return false;

    const chunks = chunksRef.current;
    chunksRef.current = [];
    const audio = mergeAndResample(chunks, context.sampleRate || 48_000);
    if (audio.length < 8_000) return false;

    if (!streaming) setState("transcribing");
    ensureWorker().postMessage({
      type: "transcribe",
      audio,
      language: selectedLanguage.whisperCode || undefined,
      stream: streaming,
    }, [audio.buffer]);
    return true;
  };

  const startWhisperCapture = async () => {
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
      whisperStreamingRef.current = true;
      whisperIntervalRef.current = window.setInterval(() => {
        if (whisperStreamingRef.current) transcribeWhisperSegment(true);
      }, 8_000);
      setState("recording");
      setMessage("Listening privately. New speech is checked on this device every few seconds.");
    } catch {
      setState("error");
      setMessage("Microphone permission was not granted. Paste mode remains available.");
    }
  };

  const stopWhisperCapture = () => {
    const context = contextRef.current;
    whisperStreamingRef.current = false;
    if (whisperIntervalRef.current) window.clearInterval(whisperIntervalRef.current);
    whisperIntervalRef.current = null;
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const queuedFinalSegment = transcribeWhisperSegment(false);
    void context?.close();
    contextRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    if (!queuedFinalSegment) {
      setState("ready");
      setMessage(transcriptRef.current.trim()
        ? "Private live listening stopped."
        : "No clear speech was detected. Try again closer to the phone.");
    }
  };

  const primaryAction = () => {
    if (engine === "browser") {
      if (state === "recording") recognitionRef.current?.stop();
      else startBrowserCapture();
      return;
    }
    if (state === "idle" || state === "error") loadModel();
    else if (state === "ready") void startWhisperCapture();
    else if (state === "recording") stopWhisperCapture();
  };

  const busy = state === "loading" || state === "transcribing";
  const buttonLabel = engine === "browser"
    ? state === "recording" ? "Stop listening" : `Start ${selectedLanguage.name}`
    : state === "idle" || state === "error"
      ? "Prepare offline Whisper"
      : state === "recording"
        ? "Stop private listening"
        : state === "ready"
          ? "Start private capture"
          : state === "loading"
            ? "Loading local model"
            : "Transcribing locally";

  return (
    <div className="border-t border-gray-200 pt-5 dark:border-zinc-800">
      <label className="mb-4 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
        Spoken language
        <select
          value={languageCode}
          onChange={(event) => {
            const next = INDIAN_SPEECH_LANGUAGES.find((item) => item.code === event.target.value)
              || INDIAN_SPEECH_LANGUAGES[0];
            setLanguageCode(next.code);
            setMessage(engine === "browser"
              ? `${next.name} selected. Availability depends on your browser's speech service.`
              : next.whisperCode
                ? `${next.name} selected for private offline transcription.`
                : `${next.name} has no stock Whisper language token; offline transcription uses best-effort auto-detection.`);
          }}
          disabled={state === "recording" || busy}
          className="mt-1.5 w-full rounded-lg border border-gray-250 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          {INDIAN_SPEECH_LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.nativeName} ({item.name})
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-zinc-900" aria-label="Speech recognition engine">
        <button
          type="button"
          onClick={() => selectEngine("browser")}
          disabled={browserSupported === false}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition ${engine === "browser" ? "bg-white text-indigo-700 shadow-sm dark:bg-zinc-800 dark:text-indigo-300" : "text-gray-600 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-white"}`}
        >
          <Cloud className="h-4 w-4" />
          Fast mode
        </button>
        <button
          type="button"
          onClick={() => selectEngine("whisper")}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition ${engine === "whisper" ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-300" : "text-gray-600 hover:text-gray-950 dark:text-zinc-400 dark:hover:text-white"}`}
        >
          <ShieldCheck className="h-4 w-4" />
          Private mode
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-lg">
          <div className="flex items-center gap-2">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${state === "recording" ? "bg-red-100 text-red-600 dark:bg-red-950/40" : engine === "whisper" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"}`}>
              {state === "recording" ? <Mic className="h-4 w-4" /> : engine === "whisper" ? <Cpu className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                {engine === "whisper" ? "Private listening" : "Fast listening"}
              </h3>
              <p className={`text-[11px] font-semibold uppercase ${engine === "whisper" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                {engine === "whisper"
                  ? selectedLanguage.whisperCode
                    ? device ? "Works privately on this device" : "Strict privacy mode"
                    : "Private best-effort auto-detect"
                  : `${selectedLanguage.name} · internet may be used`}
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
          disabled={busy || browserSupported === null}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70 ${state === "recording" ? "bg-red-600 hover:bg-red-700" : engine === "whisper" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-indigo-600 hover:bg-indigo-700"}`}
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : state === "recording" ? <MicOff className="h-4 w-4" /> : engine === "whisper" && !device ? <Download className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {buttonLabel}
        </button>
      </div>
      <div className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-3 text-[11px] font-medium leading-relaxed text-gray-500 dark:border-zinc-850 dark:text-zinc-500">
        <ShieldCheck className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${engine === "whisper" ? "text-emerald-600" : "text-amber-600"}`} />
        {engine === "whisper"
          ? selectedLanguage.whisperCode
            ? "The model may download once. Audio stays in volatile memory and is discarded after transcription."
            : "Audio remains local, but stock Whisper does not explicitly support this language. Accuracy may be limited."
          : "No PRAHARI evidence is uploaded, but the browser vendor may process microphone audio online."}
      </div>
    </div>
  );
}
