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
    <section className="rounded-[22px] border border-white/15 bg-slate-950/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-50">Status</h2>
        <p className="mt-2 text-sm text-slate-300/70">
          FFmpeg loads on demand. Extraction and compositing stay local to this tab.
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-300/75">{progress.message}</p>

      {hasProgress ? (
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={
              progress.indeterminate
                ? 'h-full w-1/3 animate-pulse rounded-full bg-linear-to-r from-lime-200 to-emerald-500'
                : 'h-full rounded-full bg-linear-to-r from-lime-200 to-emerald-500 transition-[width] duration-200 ease-out'
            }
            style={progress.indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {logLines.length > 0 ? (
        <div
          className="mt-4 max-h-[220px] overflow-auto rounded-2xl border border-white/10 bg-slate-950/90 p-3 font-mono text-xs leading-[1.45] text-slate-200"
          aria-live="polite"
        >
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
