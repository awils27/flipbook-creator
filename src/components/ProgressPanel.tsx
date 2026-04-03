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
    <article>
      <h3>Status</h3>
      <p>FFmpeg loads on demand. Extraction and compositing stay local to this tab.</p>

      <dl className="definition-grid compact">
        <div className="definition-card">
          <dt>Phase</dt>
          <dd>{progress.phase.replace('-', ' ')}</dd>
        </div>
        <div className="definition-card">
          <dt>Progress</dt>
          <dd>{hasProgress && !progress.indeterminate ? `${percentage}%` : 'Running'}</dd>
        </div>
      </dl>

      <p className="section-note">{progress.message}</p>

      {hasProgress ? (
        <div className="progress-track" aria-hidden="true">
          <div
            className={
              progress.indeterminate
                ? 'progress-bar is-indeterminate'
                : 'progress-bar'
            }
            style={progress.indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>
      ) : null}

      {error ? <p className="callout error">{error}</p> : null}

      {logLines.length > 0 ? (
        <div className="log-panel" aria-live="polite">
          {logLines.map((line, index) => (
            <div key={`${index}-${line}`} className={index === 0 ? '' : 'log-line'}>
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
