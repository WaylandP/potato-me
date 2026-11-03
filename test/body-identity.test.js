import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { SKINS } from '../src/options.js';

// Read the actual source alpha, independently of the app's fitting code. A
// distinct filename and a valid checksum did not catch the oval Zombie Lumpy.
function sourceAlpha(png) {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(png[24], 8);
  assert.equal(png[25], 6);
  assert.equal(png[28], 0, 'uninterlaced RGBA source required');
  const chunks = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  const pixels = new Uint8Array(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.ok(filter >= 0 && filter <= 4);
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x;
      const a = x >= 4 ? pixels[at - 4] : 0, b = y ? pixels[at - stride] : 0, c = x >= 4 && y ? pixels[at - stride - 4] : 0;
      const predicted = filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : filter === 4 ? paeth(a, b, c) : 0;
      pixels[at] = raw[y * (stride + 1) + 1 + x] + predicted;
    }
  }
  return { width, pixels };
}

test('Lumpy retains a distinct body outline from Classic in every skin', async () => {
  for (const skin of Object.keys(SKINS)) {
    const [classic, lumpy] = await Promise.all(['classic', 'lumpy'].map(async shape => sourceAlpha(await readFile(new URL(`../assets/parts/body/${shape}-${skin}.png`, import.meta.url)))));
    let difference = 0, samples = 0;
    for (let y = 200; y <= 750; y++) {
      const edges = [classic, lumpy].map(({ width, pixels }) => {
        let left = width, right = -1;
        for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] > 240) { left = Math.min(left, x); right = x; }
        return [left, right];
      });
      if (edges.some(([left, right]) => right < left)) continue;
      difference += Math.abs(edges[0][0] - edges[1][0]) + Math.abs(edges[0][1] - edges[1][1]);
      samples += 2;
    }
    assert.ok(samples > 900, `${skin}: measurable torso silhouette required`);
    assert.ok(difference / samples > 7, `${skin}: Lumpy is nearly the same oval as Classic (${(difference / samples).toFixed(2)} px mean contour difference)`);
  }
});
