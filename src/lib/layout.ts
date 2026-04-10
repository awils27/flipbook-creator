import type { DerivedLayout, FlipbookConfig } from '../types';

export type GridOption = {
  columns: number;
  rows: number;
  label: string;
};

export function deriveLayout(config: FlipbookConfig): DerivedLayout {
  const { sheetWidth, sheetHeight, columns, rows } = config;

  if (!Number.isInteger(columns) || columns <= 0) {
    return invalidLayout('Columns must be a positive integer.');
  }

  if (!Number.isInteger(rows) || rows <= 0) {
    return invalidLayout('Rows must be a positive integer.');
  }

  if (sheetWidth % columns !== 0 || sheetHeight % rows !== 0) {
    return invalidLayout('Sheet width and height must divide evenly by the chosen grid.');
  }

  if (columns !== rows) {
    return invalidLayout('Columns and rows must match so cells keep the sheet aspect ratio.');
  }

  const cellWidth = sheetWidth / columns;
  const cellHeight = sheetHeight / rows;

  if (cellWidth * sheetHeight !== cellHeight * sheetWidth) {
    return invalidLayout('The chosen grid does not preserve the sheet aspect ratio per cell.');
  }

  return {
    totalFrames: columns * rows,
    cellWidth,
    cellHeight,
    outputWidth: sheetWidth,
    outputHeight: sheetHeight,
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

export function getValidGridOptions(sheetWidth: number, sheetHeight: number): GridOption[] {
  const options: GridOption[] = [];
  const maxDivisor = Math.min(sheetWidth, sheetHeight);

  for (let divisor = 1; divisor <= maxDivisor; divisor += 1) {
    if (sheetWidth % divisor !== 0 || sheetHeight % divisor !== 0) {
      continue;
    }

    options.push({
      columns: divisor,
      rows: divisor,
      label: `${divisor} x ${divisor} (${sheetWidth / divisor} x ${sheetHeight / divisor}px cells)`,
    });
  }

  return options;
}

function invalidLayout(message: string): DerivedLayout {
  return {
    totalFrames: 0,
    cellWidth: 0,
    cellHeight: 0,
    outputWidth: 0,
    outputHeight: 0,
    isValid: false,
    validationMessage: message,
  };
}
