import type { SourceVideoInfo } from '../types';
import { formatBytes, formatDuration } from '../lib/file';

type SourceInfoPanelProps = {
  sourceInfo: SourceVideoInfo | null;
};

export function SourceInfoPanel({ sourceInfo }: SourceInfoPanelProps) {
  return (
    <section className="rounded-[22px] border border-white/15 bg-slate-950/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-50">Source</h2>
        <p className="mt-2 text-sm text-slate-300/70">
          Video metadata is read locally in the browser. Nothing is uploaded.
        </p>
      </div>

      {sourceInfo ? (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
            <dt className="text-xs text-slate-300/55">Name</dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-slate-100">
              {sourceInfo.name}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
            <dt className="text-xs text-slate-300/55">Duration</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-100">
              {formatDuration(sourceInfo.durationSeconds)}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
            <dt className="text-xs text-slate-300/55">Resolution</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-100">
              {sourceInfo.width && sourceInfo.height
                ? `${sourceInfo.width} x ${sourceInfo.height}`
                : 'Unknown'}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
            <dt className="text-xs text-slate-300/55">Size</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-100">
              {formatBytes(sourceInfo.sizeBytes)}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
            <dt className="text-xs text-slate-300/55">Estimated frames</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-100">
              {sourceInfo.frameCount ?? 'Unknown'}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
            <dt className="text-xs text-slate-300/55">Estimated FPS</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-100">
              {sourceInfo.frameRate ? sourceInfo.frameRate.toFixed(3) : 'Unknown'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-300/75">
          Upload a video to inspect it and unlock generation.
        </p>
      )}

      {sourceInfo && sourceInfo.sizeBytes > 250 * 1024 * 1024 ? (
        <p className="mt-3 text-sm text-amber-300">
          Large source files can exceed browser memory limits while decoding frames.
        </p>
      ) : null}

      {sourceInfo?.frameRate ? (
        <p className="mt-3 text-sm text-slate-300/75">
          Source frame estimates currently assume a {sourceInfo.frameRate.toFixed(0)} fps clip.
        </p>
      ) : null}
    </section>
  );
}
