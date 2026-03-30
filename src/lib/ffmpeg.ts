import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import classWorkerURL from '@ffmpeg/ffmpeg/worker?url';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

type FfmpegLogEvent = {
  type: string;
  message: string;
};

type FfmpegProgressEvent = {
  progress: number;
  time: number;
};

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let logListener: ((event: FfmpegLogEvent) => void) | null = null;
let progressListener: ((event: FfmpegProgressEvent) => void) | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', (event) => {
        logListener?.(event);
      });

      ffmpeg.on('progress', (event) => {
        progressListener?.(event);
      });

      try {
        await ffmpeg.load({
          classWorkerURL,
          coreURL,
          wasmURL,
        });

        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (error) {
        loadPromise = null;
        throw error;
      }
    })();
  }

  return loadPromise;
}

export async function ensureFfmpegLoaded(): Promise<void> {
  await getFFmpeg();
}

export function resetFfmpeg(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
  }

  ffmpegInstance = null;
  loadPromise = null;
}

export function setFfmpegEventHandlers(handlers: {
  onLog?: ((event: FfmpegLogEvent) => void) | null;
  onProgress?: ((event: FfmpegProgressEvent) => void) | null;
}): void {
  logListener = handlers.onLog ?? null;
  progressListener = handlers.onProgress ?? null;
}

export async function extractFrames(
  file: File,
  timestamps: number[],
  onFrame?: (frame: Blob, index: number, total: number) => Promise<void> | void,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob[]> {
  const ffmpeg = await getFFmpeg();
  const inputName = `input${getFileExtension(file.name) || '.mp4'}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  try {
    const outputFrames: Blob[] = [];

    for (const [index, timestamp] of timestamps.entries()) {
      const frameName = `frame-${index}.png`;
      await ffmpeg.exec([
        '-ss',
        timestamp.toFixed(3),
        '-i',
        inputName,
        '-frames:v',
        '1',
        '-f',
        'image2',
        '-vcodec',
        'png',
        frameName,
      ]);

      const data = await ffmpeg.readFile(frameName);

      if (!(data instanceof Uint8Array)) {
        throw new Error(`FFmpeg returned an unexpected output type for ${frameName}.`);
      }

      const bytes = new Uint8Array(data);
      const frameBlob = new Blob([bytes], { type: 'image/png' });
      if (onFrame) {
        await onFrame(frameBlob, index, timestamps.length);
      } else {
        outputFrames.push(frameBlob);
      }
      await safeDelete(ffmpeg, frameName);
      onProgress?.(index + 1, timestamps.length);
    }

    return outputFrames;
  } finally {
    await safeDelete(ffmpeg, inputName);
  }
}

async function safeDelete(ffmpeg: FFmpeg, fileName: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(fileName);
  } catch {
    // Ignore cleanup failures in the in-memory filesystem.
  }
}

function getFileExtension(fileName: string): string {
  const match = /\.[^.]+$/.exec(fileName);
  return match?.[0] ?? '';
}
