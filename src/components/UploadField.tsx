import type { ChangeEvent } from 'react';

type UploadFieldProps = {
  inputId?: string;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
};

export function UploadField({ inputId, onFileSelect, disabled = false }: UploadFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onFileSelect(file);
  }

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="video/*"
        onChange={handleChange}
        disabled={disabled}
      />
      <small>
        Upload a single local video file to build a contact-sheet flipbook.
      </small>
    </>
  );
}
