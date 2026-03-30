import { describe, expect, it } from 'vitest';
import { buildSamplingTimestamps, deriveLayout } from './layout';

describe('deriveLayout', () => {
  it('rejects layouts where the sheet does not divide evenly', () => {
    const layout = deriveLayout({
      sheetSize: 1024,
      columns: 7,
      rows: 8,
      fitMode: 'contain',
    });

    expect(layout.isValid).toBe(false);
    expect(layout.validationMessage).toMatch(/divide evenly/i);
  });

  it('rejects non-square derived cells', () => {
    const layout = deriveLayout({
      sheetSize: 1024,
      columns: 8,
      rows: 4,
      fitMode: 'contain',
    });

    expect(layout.isValid).toBe(false);
    expect(layout.validationMessage).toMatch(/square cells/i);
  });

  it('returns a valid layout for square cells', () => {
    const layout = deriveLayout({
      sheetSize: 1024,
      columns: 8,
      rows: 8,
      fitMode: 'contain',
    });

    expect(layout).toMatchObject({
      totalFrames: 64,
      cellSize: 128,
      outputWidth: 1024,
      outputHeight: 1024,
      isValid: true,
    });
  });
});

describe('buildSamplingTimestamps', () => {
  it('returns the expected number of timestamps inside the duration window', () => {
    const timestamps = buildSamplingTimestamps(8, 4);

    expect(timestamps).toHaveLength(4);
    expect(timestamps.every((value) => value > 0 && value < 8)).toBe(true);
    expect(timestamps).toEqual([1, 3, 5, 7]);
  });
});
