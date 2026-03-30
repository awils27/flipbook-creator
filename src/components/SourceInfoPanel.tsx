import type { SourceVideoInfo } from '../types';
import { formatBytes, formatDuration } from '../lib/file';

type SourceInfoPanelProps = {
  sourceInfo: SourceVideoInfo | null;
};

export function SourceInfoPanel({ sourceInfo }: SourceInfoPanelProps) {
  return (
    <section className="metro-tile p-6">
      <div className="mb-5">
        <p className="metro-kicker">Step 02</p>
        <h2 className="metro-title mt-2">Source Snapshot</h2>
        <p className="metro-body mt-3 text-sm leading-6">
          Video metadata is read locally in the browser. Nothing is uploaded.
        </p>
      </div>

      {sourceInfo ? (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="metro-metric">
            <dt>Name</dt>
            <dd className="break-words">{sourceInfo.name}</dd>
          </div>
          <div className="metro-metric">
            <dt>Duration</dt>
            <dd>{formatDuration(sourceInfo.durationSeconds)}</dd>
          </div>
          <div className="metro-metric">
            <dt>Resolution</dt>
            <dd>{sourceInfo.width && sourceInfo.height ? `${sourceInfo.width} x ${sourceInfo.height}` : 'Unknown'}</dd>
          </div>
          <div className="metro-metric">
            <dt>Size</dt>
            <dd>{formatBytes(sourceInfo.sizeBytes)}</dd>
          </div>
          <div className="metro-metric">
            <dt>Estimated Frames</dt>
            <dd>{sourceInfo.frameCount ?? 'Unknown'}</dd>
          </div>
          <div className="metro-metric">
            <dt>Estimated Fps</dt>
            <dd>{sourceInfo.frameRate ? sourceInfo.frameRate.toFixed(3) : 'Unknown'}</dd>
          </div>
        </dl>
      ) : (
        <p className="metro-body mt-3 text-sm leading-6">
          Upload a video to inspect it and unlock generation.
        </p>
      )}

      {sourceInfo && sourceInfo.sizeBytes > 250 * 1024 * 1024 ? (
        <p className="mt-4 border-l-4 border-[var(--color-metro-orange)] pl-3 text-sm text-orange-300">
          Large source files can exceed browser memory limits while decoding frames.
        </p>
      ) : null}

      {sourceInfo?.frameRate ? (
        <p className="metro-body mt-4 text-sm leading-6">
          Source frame estimates currently assume a {sourceInfo.frameRate.toFixed(0)} fps clip.
        </p>
      ) : null}
    </section>
  );
}
