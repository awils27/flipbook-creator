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
    <section className="metro-tile metro-tile-dark p-6">
      <div className="mb-5">
        <p className="metro-kicker">Telemetry</p>
        <h2 className="metro-title mt-2">Status</h2>
        <p className="metro-body mt-3 text-sm leading-6">
          FFmpeg loads on demand. Extraction and compositing stay local to this tab.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="metro-metric">
          <dt>Phase</dt>
          <dd>{progress.phase.replace('-', ' ')}</dd>
        </div>
        <div className="metro-metric">
          <dt>Progress</dt>
          <dd>{hasProgress && !progress.indeterminate ? `${percentage}%` : 'Running'}</dd>
        </div>
      </div>

      <p className="metro-body mt-4 text-sm leading-6">{progress.message}</p>

      {hasProgress ? (
        <div className="mt-4 h-3 overflow-hidden border border-white/10 bg-white/5">
          <div
            className={
              progress.indeterminate
                ? 'h-full w-1/3 animate-pulse bg-[linear-gradient(90deg,var(--color-metro-cyan),var(--color-metro-green))]'
                : 'h-full bg-[linear-gradient(90deg,var(--color-metro-cyan),var(--color-metro-green))] transition-[width] duration-200 ease-out'
            }
            style={progress.indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 border-l-4 border-[var(--color-metro-red)] pl-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      {logLines.length > 0 ? (
        <div className="metro-log mt-4" aria-live="polite">
          {logLines.map((line, index) => (
            <div key={`${index}-${line}`} className={index === 0 ? '' : 'mt-1.5'}>
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
