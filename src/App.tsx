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
  const configSectionRef = useRef<HTMLElement | null>(null);
  const previewSectionRef = useRef<HTMLElement | null>(null);
  const hasAutoScrolledToConfigRef = useRef(false);
  const hasAutoScrolledToPreviewRef = useRef(false);

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

  useEffect(() => {
    if (!sourceFile) {
      hasAutoScrolledToConfigRef.current = false;
      hasAutoScrolledToPreviewRef.current = false;
    }
  }, [sourceFile]);

  useEffect(() => {
    if (!sourceInfo || isInspectingSource || hasAutoScrolledToConfigRef.current) {
      return;
    }

    hasAutoScrolledToConfigRef.current = true;
    scrollToSection(configSectionRef.current);
  }, [sourceInfo, isInspectingSource]);

  useEffect(() => {
    if (!result || hasAutoScrolledToPreviewRef.current) {
      return;
    }

    hasAutoScrolledToPreviewRef.current = true;
    scrollToSection(previewSectionRef.current);
  }, [result]);

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
    <main className="container">
      <header>
        <h2>Flipbook to PNG</h2>
        <p className="muted">Front-end only flipbook sheet generation</p>
      </header>

      <article>
        <div className="grid">
          <div className="hero-preview" aria-hidden="true">
            <div className="hero-preview-frame">
              <div className="hero-preview-grid">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span key={index} className="hero-preview-cell" />
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3>Generate a flipbook texture sheet</h3>
            <p>
              Select a local video, choose the atlas size and grid, then export a PNG sheet for
              engine-side playback. Everything stays in the browser.
            </p>
            <p>
              Large source clips and very high sheet sizes can still hit browser memory limits, so
              the status panel will surface FFmpeg progress and errors as the job runs.
            </p>
          </div>
        </div>
      </article>

      <article>
        <h3>Source video</h3>
        <label htmlFor="source-video-upload">Choose a video file</label>
        <UploadField
          inputId="source-video-upload"
          onFileSelect={handleFileSelect}
          disabled={isGenerating}
        />
      </article>

      <section className="stack">
        <SourceInfoPanel sourceInfo={sourceInfo} />

        <section ref={configSectionRef}>
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
        </section>

        <article>
          <h3>Build sheet</h3>
          <p>
            Generate a marginless PNG contact sheet from evenly sampled frames.
          </p>

          <button
            type="button"
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
              ? 'Inspecting source'
              : isGenerating
                ? 'Generating'
                : 'Generate flipbook'}
          </button>
        </article>

        <ProgressPanel progress={progress} error={error} logLines={logLines} />

        <section ref={previewSectionRef}>
          <PreviewPanel
            result={result}
            downloadFileName={downloadFileName}
            onDownload={handleDownload}
          />
        </section>
      </section>
    </main>
  );
}

function scrollToSection(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}
