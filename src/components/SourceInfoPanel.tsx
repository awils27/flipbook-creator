import type { SourceVideoInfo } from '../types';
import { formatBytes, formatDuration } from '../lib/file';

type SourceInfoPanelProps = {
  sourceInfo: SourceVideoInfo | null;
};

export function SourceInfoPanel({ sourceInfo }: SourceInfoPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Source</h2>
        <p>Video metadata is read locally in the browser. Nothing is uploaded.</p>
      </div>

      {sourceInfo ? (
        <dl className="stats-grid">
          <div>
            <dt>Name</dt>
            <dd>{sourceInfo.name}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{formatDuration(sourceInfo.durationSeconds)}</dd>
          </div>
          <div>
            <dt>Resolution</dt>
            <dd>
              {sourceInfo.width && sourceInfo.height
                ? `${sourceInfo.width} x ${sourceInfo.height}`
                : 'Unknown'}
            </dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(sourceInfo.sizeBytes)}</dd>
          </div>
        </dl>
      ) : (
        <p className="status-message">Upload a video to inspect it and unlock generation.</p>
      )}

      {sourceInfo && sourceInfo.sizeBytes > 250 * 1024 * 1024 ? (
        <p className="status-message status-message--warning">
          Large source files can exceed browser memory limits while decoding frames.
        </p>
      ) : null}
    </section>
  );
}
