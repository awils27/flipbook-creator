import { describe, expect, it } from 'vitest';
import { buildSamplingTimestamps, deriveLayout, getValidGridOptions } from './layout';

describe('deriveLayout', () => {
  it('rejects layouts where the sheet does not divide evenly', () => {
    const layout = deriveLayout({
      sheetWidth: 1024,
      sheetHeight: 512,
      columns: 7,
      rows: 7,
      fitMode: 'contain',
    });

    expect(layout.isValid).toBe(false);
    expect(layout.validationMessage).toMatch(/divide evenly/i);
  });

  it('rejects non-matching grid dimensions so cells keep the sheet aspect ratio', () => {
    const layout = deriveLayout({
      sheetWidth: 1024,
      sheetHeight: 512,
      columns: 8,
      rows: 4,
      fitMode: 'contain',
    });

    expect(layout.isValid).toBe(false);
    expect(layout.validationMessage).toMatch(/columns and rows must match/i);
  });

  it('returns a valid layout for rectangular sheets with matching cell aspect ratio', () => {
    const layout = deriveLayout({
      sheetWidth: 1024,
      sheetHeight: 512,
      columns: 4,
      rows: 4,
      fitMode: 'contain',
    });

    expect(layout).toMatchObject({
      totalFrames: 16,
      cellWidth: 256,
      cellHeight: 128,
      outputWidth: 1024,
      outputHeight: 512,
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

describe('getValidGridOptions', () => {
  it('returns square grid options that evenly divide both selected sheet dimensions', () => {
    const options = getValidGridOptions(8, 4);

    expect(options).toEqual([
      { columns: 1, rows: 1, label: '1 x 1 (8 x 4px cells)' },
      { columns: 2, rows: 2, label: '2 x 2 (4 x 2px cells)' },
      { columns: 4, rows: 4, label: '4 x 4 (2 x 1px cells)' },
    ]);
  });
});
