import type { ProgressState } from '../types';

type ProgressPanelProps = {
  progress: ProgressState;
  error: string | null;
  logLines: string[];
};

export function ProgressPanel({ progress, error, logLines }: ProgressPanelProps) {
  const hasProgress = progress.total > 0 || progress.indeterminate;
  const percentage = hasProgress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Status</h2>
        <p>FFmpeg loads on demand. Extraction and compositing stay local to this tab.</p>
      </div>

      <p className="status-message">{progress.message}</p>

      {hasProgress ? (
        <div className={`progress${progress.indeterminate ? ' progress--indeterminate' : ''}`}>
          <div
            className="progress__bar"
            style={progress.indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>
      ) : null}

      {error ? <p className="status-message status-message--error">{error}</p> : null}

      {logLines.length > 0 ? (
        <div className="log-panel" aria-live="polite">
          {logLines.map((line, index) => (
            <div key={`${index}-${line}`} className="log-panel__line">
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
