import type { GenerationResult } from '../types';

type PreviewPanelProps = {
  result: GenerationResult | null;
  downloadFileName: string | null;
  onDownload: () => void;
};

export function PreviewPanel({ result, downloadFileName, onDownload }: PreviewPanelProps) {
  return (
    <article className="preview-panel">
      <h3>Preview</h3>
      <p>
        The generated texture is shown at fit-to-panel scale. Download exports the full PNG.
      </p>

      {result ? (
        <>
          <div className="preview-stage">
            <img
              src={result.objectUrl}
              alt="Generated flipbook preview"
              className="preview-image"
            />
          </div>

          <dl className="definition-grid compact">
            <div className="definition-card">
              <dt>Dimensions</dt>
              <dd>
                {result.width} x {result.height}
              </dd>
            </div>
            <div className="definition-card">
              <dt>Frames</dt>
              <dd>{result.totalFrames}</dd>
            </div>
          </dl>

          <button type="button" onClick={onDownload}>
            Download {downloadFileName ?? 'flipbook.png'}
          </button>
        </>
      ) : (
        <p className="section-note">
          Generate a flipbook to preview and download the output texture.
        </p>
      )}
    </article>
  );
}
