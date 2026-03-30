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
    <label className="upload-field">
      <span className="upload-field__label">Source video</span>
      <input type="file" accept="video/*" onChange={handleChange} disabled={disabled} />
      <span className="upload-field__hint">
        Upload a single local video file to build a contact-sheet flipbook.
      </span>
    </label>
  );
}
