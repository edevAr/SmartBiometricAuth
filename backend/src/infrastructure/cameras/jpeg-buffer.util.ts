/**
 * Muchas cámaras IP envuelven el JPEG con bytes extra; TensorFlow/libjpeg
 * avisa o decodifica mal. Recorta al primer SOI…EOI válido.
 */
export function extractJpegBuffer(buf: Buffer): Buffer {
  let start = -1;
  for (let i = 0; i <= buf.length - 2; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8) {
      start = i;
      break;
    }
  }
  if (start < 0) {
    return buf;
  }
  let end = -1;
  for (let i = buf.length - 2; i >= start; i--) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd9) {
      end = i + 2;
      break;
    }
  }
  if (end < 0) {
    return buf.subarray(start);
  }
  return buf.subarray(start, end);
}
