import type { FlipbookConfig } from '../types';

export function buildFrameFilter(
  cellWidth: number,
  cellHeight: number,
  fitMode: FlipbookConfig['fitMode'],
): string {
  const filters = [buildDisplayAspectCorrectionFilter()];

  if (fitMode === 'stretch') {
    filters.push(`scale=${cellWidth}:${cellHeight}:flags=lanczos`);
    return filters.join(',');
  }

  filters.push(
    `scale=${cellWidth}:${cellHeight}:force_original_aspect_ratio=decrease:flags=lanczos`,
    `pad=${cellWidth}:${cellHeight}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
  );
  return filters.join(',');
}

export function buildBatchFilter(
  timestamps: number[],
  cellWidth: number,
  cellHeight: number,
  fitMode: FlipbookConfig['fitMode'],
): string {
  if (timestamps.length === 0) {
    throw new Error('At least one timestamp is required.');
  }

  const intervalSeconds =
    timestamps.length > 1 ? timestamps[1] - timestamps[0] : Math.max(timestamps[0] * 2, 0.001);
  const firstSampleSeconds = Math.max(intervalSeconds / 2, 0);
  const fps = 1 / Math.max(intervalSeconds, 0.001);

  return [
    `fps=${fps}:start_time=${firstSampleSeconds}:round=near`,
    buildFrameFilter(cellWidth, cellHeight, fitMode),
  ].join(',');
}

function buildDisplayAspectCorrectionFilter(): string {
  return "scale='max(1,trunc(ih*dar))':ih:flags=lanczos,setsar=1";
}
