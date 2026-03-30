import type { SourceVideoInfo } from '../types';

export async function readSourceVideoInfo(file: File): Promise<SourceVideoInfo> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const metadata = await new Promise<{ duration: number; width: number; height: number }>(
      (resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = objectUrl;
        video.muted = true;

        video.onloadedmetadata = () => {
          resolve({
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
          });
        };

        video.onerror = () => {
          reject(new Error('Unable to read this video file.'));
        };
      },
    );

    return {
      name: file.name,
      sizeBytes: file.size,
      durationSeconds: Number.isFinite(metadata.duration) ? metadata.duration : null,
      width: metadata.width || null,
      height: metadata.height || null,
      mimeType: file.type,
      frameCount: null,
      frameRate: null,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
