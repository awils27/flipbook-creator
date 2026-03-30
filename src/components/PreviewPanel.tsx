import type { GenerationResult } from '../types';

type PreviewPanelProps = {
  result: GenerationResult | null;
  downloadFileName: string | null;
  onDownload: () => void;
};

export function PreviewPanel({ result, downloadFileName, onDownload }: PreviewPanelProps) {
  return (
    <section className="panel preview-panel">
      <div className="panel__header">
        <h2>Preview</h2>
        <p>The generated texture is shown at fit-to-panel scale. Download exports the full PNG.</p>
      </div>

      {result ? (
        <>
          <div className="preview-frame">
            <img src={result.objectUrl} alt="Generated flipbook preview" />
          </div>

          <dl className="stats-grid">
            <div>
              <dt>Dimensions</dt>
              <dd>
                {result.width} x {result.height}
              </dd>
            </div>
            <div>
              <dt>Frames</dt>
              <dd>{result.totalFrames}</dd>
            </div>
          </dl>

          <button type="button" className="primary-button" onClick={onDownload}>
            Download {downloadFileName ?? 'flipbook.png'}
          </button>
        </>
      ) : (
        <p className="status-message">Generate a flipbook to preview and download the output texture.</p>
      )}
    </section>
  );
}
