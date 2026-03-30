import type { FlipbookConfig, GenerationResult } from '../types';
import { deriveLayout } from './layout';

type DrawFrameArgs = {
  context: CanvasRenderingContext2D;
  source: CanvasImageSource;
  x: number;
  y: number;
  cellSize: number;
  fitMode: FlipbookConfig['fitMode'];
};

export function calculateContainPlacement(
  sourceWidth: number,
  sourceHeight: number,
  cellSize: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(cellSize / sourceWidth, cellSize / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (cellSize - width) / 2,
    y: (cellSize - height) / 2,
    width,
    height,
  };
}

export function drawFrameToCell({ context, source, x, y, cellSize, fitMode }: DrawFrameArgs): void {
  if (fitMode === 'stretch') {
    context.drawImage(source, x, y, cellSize, cellSize);
    return;
  }

  const sourceWidth = getSourceWidth(source);
  const sourceHeight = getSourceHeight(source);
  const placement = calculateContainPlacement(sourceWidth, sourceHeight, cellSize);

  context.drawImage(source, x + placement.x, y + placement.y, placement.width, placement.height);
}

export async function composeFlipbook(
  frames: Blob[],
  config: FlipbookConfig,
  onProgress?: (current: number, total: number) => void,
): Promise<GenerationResult> {
  const layout = deriveLayout(config);

  if (!layout.isValid) {
    throw new Error(layout.validationMessage ?? 'Invalid flipbook layout.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = layout.outputWidth;
  canvas.height = layout.outputHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create a canvas rendering context.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const [index, frame] of frames.entries()) {
    const bitmap = await createImageBitmap(frame);
    const column = index % config.columns;
    const row = Math.floor(index / config.columns);
    const x = column * layout.cellSize;
    const y = row * layout.cellSize;

    drawFrameToCell({
      context,
      source: bitmap,
      x,
      y,
      cellSize: layout.cellSize,
      fitMode: config.fitMode,
    });

    bitmap.close();
    onProgress?.(index + 1, frames.length);
  }

  const blob = await canvasToBlob(canvas);
  const objectUrl = URL.createObjectURL(blob);

  return {
    blob,
    objectUrl,
    width: canvas.width,
    height: canvas.height,
    totalFrames: frames.length,
  };
}

export type FlipbookComposer = {
  addFrame: (frame: Blob, index: number) => Promise<void>;
  finalize: (totalFrames: number) => Promise<GenerationResult>;
};

export function createFlipbookComposer(config: FlipbookConfig): FlipbookComposer {
  const layout = deriveLayout(config);

  if (!layout.isValid) {
    throw new Error(layout.validationMessage ?? 'Invalid flipbook layout.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = layout.outputWidth;
  canvas.height = layout.outputHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create a canvas rendering context.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  return {
    async addFrame(frame: Blob, index: number) {
      const bitmap = await createImageBitmap(frame);
      const column = index % config.columns;
      const row = Math.floor(index / config.columns);
      const x = column * layout.cellSize;
      const y = row * layout.cellSize;

      drawFrameToCell({
        context,
        source: bitmap,
        x,
        y,
        cellSize: layout.cellSize,
        fitMode: config.fitMode,
      });

      bitmap.close();
    },
    async finalize(totalFrames: number) {
      const blob = await canvasToBlob(canvas);
      const objectUrl = URL.createObjectURL(blob);

      return {
        blob,
        objectUrl,
        width: canvas.width,
        height: canvas.height,
        totalFrames,
      };
    },
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export the flipbook PNG.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function getSourceWidth(source: CanvasImageSource): number {
  if (source instanceof ImageBitmap) {
    return source.width;
  }

  if (source instanceof HTMLVideoElement) {
    return source.videoWidth;
  }

  if (source instanceof HTMLImageElement) {
    return source.naturalWidth || source.width;
  }

  if (source instanceof HTMLCanvasElement) {
    return source.width;
  }

  if (source instanceof OffscreenCanvas) {
    return source.width;
  }

  return (source as VideoFrame).displayWidth;
}

function getSourceHeight(source: CanvasImageSource): number {
  if (source instanceof ImageBitmap) {
    return source.height;
  }

  if (source instanceof HTMLVideoElement) {
    return source.videoHeight;
  }

  if (source instanceof HTMLImageElement) {
    return source.naturalHeight || source.height;
  }

  if (source instanceof HTMLCanvasElement) {
    return source.height;
  }

  if (source instanceof OffscreenCanvas) {
    return source.height;
  }

  return (source as VideoFrame).displayHeight;
}
