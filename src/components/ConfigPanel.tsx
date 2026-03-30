import type { ChangeEvent } from 'react';
import type { DerivedLayout, FlipbookConfig, FlipbookSheetSize } from '../types';

const SHEET_SIZES: FlipbookSheetSize[] = [256, 512, 1024, 2048, 4096];

type ConfigPanelProps = {
  config: FlipbookConfig;
  layout: DerivedLayout;
  disabled?: boolean;
  onChange: (config: FlipbookConfig) => void;
};

export function ConfigPanel({ config, layout, disabled = false, onChange }: ConfigPanelProps) {
  function updateNumber(
    key: 'columns' | 'rows',
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    onChange({
      ...config,
      [key]: Math.max(1, Number.parseInt(event.target.value, 10) || 1),
    });
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Flipbook setup</h2>
        <p>Square cells only in v1. The selected sheet size must divide evenly across both axes.</p>
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
          <span>Columns</span>
          <input
            type="number"
            min={1}
            step={1}
            value={config.columns}
            disabled={disabled}
            onChange={(event) => updateNumber('columns', event)}
          />
        </label>

        <label>
          <span>Rows</span>
          <input
            type="number"
            min={1}
            step={1}
            value={config.rows}
            disabled={disabled}
            onChange={(event) => updateNumber('rows', event)}
          />
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
          <dt>Total frames</dt>
          <dd>{layout.totalFrames || '—'}</dd>
        </div>
        <div>
          <dt>Cell size</dt>
          <dd>{layout.cellSize ? `${layout.cellSize}px` : '—'}</dd>
        </div>
        <div>
          <dt>Output size</dt>
          <dd>{layout.isValid ? `${layout.outputWidth} x ${layout.outputHeight}` : '—'}</dd>
        </div>
      </dl>

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
