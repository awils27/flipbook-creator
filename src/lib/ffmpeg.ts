import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import classWorkerURL from '@ffmpeg/ffmpeg/worker?url';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import type { FlipbookConfig } from '../types';
import { deriveLayout } from './layout';

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
  config: FlipbookConfig,
  onFrame?: (frame: Blob, index: number, total: number) => Promise<void> | void,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob[]> {
  const ffmpeg = await getFFmpeg();
  const inputName = `input${getFileExtension(file.name) || '.mp4'}`;
  const layout = deriveLayout(config);

  if (!layout.isValid) {
    throw new Error(layout.validationMessage ?? 'Invalid flipbook layout.');
  }

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  try {
    const outputFrames: Blob[] = [];
    const framePattern = 'frame-%05d.png';
    const filter = buildBatchFilter(timestamps, layout.cellSize, config.fitMode);
    const exitCode = await ffmpeg.exec([
      '-i',
      inputName,
      '-map',
      '0:v:0',
      '-vf',
      filter,
      '-frames:v',
      String(timestamps.length),
      '-start_number',
      '0',
      '-pix_fmt',
      'rgba',
      '-an',
      '-sn',
      '-dn',
      framePattern,
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg failed to extract ${timestamps.length} frames (exit code ${exitCode}).`);
    }

    for (const [index] of timestamps.entries()) {
      const frameName = `frame-${index.toString().padStart(5, '0')}.png`;
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

function buildFrameFilter(cellSize: number, fitMode: FlipbookConfig['fitMode']): string {
  if (fitMode === 'stretch') {
    return `scale=${cellSize}:${cellSize}:flags=lanczos`;
  }

  return [
    `scale=${cellSize}:${cellSize}:force_original_aspect_ratio=decrease:flags=lanczos`,
    `pad=${cellSize}:${cellSize}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
  ].join(',');
}

function buildBatchFilter(
  timestamps: number[],
  cellSize: number,
  fitMode: FlipbookConfig['fitMode'],
): string {
  if (timestamps.length === 0) {
    throw new Error('At least one timestamp is required.');
  }

  const intervalSeconds =
    timestamps.length > 1 ? timestamps[1] - timestamps[0] : Math.max(timestamps[0] * 2, 0.001);
  const firstSampleSeconds = Math.max(intervalSeconds / 2, 0);
  const fps = 1 / Math.max(intervalSeconds, 0.001);

  return [
    `fps=${fps}:start_time=${firstSampleSeconds}:round=near`,
    buildFrameFilter(cellSize, fitMode),
  ].join(',');
}
