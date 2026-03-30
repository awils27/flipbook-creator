import type { GenerationResult } from '../types';

type PreviewPanelProps = {
  result: GenerationResult | null;
  downloadFileName: string | null;
  onDownload: () => void;
};

export function PreviewPanel({ result, downloadFileName, onDownload }: PreviewPanelProps) {
  return (
    <section className="rounded-[22px] border border-white/15 bg-slate-950/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl min-h-[440px]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-50">Preview</h2>
        <p className="mt-2 text-sm text-slate-300/70">
          The generated texture is shown at fit-to-panel scale. Download exports the full PNG.
        </p>
      </div>

      {result ? (
        <>
          <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.06)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,0.06)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,0.06)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-[18px]">
            <img
              src={result.objectUrl}
              alt="Generated flipbook preview"
              className="block h-auto w-full rounded-[10px] [image-rendering:pixelated]"
            />
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
              <dt className="text-xs text-slate-300/55">Dimensions</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-100">
                {result.width} x {result.height}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
              <dt className="text-xs text-slate-300/55">Frames</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-100">{result.totalFrames}</dd>
            </div>
          </dl>

          <button
            type="button"
            className="mt-4 min-h-[52px] rounded-full bg-linear-to-br from-amber-300 to-orange-400 px-6 py-3.5 text-sm font-extrabold tracking-[0.01em] text-slate-950 shadow-[0_12px_32px_rgba(235,146,80,0.28)] transition hover:brightness-105"
            onClick={onDownload}
          >
            Download {downloadFileName ?? 'flipbook.png'}
          </button>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-300/75">
          Generate a flipbook to preview and download the output texture.
        </p>
      )}
    </section>
  );
}
