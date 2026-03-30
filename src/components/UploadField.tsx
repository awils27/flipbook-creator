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
    <label className="grid gap-3">
      <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white/88">
        Source Video
      </span>
      <input
        type="file"
        accept="video/*"
        onChange={handleChange}
        disabled={disabled}
        className="metro-field text-sm text-white file:mr-4 file:border-0 file:bg-[var(--color-metro-cyan)] file:px-4 file:py-2 file:font-semibold file:uppercase file:tracking-[0.12em] file:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="metro-body text-sm leading-6">
        Upload a single local video file to build a contact-sheet flipbook.
      </span>
    </label>
  );
}
