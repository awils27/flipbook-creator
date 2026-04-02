import { describe, expect, it } from 'vitest';
import { buildBatchFilter, buildFrameFilter } from './ffmpeg-filter';

describe('buildFrameFilter', () => {
  it('normalizes sample aspect ratio before stretching into the target cell', () => {
    const filter = buildFrameFilter(128, 'stretch');

    expect(filter).toContain("scale='max(1,trunc(ih*dar))':ih:flags=lanczos");
    expect(filter).toContain('setsar=1');
    expect(filter).toContain('scale=128:128:flags=lanczos');
  });

  it('keeps contain mode padding after display-aspect correction', () => {
    const filter = buildFrameFilter(128, 'contain');

    expect(filter).toContain("scale='max(1,trunc(ih*dar))':ih:flags=lanczos");
    expect(filter).toContain('setsar=1');
    expect(filter).toContain('force_original_aspect_ratio=decrease');
    expect(filter).toContain('pad=128:128:(ow-iw)/2:(oh-ih)/2:color=0x00000000');
  });
});

describe('buildBatchFilter', () => {
  it('prepends the sampling filter before the frame transform chain', () => {
    const filter = buildBatchFilter([1, 3, 5, 7], 128, 'stretch');

    expect(filter.startsWith('fps=0.5:start_time=1:round=near,')).toBe(true);
    expect(filter).toContain('scale=128:128:flags=lanczos');
  });
});
