import { useEffect, useMemo, useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { SourceInfoPanel } from './components/SourceInfoPanel';
import { UploadField } from './components/UploadField';
import { createFlipbookComposer } from './lib/composite';
import {
  ensureFfmpegLoaded,
  extractFrames,
  probeVideoFrameInfo,
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

      setProgress({
        phase: 'loading-engine',
        message: 'Inspecting source frame count...',
        current: 0,
        total: 0,
        indeterminate: true,
      });

      try {
        const frameInfo = await probeVideoFrameInfo(file);
        setSourceInfo({
          ...metadata,
          frameCount: frameInfo.frameCount,
          frameRate: frameInfo.frameRate,
        });
      } catch {
        setSourceInfo(metadata);
      }

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(44,138,101,0.36),transparent_28%),radial-gradient(circle_at_top_right,rgba(234,157,52,0.18),transparent_30%),linear-gradient(180deg,#0a1717_0%,#102024_52%,#071013_100%)] px-4 py-8 font-['Trebuchet_MS','Lucida_Sans_Unicode','Segoe_UI',sans-serif] text-slate-100 antialiased sm:px-5">
      <div className="mx-auto w-full max-w-[1320px]">
        <section className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,rgba(24,38,41,0.95),rgba(9,18,20,0.9)),linear-gradient(90deg,rgba(196,211,86,0.12),rgba(37,117,98,0.16))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.35)] sm:p-10">
          <div className="pointer-events-none absolute -right-[8%] -bottom-[42%] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(214,143,53,0.34),transparent_68%)]" />
          <div className="relative z-10 max-w-[780px]">
            <p className="mb-3 text-[0.82rem] uppercase tracking-[0.18em] text-lime-200">
              Browser-based VFX texture tooling
            </p>
            <h1 className="text-[clamp(2.5rem,5vw,4.8rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-slate-50">
              Flipbook sheets from video, without leaving the browser.
            </h1>
            <p className="mt-5 max-w-[640px] text-[1.05rem] text-slate-100/80">
              Upload a clip, pick a power-of-two texture size and grid, then export a marginless PNG
              contact sheet for engine-side flipbook playback.
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-[22px] lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="grid content-start gap-[22px]">
            <section className="rounded-[22px] border border-white/15 bg-slate-950/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-50">Upload</h2>
                <p className="mt-2 text-sm text-slate-300/70">
                  Everything runs locally. GitHub Pages hosting stays viable because there is no backend.
                </p>
              </div>
              <UploadField onFileSelect={handleFileSelect} disabled={isGenerating} />
            </section>

            <SourceInfoPanel sourceInfo={sourceInfo} />
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

            <div className="flex justify-start">
              <button
                type="button"
                className="min-h-[52px] rounded-full bg-linear-to-br from-amber-300 to-orange-400 px-6 py-3.5 text-sm font-extrabold tracking-[0.01em] text-slate-950 shadow-[0_12px_32px_rgba(235,146,80,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                disabled={!sourceFile || !sourceInfo?.durationSeconds || !layout.isValid || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? 'Generating...' : 'Generate Flipbook'}
              </button>
            </div>
          </div>

          <div className="grid content-start gap-[22px]">
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
