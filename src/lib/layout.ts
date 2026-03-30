import type { DerivedLayout, FlipbookConfig } from '../types';

export function deriveLayout(config: FlipbookConfig): DerivedLayout {
  const { sheetSize, columns, rows } = config;

  if (!Number.isInteger(columns) || columns <= 0) {
    return invalidLayout('Columns must be a positive integer.');
  }

  if (!Number.isInteger(rows) || rows <= 0) {
    return invalidLayout('Rows must be a positive integer.');
  }

  if (sheetSize % columns !== 0 || sheetSize % rows !== 0) {
    return invalidLayout('Sheet size must divide evenly by both columns and rows.');
  }

  const cellWidth = sheetSize / columns;
  const cellHeight = sheetSize / rows;

  if (cellWidth !== cellHeight) {
    return invalidLayout('The chosen grid does not produce square cells.');
  }

  return {
    totalFrames: columns * rows,
    cellSize: cellWidth,
    outputWidth: sheetSize,
    outputHeight: sheetSize,
    isValid: true,
  };
}

export function buildSamplingTimestamps(durationSeconds: number, frameCount: number): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Duration must be a positive number.');
  }

  if (!Number.isInteger(frameCount) || frameCount <= 0) {
    throw new Error('Frame count must be a positive integer.');
  }

  const maxTimestamp = Math.max(durationSeconds - 0.001, 0);

  return Array.from({ length: frameCount }, (_, index) => {
    const timestamp = ((index + 0.5) / frameCount) * durationSeconds;
    return Math.min(timestamp, maxTimestamp);
  });
}

function invalidLayout(message: string): DerivedLayout {
  return {
    totalFrames: 0,
    cellSize: 0,
    outputWidth: 0,
    outputHeight: 0,
    isValid: false,
    validationMessage: message,
  };
}
