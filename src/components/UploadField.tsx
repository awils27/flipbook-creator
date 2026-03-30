import type { ChangeEvent } from 'react';

type UploadFieldProps = {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
};

export function UploadField({ onFileSelect, disabled = false }: UploadFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onFileSelect(file);
  }

  return (
    <label className="grid gap-2.5">
      <span className="text-sm font-bold tracking-wide text-slate-100">Source video</span>
      <input
        type="file"
        accept="video/*"
        onChange={handleChange}
        disabled={disabled}
        className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 text-slate-100 file:mr-4 file:rounded-full file:border-0 file:bg-amber-300/90 file:px-4 file:py-2 file:font-semibold file:text-slate-950 hover:file:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="text-sm text-slate-300/70">
        Upload a single local video file to build a contact-sheet flipbook.
      </span>
    </label>
  );
}
