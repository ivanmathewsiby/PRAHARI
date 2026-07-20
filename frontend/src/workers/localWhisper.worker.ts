import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

type WorkerRequest =
  | { type: "load" }
  | { type: "transcribe"; audio: Float32Array };

type Transcriber = (
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | string>;

let transcriberPromise: Promise<Transcriber> | null = null;
let activeDevice: "webgpu" | "wasm" = "wasm";

const post = (message: Record<string, unknown>) => self.postMessage(message);

async function createTranscriber(): Promise<Transcriber> {
  const createPipeline = pipeline as unknown as (
    task: string,
    model: string,
    options: Record<string, unknown>,
  ) => Promise<Transcriber>;

  const progressCallback = (progress: Record<string, unknown>) => {
    post({ type: "progress", progress });
  };

  if ("gpu" in navigator) {
    try {
      const result = await createPipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny",
        { device: "webgpu", dtype: "q4", progress_callback: progressCallback },
      );
      activeDevice = "webgpu";
      return result;
    } catch (error) {
      post({
        type: "fallback",
        message: error instanceof Error ? error.message : "WebGPU initialization failed",
      });
    }
  }

  activeDevice = "wasm";
  return createPipeline(
    "automatic-speech-recognition",
    "onnx-community/whisper-tiny",
    { device: "wasm", dtype: "q8", progress_callback: progressCallback },
  );
}

async function getTranscriber() {
  if (!transcriberPromise) transcriberPromise = createTranscriber();
  return transcriberPromise;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === "load") {
      await getTranscriber();
      post({ type: "ready", device: activeDevice });
      return;
    }

    const transcriber = await getTranscriber();
    post({ type: "transcribing", device: activeDevice });
    const output = await transcriber(event.data.audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      task: "transcribe",
    });
    const text = typeof output === "string" ? output : output.text || "";
    post({ type: "result", text: text.trim(), device: activeDevice });
  } catch (error) {
    transcriberPromise = null;
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Local transcription failed",
    });
  }
};

