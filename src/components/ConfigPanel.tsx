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
  const gridOptions = getValidGridOptions(config.sheetWidth, config.sheetHeight);
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
    <article>
      <h3>Tile configuration</h3>
      <p>
        Sheet width and height can be configured independently. Grid options are limited to square
        counts so each cell keeps the same aspect ratio as the full sheet.
      </p>

      <div className="form-grid">
        <label>
          <span>Sheet width</span>
          <select
            value={config.sheetWidth}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...config,
                sheetWidth: Number(event.target.value) as FlipbookSheetSize,
              })
            }
          >
            {SHEET_SIZES.map((size) => (
              <option key={`width-${size}`} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Sheet height</span>
          <select
            value={config.sheetHeight}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...config,
                sheetHeight: Number(event.target.value) as FlipbookSheetSize,
              })
            }
          >
            {SHEET_SIZES.map((size) => (
              <option key={`height-${size}`} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Grid</span>
          <select
            value={selectedGridValue}
            disabled={disabled || gridOptions.length === 0}
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

        <label>
          <span>Fit mode</span>
          <select
            value={config.fitMode}
            disabled={disabled}
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

      <dl className="definition-grid">
        <div className="definition-card">
          <dt>Grid</dt>
          <dd>
            {config.columns} x {config.rows}
          </dd>
        </div>
        <div className="definition-card">
          <dt>Total Frames</dt>
          <dd>{layout.totalFrames || '-'}</dd>
        </div>
        <div className="definition-card">
          <dt>Cell Size</dt>
          <dd>
            {layout.cellWidth && layout.cellHeight
              ? `${layout.cellWidth} x ${layout.cellHeight}px`
              : '-'}
          </dd>
        </div>
        <div className="definition-card">
          <dt>Output Size</dt>
          <dd>{layout.isValid ? `${layout.outputWidth} x ${layout.outputHeight}` : '-'}</dd>
        </div>
        <div className="definition-card">
          <dt>Playback Fps</dt>
          <dd>{playbackFps ? `${playbackFps.toFixed(3)} fps` : '-'}</dd>
        </div>
        <div className="definition-card">
          <dt>Source Aspect</dt>
          <dd>{aspectRatioLabel ?? '-'}</dd>
        </div>
      </dl>

      {playbackFps ? (
        <p className="section-note">
          Play the sheet at <strong>{playbackFps.toFixed(3)} fps</strong> in-engine to match the
          original clip timing across {layout.totalFrames} sampled frames.
        </p>
      ) : null}

      {!layout.isValid ? <p className="callout error">{layout.validationMessage}</p> : null}

      {Math.max(config.sheetWidth, config.sheetHeight) >= 4096 ? (
        <p className="callout warning">
          Large textures can be expensive in browser memory. Expect longer processing times once
          either sheet dimension reaches 4096 or above.
        </p>
      ) : null}

      {requiresMoreFramesThanSource ? (
        <p className="callout warning">
          This grid needs {layout.totalFrames} frames, but the source clip is estimated to contain only{' '}
          {sourceFrameCount} frames. The generated flipbook may repeat or undersample frames.
        </p>
      ) : null}

      {unstretchScaleLabel ? (
        <p className="section-note">
          Stretch mode fills each sheet-shaped cell exactly. If you want to preserve the source
          frame shape instead, switch to <strong>Contain</strong> or apply an in-engine unstretch
          scale of <strong>{unstretchScaleLabel}</strong> to recover the original{' '}
          {aspectRatioLabel} frame shape.
        </p>
      ) : null}
    </article>
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
