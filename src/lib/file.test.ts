import { describe, expect, it } from 'vitest';
import { createOutputFileName } from './file';

describe('createOutputFileName', () => {
  it('strips the extension and appends the configured suffix', () => {
    const fileName = createOutputFileName('muzzle flash.mov', {
      sheetSize: 1024,
      columns: 8,
      rows: 8,
      fitMode: 'contain',
    });

    expect(fileName).toBe('muzzle-flash-flipbook-1024-8x8.png');
  });
});
