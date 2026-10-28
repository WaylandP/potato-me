// Face parts. Everything hangs off b.face (the eye line).
import { CX, INK, n } from '../draw.js';

export function cheeks({ defs, b, state }) {
  if (state.cheeks !== 'on') return '';
  const fill = defs.radialBox('blush', [[0, '#F2836F', 0.72], [1, '#F2836F', 0]]);
  const y = n(b.face + 36);
  return `<ellipse cx="${CX - 78}" cy="${y}" rx="26" ry="15" fill="${fill}"/><ellipse cx="${CX + 78}" cy="${y}" rx="26" ry="15" fill="${fill}"/>`;
}

export function eyes({ b, skin, skinFill, state }) {
  const y = b.face;
  const xs = [CX - 42, CX + 42];
  const dot = (x) =>
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="13.5" ry="17.5" fill="${INK}"/><circle cx="${n(x - 4.5)}" cy="${n(y - 6.5)}" r="5" fill="#fff"/><circle cx="${n(x + 4.5)}" cy="${n(y + 6)}" r="2.4" fill="#fff" fill-opacity="0.85"/>`;
  const arc = (x) =>
    `<path d="M${n(x - 17)} ${n(y + 7)} Q${n(x)} ${n(y - 17)} ${n(x + 17)} ${n(y + 7)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
  switch (state.eyes) {
    case 'dots':
      return xs.map(dot).join('');
    case 'happy':
      return xs.map(arc).join('');
    case 'wide':
      return xs
        .map(
          (x) =>
            `<ellipse cx="${n(x)}" cy="${n(y)}" rx="22" ry="26" fill="#fff" stroke="${INK}" stroke-width="4.5"/><circle cx="${n(x + 3)}" cy="${n(y + 4)}" r="12" fill="#5A3A22"/><circle cx="${n(x + 3)}" cy="${n(y + 4)}" r="8" fill="${INK}"/><circle cx="${n(x - 1)}" cy="${n(y - 1)}" r="3.8" fill="#fff"/>`,
        )
        .join('');
    case 'wink':
      return dot(xs[0]) + `<path d="M${n(xs[1] - 16)} ${n(y)} Q${n(xs[1])} ${n(y + 13)} ${n(xs[1] + 16)} ${n(y)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
    case 'sleepy':
      return xs
        .map(
          (x) =>
            `<path d="M${n(x - 16)} ${n(y)} Q${n(x)} ${n(y + 19)} ${n(x + 16)} ${n(y)} Z" fill="${INK}"/><path d="M${n(x - 19)} ${n(y - 1)} Q${n(x)} ${n(y + 4)} ${n(x + 19)} ${n(y - 1)}" fill="none" stroke="${skin.line}" stroke-width="5" stroke-linecap="round"/>`,
        )
        .join('');
    case 'smug':
    default: {
      // Half-lidded eyes plus one cocked eyebrow: the house smirk.
      const lids = xs
        .map((x, i) => {
          const tilt = i === 0 ? -3 : 3;
          return `<path d="M${n(x - 18)} ${n(y - 1 + tilt)} C${n(x - 18)} ${n(y - 26)} ${n(x + 18)} ${n(y - 26)} ${n(x + 18)} ${n(y - 1 - tilt)} Z" fill="${skinFill}"/>
<path d="M${n(x - 17)} ${n(y - 1 + tilt)} L${n(x + 17)} ${n(y - 1 - tilt)}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
        })
        .join('');
      const brows = `<path d="M${n(xs[0] - 18)} ${n(y - 30)} Q${n(xs[0])} ${n(y - 46)} ${n(xs[0] + 18)} ${n(y - 36)}" fill="none" stroke="${skin.line}" stroke-width="6" stroke-linecap="round"/>
<path d="M${n(xs[1] - 18)} ${n(y - 28)} Q${n(xs[1])} ${n(y - 32)} ${n(xs[1] + 18)} ${n(y - 27)}" fill="none" stroke="${skin.line}" stroke-width="6" stroke-linecap="round"/>`;
      return xs.map(dot).join('') + lids + brows;
    }
  }
}

export function mouth({ b, state }) {
  const x = CX;
  const y = b.face + 54;
  switch (state.mouth) {
    case 'grin':
      return `<path d="M${x - 40} ${n(y - 8)} Q${x} ${n(y + 48)} ${x + 40} ${n(y - 8)} Z" fill="${INK}"/>
<path d="M${x - 32} ${n(y - 5)} H${x + 32} L${x + 27} ${n(y + 7)} Q${x} ${n(y + 11)} ${x - 27} ${n(y + 7)} Z" fill="#fff"/>
<path d="M${x} ${n(y - 5)} V${n(y + 9)}" stroke="#D7D7D7" stroke-width="1.5"/>
<path d="M${x - 15} ${n(y + 24)} Q${x} ${n(y + 14)} ${x + 15} ${n(y + 24)} Q${x} ${n(y + 38)} ${x - 15} ${n(y + 24)} Z" fill="#E26B6B"/>
<path d="M${x - 40} ${n(y - 8)} Q${x} ${n(y + 48)} ${x + 40} ${n(y - 8)} Z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'laugh':
      return `<path d="M${x - 25} ${n(y - 6)} Q${x} ${n(y + 2)} ${x + 25} ${n(y - 6)} Q${x + 27} ${n(y + 30)} ${x} ${n(y + 32)} Q${x - 27} ${n(y + 30)} ${x - 25} ${n(y - 6)} Z" fill="${INK}"/>
<ellipse cx="${x}" cy="${n(y + 22)}" rx="13" ry="8" fill="#E26B6B"/><ellipse cx="${n(x - 3)}" cy="${n(y + 19)}" rx="5" ry="2.5" fill="#F2A3A3"/>
<path d="M${x - 25} ${n(y - 6)} Q${x} ${n(y + 2)} ${x + 25} ${n(y - 6)} Q${x + 27} ${n(y + 30)} ${x} ${n(y + 32)} Q${x - 27} ${n(y + 30)} ${x - 25} ${n(y - 6)} Z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'flat':
      return `<path d="M${x - 22} ${n(y + 4)} L${x + 22} ${n(y + 4)}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
    case 'oh':
      return `<ellipse cx="${x}" cy="${n(y + 4)}" rx="10" ry="13" fill="${INK}"/><ellipse cx="${n(x - 3)}" cy="${n(y - 2)}" rx="3" ry="2" fill="#fff" fill-opacity="0.35"/>`;
    case 'smirk':
    default:
      return `<path d="M${x - 30} ${n(y + 2)} Q${x + 2} ${n(y + 18)} ${x + 30} ${n(y - 10)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M${x + 27} ${n(y - 17)} Q${x + 34} ${n(y - 10)} ${x + 33} ${n(y - 2)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }
}
