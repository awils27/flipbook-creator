import type { ProgressState } from '../types';

type ProgressPanelProps = {
  progress: ProgressState;
  error: string | null;
};

export function ProgressPanel({ progress, error }: ProgressPanelProps) {
  const hasProgress = progress.total > 0;
  const percentage = hasProgress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Status</h2>
        <p>FFmpeg loads on demand. Extraction and compositing stay local to this tab.</p>
      </div>

      <p className="status-message">{progress.message}</p>

      {hasProgress ? (
        <div className="progress">
          <div className="progress__bar" style={{ width: `${percentage}%` }} />
        </div>
      ) : null}

      {error ? <p className="status-message status-message--error">{error}</p> : null}
    </section>
  );
}
