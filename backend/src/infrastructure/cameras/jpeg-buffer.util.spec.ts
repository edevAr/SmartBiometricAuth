import { extractJpegBuffer } from './jpeg-buffer.util';

describe('extractJpegBuffer', () => {
  it('devuelve buffer original si no hay SOI', () => {
    const b = Buffer.from([0, 1, 2, 3]);
    expect(extractJpegBuffer(b)).toEqual(b);
  });

  it('recorta entre SOI y EOI', () => {
    const junk = Buffer.from([0, 0, 0]);
    const jpeg = Buffer.concat([junk, Buffer.from([0xff, 0xd8, 1, 2, 0xff, 0xd9])]);
    const out = extractJpegBuffer(jpeg);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    expect(out[out.length - 2]).toBe(0xff);
    expect(out[out.length - 1]).toBe(0xd9);
  });

  it('sin EOI devuelve desde SOI hasta el final', () => {
    const b = Buffer.from([0xff, 0xd8, 0, 1, 2]);
    const out = extractJpegBuffer(b);
    expect(out.length).toBe(5);
  });
});
