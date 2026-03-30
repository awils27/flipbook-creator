import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const CORE_VERSION = '0.12.10';
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();

      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return loadPromise;
}

export async function ensureFfmpegLoaded(): Promise<void> {
  await getFFmpeg();
}

export async function extractFrames(
  file: File,
  timestamps: number[],
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
      outputFrames.push(new Blob([bytes], { type: 'image/png' }));
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
