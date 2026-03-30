import { getValidGridOptions } from '../lib/layout';
import type { DerivedLayout, FlipbookConfig, FlipbookSheetSize } from '../types';

const SHEET_SIZES: FlipbookSheetSize[] = [256, 512, 1024, 2048, 4096];

type ConfigPanelProps = {
  config: FlipbookConfig;
  layout: DerivedLayout;
  sourceDurationSeconds: number | null;
  disabled?: boolean;
  onChange: (config: FlipbookConfig) => void;
};

export function ConfigPanel({
  config,
  layout,
  sourceDurationSeconds,
  disabled = false,
  onChange,
}: ConfigPanelProps) {
  const gridOptions = getValidGridOptions(config.sheetSize);
  const selectedGridValue = `${config.columns}x${config.rows}`;
  const playbackFps =
    layout.isValid && sourceDurationSeconds && sourceDurationSeconds > 0
      ? layout.totalFrames / sourceDurationSeconds
      : null;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Flipbook setup</h2>
        <p>Square cells only in v1. Grid options are filtered to valid combinations for the sheet size.</p>
      </div>

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

      <dl className="stats-grid">
        <div>
          <dt>Grid</dt>
          <dd>
            {config.columns} x {config.rows}
          </dd>
        </div>
        <div>
          <dt>Total frames</dt>
          <dd>{layout.totalFrames || '-'}</dd>
        </div>
        <div>
          <dt>Cell size</dt>
          <dd>{layout.cellSize ? `${layout.cellSize}px` : '-'}</dd>
        </div>
        <div>
          <dt>Output size</dt>
          <dd>{layout.isValid ? `${layout.outputWidth} x ${layout.outputHeight}` : '-'}</dd>
        </div>
        <div>
          <dt>Playback FPS</dt>
          <dd>{playbackFps ? `${playbackFps.toFixed(3)} fps` : '-'}</dd>
        </div>
      </dl>

      {playbackFps ? (
        <p className="status-message">
          Play the sheet at <strong>{playbackFps.toFixed(3)} fps</strong> in-engine to match the
          original clip timing across {layout.totalFrames} sampled frames.
        </p>
      ) : null}

      {!layout.isValid ? (
        <p className="status-message status-message--error">{layout.validationMessage}</p>
      ) : null}

      {config.sheetSize === 4096 ? (
        <p className="status-message status-message--warning">
          4096 textures can be expensive in browser memory. Expect longer processing times.
        </p>
      ) : null}
    </section>
  );
}
