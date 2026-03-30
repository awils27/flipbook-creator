import { useEffect, useMemo, useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { SourceInfoPanel } from './components/SourceInfoPanel';
import { UploadField } from './components/UploadField';
import { composeFlipbook } from './lib/composite';
import { ensureFfmpegLoaded, extractFrames } from './lib/ffmpeg';
import { createOutputFileName, downloadBlob } from './lib/file';
import { buildSamplingTimestamps, deriveLayout } from './lib/layout';
import { readSourceVideoInfo } from './lib/video';
import type { FlipbookConfig, GenerationResult, ProgressState, SourceVideoInfo } from './types';

const DEFAULT_CONFIG: FlipbookConfig = {
  sheetSize: 1024,
  columns: 8,
  rows: 8,
  fitMode: 'contain',
};

const IDLE_PROGRESS: ProgressState = {
  phase: 'idle',
  message: 'Upload a video and generate a flipbook PNG.',
  current: 0,
  total: 0,
};

export default function App() {
  const [config, setConfig] = useState<FlipbookConfig>(DEFAULT_CONFIG);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceVideoInfo | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [progress, setProgress] = useState<ProgressState>(IDLE_PROGRESS);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const layout = useMemo(() => deriveLayout(config), [config]);
  const downloadFileName = sourceFile ? createOutputFileName(sourceFile.name, config) : null;

  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result.objectUrl);
      }
    };
  }, [result]);

  async function handleFileSelect(file: File | null) {
    setError(null);
    setSourceFile(file);
    setSourceInfo(null);
    setProgress(IDLE_PROGRESS);

    if (result) {
      URL.revokeObjectURL(result.objectUrl);
      setResult(null);
    }

    if (!file) {
      return;
    }

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.');
      setSourceFile(null);
      return;
    }

    try {
      setProgress({
        phase: 'reading-video',
        message: 'Reading source video metadata...',
        current: 0,
        total: 0,
      });
      const metadata = await readSourceVideoInfo(file);
      setSourceInfo(metadata);
      setProgress(IDLE_PROGRESS);
    } catch (metadataError) {
      setError(
        metadataError instanceof Error ? metadataError.message : 'Unable to inspect the selected video.',
      );
      setProgress({
        phase: 'error',
        message: 'Metadata read failed.',
        current: 0,
        total: 0,
      });
    }
  }

  async function handleGenerate() {
    if (!sourceFile || !sourceInfo?.durationSeconds || !layout.isValid) {
      return;
    }

    if (result) {
      URL.revokeObjectURL(result.objectUrl);
      setResult(null);
    }

    setIsGenerating(true);
    setError(null);

    try {
      setProgress({
        phase: 'loading-engine',
        message: 'Loading processing engine...',
        current: 0,
        total: 0,
      });
      await ensureFfmpegLoaded();

      const timestamps = buildSamplingTimestamps(sourceInfo.durationSeconds, layout.totalFrames);

      setProgress({
        phase: 'extracting-frames',
        message: 'Extracting source frames...',
        current: 0,
        total: timestamps.length,
      });
      const frames = await extractFrames(sourceFile, timestamps, (current, total) => {
        setProgress({
          phase: 'extracting-frames',
          message: `Extracting source frames (${current}/${total})...`,
          current,
          total,
        });
      });

      setProgress({
        phase: 'compositing',
        message: 'Compositing flipbook sheet...',
        current: 0,
        total: frames.length,
      });
      const nextResult = await composeFlipbook(frames, config, (current, total) => {
        setProgress({
          phase: 'compositing',
          message: `Compositing flipbook sheet (${current}/${total})...`,
          current,
          total,
        });
      });

      setResult(nextResult);
      setProgress({
        phase: 'complete',
        message: 'Flipbook ready for preview and download.',
        current: layout.totalFrames,
        total: layout.totalFrames,
      });
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Generation failed. Try a shorter clip or a smaller sheet size.',
      );
      setProgress({
        phase: 'error',
        message: 'Generation failed.',
        current: 0,
        total: 0,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownload() {
    if (!result || !downloadFileName) {
      return;
    }

    downloadBlob(result.blob, downloadFileName);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Browser-based VFX texture tooling</p>
          <h1>Flipbook sheets from video, without leaving the browser.</h1>
          <p className="hero__lede">
            Upload a clip, pick a power-of-two texture size and grid, then export a marginless PNG
            contact sheet for engine-side flipbook playback.
          </p>
        </div>
      </section>

      <section className="workspace">
        <div className="workspace__left">
          <section className="panel">
            <div className="panel__header">
              <h2>Upload</h2>
              <p>Everything runs locally. GitHub Pages hosting stays viable because there is no backend.</p>
            </div>
            <UploadField onFileSelect={handleFileSelect} disabled={isGenerating} />
          </section>

          <SourceInfoPanel sourceInfo={sourceInfo} />
          <ConfigPanel config={config} layout={layout} disabled={isGenerating} onChange={setConfig} />

          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              disabled={!sourceFile || !sourceInfo?.durationSeconds || !layout.isValid || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? 'Generating...' : 'Generate Flipbook'}
            </button>
          </div>
        </div>

        <div className="workspace__right">
          <ProgressPanel progress={progress} error={error} />
          <PreviewPanel
            result={result}
            downloadFileName={downloadFileName}
            onDownload={handleDownload}
          />
        </div>
      </section>
    </main>
  );
}
