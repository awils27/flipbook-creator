import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { SourceInfoPanel } from './components/SourceInfoPanel';
import { UploadField } from './components/UploadField';
import { createFlipbookComposer } from './lib/composite';
import {
  ensureFfmpegLoaded,
  extractFrames,
  resetFfmpeg,
  setFfmpegEventHandlers,
} from './lib/ffmpeg';
import { createOutputFileName, downloadBlob } from './lib/file';
import { buildSamplingTimestamps, deriveLayout, getValidGridOptions } from './lib/layout';
import { readSourceVideoInfo } from './lib/video';
import type { FlipbookConfig, GenerationResult, ProgressState, SourceVideoInfo } from './types';

const DEFAULT_CONFIG: FlipbookConfig = {
  sheetSize: 1024,
  columns: 8,
  rows: 8,
  fitMode: 'stretch',
};

const IDLE_PROGRESS: ProgressState = {
  phase: 'idle',
  message: 'Upload a video and generate a flipbook PNG.',
  current: 0,
  total: 0,
};

const DEFAULT_ESTIMATED_SOURCE_FPS = 30;

export default function App() {
  const [config, setConfig] = useState<FlipbookConfig>(DEFAULT_CONFIG);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceVideoInfo | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [progress, setProgress] = useState<ProgressState>(IDLE_PROGRESS);
  const [error, setError] = useState<string | null>(null);
  const [isInspectingSource, setIsInspectingSource] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const sourceInspectionRequestId = useRef(0);

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
    const requestId = sourceInspectionRequestId.current + 1;
    sourceInspectionRequestId.current = requestId;

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
      setIsInspectingSource(true);
      setProgress({
        phase: 'reading-video',
        message: 'Reading source video metadata...',
        current: 0,
        total: 0,
      });
      const metadata = await readSourceVideoInfo(file);
      const estimatedFrameCount =
        metadata.durationSeconds !== null
          ? Math.max(1, Math.round(metadata.durationSeconds * DEFAULT_ESTIMATED_SOURCE_FPS))
          : null;

      if (sourceInspectionRequestId.current !== requestId) {
        return;
      }

      setSourceInfo({
        ...metadata,
        frameCount: estimatedFrameCount,
        frameRate: DEFAULT_ESTIMATED_SOURCE_FPS,
      });

      setProgress(IDLE_PROGRESS);
    } catch (metadataError) {
      if (sourceInspectionRequestId.current !== requestId) {
        return;
      }

      setError(
        metadataError instanceof Error ? metadataError.message : 'Unable to inspect the selected video.',
      );
      setProgress({
        phase: 'error',
        message: 'Metadata read failed.',
        current: 0,
        total: 0,
      });
    } finally {
      if (sourceInspectionRequestId.current === requestId) {
        setIsInspectingSource(false);
      }
    }
  }

  async function handleGenerate() {
    if (!sourceFile || !sourceInfo?.durationSeconds || !layout.isValid || isInspectingSource) {
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
          setProgress((current) => {
            if (current.phase !== 'extracting-frames' || current.total === 0) {
              return current;
            }

            const nextCurrent = Math.min(event.progress * current.total, current.total);
            return {
              ...current,
              current: nextCurrent,
              message: `Processing frames (${Math.min(
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
        config,
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
    <main className="min-h-screen px-4 py-6 antialiased sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1480px]">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="metro-tile metro-tile-accent relative overflow-hidden p-6 sm:p-8">
            <div className="absolute top-0 right-0 h-full w-[30%] bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]" />
            <div className="relative z-10 max-w-[780px]">
              <p className="metro-kicker">Browser-Based VFX Texture Tooling</p>
              <h1 className="mt-4 text-[clamp(2.6rem,5vw,5rem)] leading-[0.88] font-light uppercase tracking-[0.02em] text-white">
                Flipbook sheets
                <br />
                from moving footage
              </h1>
              <p className="mt-5 max-w-[640px] text-base leading-7 text-white/82 sm:text-lg">
                Upload a clip, choose a texture sheet and a square grid, then export a local PNG
                tile atlas tuned for engine-side flipbook playback.
              </p>
            </div>
          </div>

          <section className="metro-tile metro-tile-dark flex flex-col justify-between gap-6 p-6">
            <div>
              <p className="metro-kicker">Pipeline</p>
              <h2 className="metro-title mt-3 text-white">Fast Local Export</h2>
              <p className="metro-body mt-4 text-sm leading-6">
                The app stays fully client-side, so GitHub Pages hosting works and your source
                media never leaves the browser.
              </p>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
              <div className="metro-metric">
                <dt>Input</dt>
                <dd>{sourceFile ? sourceFile.name : 'Video clip'}</dd>
              </div>
              <div className="metro-metric">
                <dt>Grid</dt>
                <dd>
                  {config.columns} x {config.rows}
                </dd>
              </div>
              <div className="metro-metric">
                <dt>Output</dt>
                <dd>{layout.isValid ? `${layout.outputWidth} x ${layout.outputHeight}` : 'Pending'}</dd>
              </div>
            </dl>
          </section>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(320px,0.9fr)]">
          <div className="grid content-start gap-5">
            <section className="metro-tile p-6">
              <div className="mb-5">
                <p className="metro-kicker">Step 01</p>
                <h2 className="metro-title mt-2">Load Source</h2>
                <p className="metro-body mt-3 text-sm leading-6">
                  Select a single local video and inspect its metadata before extraction starts.
                </p>
              </div>
              <UploadField onFileSelect={handleFileSelect} disabled={isGenerating} />
            </section>

            <SourceInfoPanel sourceInfo={sourceInfo} />
          </div>

          <div className="grid content-start gap-5">
            <ConfigPanel
              config={config}
              layout={layout}
              sourceDurationSeconds={sourceInfo?.durationSeconds ?? null}
              sourceFrameCount={sourceInfo?.frameCount ?? null}
              sourceWidth={sourceInfo?.width ?? null}
              sourceHeight={sourceInfo?.height ?? null}
              disabled={isGenerating}
              onChange={setConfig}
            />

            <section className="metro-tile metro-tile-dark flex flex-col gap-5 p-6">
              <div>
                <p className="metro-kicker">Step 03</p>
                <h2 className="metro-title mt-2">Build Sheet</h2>
                <p className="metro-body mt-3 text-sm leading-6">
                  Generate a marginless PNG contact sheet from evenly sampled frames.
                </p>
              </div>

              <button
                type="button"
                className="metro-button w-full sm:w-auto"
                disabled={
                  !sourceFile ||
                  !sourceInfo?.durationSeconds ||
                  !layout.isValid ||
                  isGenerating ||
                  isInspectingSource
                }
                onClick={handleGenerate}
              >
                {isInspectingSource
                  ? 'Inspecting Source'
                  : isGenerating
                    ? 'Generating'
                    : 'Generate Flipbook'}
              </button>
            </section>
          </div>

          <div className="grid content-start gap-5">
            <ProgressPanel progress={progress} error={error} logLines={logLines} />
            <PreviewPanel
              result={result}
              downloadFileName={downloadFileName}
              onDownload={handleDownload}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
