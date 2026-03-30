import type { GenerationResult } from '../types';

type PreviewPanelProps = {
  result: GenerationResult | null;
  downloadFileName: string | null;
  onDownload: () => void;
};

export function PreviewPanel({ result, downloadFileName, onDownload }: PreviewPanelProps) {
  return (
    <section className="metro-tile p-6 min-h-[440px]">
      <div className="mb-5">
        <p className="metro-kicker">Output</p>
        <h2 className="metro-title mt-2">Preview</h2>
        <p className="metro-body mt-3 text-sm leading-6">
          The generated texture is shown at fit-to-panel scale. Download exports the full PNG.
        </p>
      </div>

      {result ? (
        <>
          <div className="border border-white/10 bg-[linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.08)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,0.08)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,0.08)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-4">
            <img
              src={result.objectUrl}
              alt="Generated flipbook preview"
              className="block h-auto w-full border border-white/10 [image-rendering:pixelated]"
            />
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="metro-metric">
              <dt>Dimensions</dt>
              <dd>
                {result.width} x {result.height}
              </dd>
            </div>
            <div className="metro-metric">
              <dt>Frames</dt>
              <dd>{result.totalFrames}</dd>
            </div>
          </dl>

          <button
            type="button"
            className="metro-button mt-4 w-full sm:w-auto"
            onClick={onDownload}
          >
            Download {downloadFileName ?? 'flipbook.png'}
          </button>
        </>
      ) : (
        <p className="metro-body mt-3 text-sm leading-6">
          Generate a flipbook to preview and download the output texture.
        </p>
      )}
    </section>
  );
}
