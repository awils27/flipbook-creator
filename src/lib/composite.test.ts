import { describe, expect, it, vi } from 'vitest';
import { calculateContainPlacement, drawFrameToCell } from './composite';

describe('calculateContainPlacement', () => {
  it('centers a wide frame inside a rectangular cell', () => {
    const placement = calculateContainPlacement(200, 100, 128, 64);

    expect(placement.width).toBe(128);
    expect(placement.height).toBe(64);
    expect(placement.x).toBe(0);
    expect(placement.y).toBe(0);
  });
});

describe('drawFrameToCell', () => {
  it('stretches the frame to fill the cell', () => {
    const drawImage = vi.fn();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;
    const source = { width: 32, height: 64 } as CanvasImageSource;

    drawFrameToCell({
      context,
      source,
      x: 16,
      y: 24,
      cellWidth: 128,
      cellHeight: 64,
      fitMode: 'stretch',
    });

    expect(drawImage).toHaveBeenCalledWith(source, 16, 24, 128, 64);
  });
});
