import { useEffect, useMemo, useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { SourceInfoPanel } from './components/SourceInfoPanel';
import { UploadField } from './components/UploadField';
import { createFlipbookComposer } from './lib/composite';
import { ensureFfmpegLoaded, extractFrames, resetFfmpeg, setFfmpegEventHandlers } from './lib/ffmpeg';
import { createOutputFileName, downloadBlob } from './lib/file';
import { buildSamplingTimestamps, deriveLayout, getValidGridOptions } from './lib/layout';
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
  const [logLines, setLogLines] = useState<string[]>([]);

  const layout = useMemo(() => deriveLayout(config), [config]);
  const downloadFileName = sourceFile ? createOutputFileName(sourceFile.name, config) : null;

  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result.objectUrl);
      }
    };
  }, [result]);

  useEffect(() => {
    const validGridOptions = getValidGridOptions(config.sheetSize);
    const hasCurrentOption = validGridOptions.some(
      (option) => option.columns === config.columns && option.rows === config.rows,
    );

    if (hasCurrentOption) {
      return;
    }

    const fallbackOption =
      validGridOptions.find((option) => option.columns === 8 && option.rows === 8) ??
      validGridOptions[0];

    if (!fallbackOption) {
      return;
    }

    setConfig((current) => ({
      ...current,
      columns: fallbackOption.columns,
      rows: fallbackOption.rows,
    }));
  }, [config.sheetSize, config.columns, config.rows]);

  async function handleFileSelect(file: File | null) {
    setError(null);
    setSourceFile(file);
    setSourceInfo(null);
    setProgress(IDLE_PROGRESS);
    setLogLines([]);

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
    setLogLines([]);

    let lastLogLine = '';

    try {
      let extractionProgressBase = 0;
      setFfmpegEventHandlers({
        onLog: (event) => {
          const trimmed = event.message.trim();
          if (!trimmed) {
            return;
          }

          lastLogLine = trimmed;
          setLogLines((current) => [...current.slice(-24), trimmed]);
        },
        onProgress: (event) => {
          if (progress.phase !== 'extracting-frames') {
            return;
          }

          setProgress((current) => {
            if (current.phase !== 'extracting-frames' || current.total === 0) {
              return current;
            }

            const nextCurrent = Math.min(extractionProgressBase + event.progress, current.total);
            return {
              ...current,
              current: nextCurrent,
              message: `Extracting source frames (${Math.min(
                Math.ceil(nextCurrent),
                current.total,
              )}/${current.total})...`,
            };
          });
        },
      });

      setProgress({
        phase: 'loading-engine',
        message: 'Loading processing engine...',
        current: 0,
        total: 0,
        indeterminate: true,
      });
      await ensureFfmpegLoaded();

      const timestamps = buildSamplingTimestamps(sourceInfo.durationSeconds, layout.totalFrames);
      const composer = createFlipbookComposer(config);

      setProgress({
        phase: 'extracting-frames',
        message: 'Processing frames...',
        current: 0,
        total: timestamps.length,
        indeterminate: false,
      });
      await extractFrames(
        sourceFile,
        timestamps,
        async (frame, index, total) => {
          await composer.addFrame(frame, index);
          setProgress({
            phase: 'extracting-frames',
            message: `Processing frames (${index + 1}/${total})...`,
            current: index + 1,
            total,
            indeterminate: false,
          });
        },
        (current, total) => {
        extractionProgressBase = current;
        setProgress({
          phase: 'extracting-frames',
          message: `Processing frames (${current}/${total})...`,
          current,
          total,
          indeterminate: false,
        });
        });

      setProgress({
        phase: 'compositing',
        message: 'Exporting flipbook PNG...',
        current: 0,
        total: 1,
        indeterminate: false,
      });
      const nextResult = await composer.finalize(layout.totalFrames);

      setResult(nextResult);
      setProgress({
        phase: 'complete',
        message: 'Flipbook ready for preview and download.',
        current: layout.totalFrames,
        total: layout.totalFrames,
        indeterminate: false,
      });
    } catch (generationError) {
      resetFfmpeg();

      const baseMessage =
        generationError instanceof Error
          ? generationError.message
          : 'Generation failed. Try a shorter clip or a smaller sheet size.';
      const detailedMessage = lastLogLine;
      const memoryHint =
        detailedMessage?.toLowerCase().includes('memory') ||
        detailedMessage?.toLowerCase().includes('allocation')
          ? ' The browser likely ran out of memory for this job.'
          : '';

      setError(
        detailedMessage && detailedMessage !== baseMessage
          ? `${baseMessage} Last FFmpeg log: ${detailedMessage}.${memoryHint}`
          : `${baseMessage}${memoryHint}`,
      );
      setProgress({
        phase: 'error',
        message: 'Generation failed.',
        current: 0,
        total: 0,
        indeterminate: false,
      });
    } finally {
      setFfmpegEventHandlers({});
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
          <ProgressPanel progress={progress} error={error} logLines={logLines} />
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
