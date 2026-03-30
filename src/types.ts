export type FitMode = 'contain' | 'stretch';

export type FlipbookSheetSize = 256 | 512 | 1024 | 2048 | 4096;

export type FlipbookConfig = {
  sheetSize: FlipbookSheetSize;
  columns: number;
  rows: number;
  fitMode: FitMode;
};

export type SourceVideoInfo = {
  name: string;
  sizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  mimeType: string;
};

export type DerivedLayout = {
  totalFrames: number;
  cellSize: number;
  outputWidth: number;
  outputHeight: number;
  isValid: boolean;
  validationMessage?: string;
};

export type GenerationResult = {
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  totalFrames: number;
};

export type ProgressState = {
  phase:
    | 'idle'
    | 'loading-engine'
    | 'reading-video'
    | 'extracting-frames'
    | 'compositing'
    | 'complete'
    | 'error';
  message: string;
  current: number;
  total: number;
};
