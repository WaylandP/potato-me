// Split measured rear surfaces from the original PNG. Both pieces retain the
// same transform; the wearer itself supplies their overlap, at every body size.
import { CANVAS } from './assets.js';
import { FIT } from './fit-data.js';

export function wrapSpec(group, key, state) {
  // A band worn over a closed cap/beanie must stay above that hat. Open
  // headwear and bare heads allow the hair (including buns) to overlap it.
  if (group === 'extra' && key === 'headphones' &&
      FIT.headphonesOver.includes(state.hat) && !['headband', 'halo'].includes(state.hat)) return null;
  return FIT.wrap[`${group}/${key}`] || null;
}

const splitImages = new WeakMap();
export function splitWearable(img, group, key, state) {
  const spec = wrapSpec(group, key, state);
  if (!spec) return { front: img };
  let cache = splitImages.get(img);
  if (!cache) { cache = new Map(); splitImages.set(img, cache); }
  if (cache.has(spec)) return cache.get(spec);
  const size = img.naturalWidth || img.width;
  const make = () => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    return c;
  };
  const front = make(), rear = make(), mask = make();
  const f = front.getContext('2d'), r = rear.getContext('2d'), m = mask.getContext('2d');
  const path = new Path2D(spec.path);
  m.scale(size / CANVAS, size / CANVAS); m.fill(path);
  f.drawImage(img, 0, 0); f.globalCompositeOperation = 'destination-out'; f.drawImage(mask, 0, 0);
  // A subpixel overlap avoids a pale seam between the complementary pieces
  // outside the wearer. It cannot restore the rear inside the head or hair.
  m.lineWidth = 1.6; m.stroke(path);
  r.drawImage(img, 0, 0); r.globalCompositeOperation = 'destination-in'; r.drawImage(mask, 0, 0);
  const result = { front, rear, behind: spec.behind };
  cache.set(spec, result); return result;
}
