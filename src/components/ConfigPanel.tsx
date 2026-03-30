import { getValidGridOptions } from '../lib/layout';
import type { DerivedLayout, FlipbookConfig, FlipbookSheetSize } from '../types';

const SHEET_SIZES: FlipbookSheetSize[] = [256, 512, 1024, 2048, 4096, 8192];

type ConfigPanelProps = {
  config: FlipbookConfig;
  layout: DerivedLayout;
  sourceDurationSeconds: number | null;
  sourceFrameCount: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  disabled?: boolean;
  onChange: (config: FlipbookConfig) => void;
};

export function ConfigPanel({
  config,
  layout,
  sourceDurationSeconds,
  sourceFrameCount,
  sourceWidth,
  sourceHeight,
  disabled = false,
  onChange,
}: ConfigPanelProps) {
  const gridOptions = getValidGridOptions(config.sheetSize);
  const selectedGridValue = `${config.columns}x${config.rows}`;
  const playbackFps =
    layout.isValid && sourceDurationSeconds && sourceDurationSeconds > 0
      ? layout.totalFrames / sourceDurationSeconds
      : null;
  const requiresMoreFramesThanSource =
    layout.isValid && sourceFrameCount !== null && layout.totalFrames > sourceFrameCount;
  const sourceAspectRatio =
    sourceWidth && sourceHeight && sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : null;
  const aspectRatioLabel =
    sourceWidth && sourceHeight && sourceWidth > 0 && sourceHeight > 0
      ? formatAspectRatio(sourceWidth, sourceHeight)
      : null;
  const unstretchScaleLabel =
    config.fitMode === 'stretch' && sourceAspectRatio
      ? sourceAspectRatio >= 1
        ? `X ${sourceAspectRatio.toFixed(3)}, Y 1.000`
        : `X 1.000, Y ${(1 / sourceAspectRatio).toFixed(3)}`
      : null;

  return (
    <section className="metro-tile p-6">
      <div className="mb-5">
        <p className="metro-kicker">Step 02</p>
        <h2 className="metro-title mt-2">Tile Configuration</h2>
        <p className="metro-body mt-3 text-sm leading-6">
          Square cells only in v1. Grid options are filtered to valid combinations for the sheet size.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white/88">
            Sheet Size
          </span>
          <select
            value={config.sheetSize}
            disabled={disabled}
            className="metro-field text-white disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) =>
              onChange({
                ...config,
                sheetSize: Number(event.target.value) as FlipbookSheetSize,
              })
            }
          >
            {SHEET_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} x {size}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white/88">Grid</span>
          <select
            value={selectedGridValue}
            disabled={disabled}
            className="metro-field text-white disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => {
              const [columns, rows] = event.target.value.split('x').map(Number);
              onChange({
                ...config,
                columns,
                rows,
              });
            }}
          >
            {gridOptions.map((option) => (
              <option
                key={`${option.columns}x${option.rows}`}
                value={`${option.columns}x${option.rows}`}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white/88">
            Fit Mode
          </span>
          <select
            value={config.fitMode}
            disabled={disabled}
            className="metro-field text-white disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) =>
              onChange({
                ...config,
                fitMode: event.target.value as FlipbookConfig['fitMode'],
              })
            }
          >
            <option value="contain">Contain</option>
            <option value="stretch">Stretch</option>
          </select>
        </label>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="metro-metric">
          <dt>Grid</dt>
          <dd>
            {config.columns} x {config.rows}
          </dd>
        </div>
        <div className="metro-metric">
          <dt>Total Frames</dt>
          <dd>{layout.totalFrames || '-'}</dd>
        </div>
        <div className="metro-metric">
          <dt>Cell Size</dt>
          <dd>{layout.cellSize ? `${layout.cellSize}px` : '-'}</dd>
        </div>
        <div className="metro-metric">
          <dt>Output Size</dt>
          <dd>{layout.isValid ? `${layout.outputWidth} x ${layout.outputHeight}` : '-'}</dd>
        </div>
        <div className="metro-metric">
          <dt>Playback Fps</dt>
          <dd>{playbackFps ? `${playbackFps.toFixed(3)} fps` : '-'}</dd>
        </div>
        <div className="metro-metric">
          <dt>Source Aspect</dt>
          <dd>{aspectRatioLabel ?? '-'}</dd>
        </div>
      </dl>

      {playbackFps ? (
        <p className="metro-body mt-4 text-sm leading-6">
          Play the sheet at <strong className="text-white">{playbackFps.toFixed(3)} fps</strong>{' '}
          in-engine to match the original clip timing across {layout.totalFrames} sampled frames.
        </p>
      ) : null}

      {!layout.isValid ? (
        <p className="mt-4 border-l-4 border-[var(--color-metro-red)] pl-3 text-sm text-rose-300">
          {layout.validationMessage}
        </p>
      ) : null}

      {config.sheetSize >= 4096 ? (
        <p className="mt-4 border-l-4 border-[var(--color-metro-orange)] pl-3 text-sm text-amber-300">
          {config.sheetSize} textures can be expensive in browser memory. Expect longer processing
          times.
        </p>
      ) : null}

      {requiresMoreFramesThanSource ? (
        <p className="mt-4 border-l-4 border-[var(--color-metro-orange)] pl-3 text-sm text-amber-300">
          This grid needs {layout.totalFrames} frames, but the source clip is estimated to contain only{' '}
          {sourceFrameCount} frames. The generated flipbook may repeat or undersample frames.
        </p>
      ) : null}

      {unstretchScaleLabel ? (
        <p className="metro-body mt-4 text-sm leading-6">
          Because frames are stretched into square cells, apply an in-engine unstretch scale of{' '}
          <strong className="text-white">{unstretchScaleLabel}</strong> to recover the original{' '}
          {aspectRatioLabel} frame shape.
        </p>
      ) : null}
    </section>
  );
}

function formatAspectRatio(width: number, height: number): string {
  const divisor = greatestCommonDivisor(width, height);
  const reducedWidth = Math.round(width / divisor);
  const reducedHeight = Math.round(height / divisor);
  return `${reducedWidth}:${reducedHeight}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
}
