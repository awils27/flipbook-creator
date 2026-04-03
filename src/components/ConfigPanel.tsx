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
    <article>
      <h3>Tile configuration</h3>
      <p>
        Square cells only in v1. Grid options are filtered to valid combinations for the sheet size.
      </p>

      <div className="form-grid">
        <label>
          <span>Sheet size</span>
          <select
            value={config.sheetSize}
            disabled={disabled}
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

        <label>
          <span>Grid</span>
          <select
            value={selectedGridValue}
            disabled={disabled}
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
          <dd>{layout.cellSize ? `${layout.cellSize}px` : '-'}</dd>
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

      {config.sheetSize >= 4096 ? (
        <p className="callout warning">
          {config.sheetSize} textures can be expensive in browser memory. Expect longer processing
          times.
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
          Because frames are stretched into square cells, apply an in-engine unstretch scale of{' '}
          <strong>{unstretchScaleLabel}</strong> to recover the original {aspectRatioLabel} frame
          shape.
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
