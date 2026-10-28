// Hats, plus the shadow each one casts on the head. Hats scale with b.hatScale.
import { CX, INK, n, tint, shade, union, star } from '../draw.js';

export const HAT_BRIM = { backwardCap: 34, beanie: 48, wizard: 52, crown: 36, hardhat: 42, party: 30, beret: 34 };

export function hatShadow({ defs, b, state }) {
  if (state.hat === 'none') return '';
  const s = b.hatScale;
  const y0 = b.top + (HAT_BRIM[state.hat] - 8) * s;
  const fill = defs.linear('hs', 'v', [[0, INK, 0.3], [1, INK, 0]]);
  return `<g clip-path="url(#${defs.id('body')})"><rect x="${CX - 200}" y="${n(y0)}" width="400" height="${n(70 * s)}" fill="${fill}"/></g>`;
}

export function hat({ defs, b, state, skin, hatColor: color }) {
  if (state.hat === 'none') return '';
  const t = b.top;
  const stroke = `stroke="${INK}" stroke-width="6" stroke-linejoin="round"`;
  const gloss = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.32" stroke-width="7" stroke-linecap="round"/>`;
  // Keep highlights and decals inside the hat's main shape, whatever the hat color.
  const inside = (shape, inner) => {
    const id = defs.id('hatclip');
    defs.add(`<clipPath id="${id}"><path d="${shape}"/></clipPath>`);
    return `<g clip-path="url(#${id})">${inner}</g>`;
  };
  let g = '';
  switch (state.hat) {
    case 'backwardCap': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.18)], [0.5, color], [1, shade(color, 0.3)]]);
      const dome = `M${CX - 98} ${t + 34} C${CX - 102} ${t - 64} ${CX + 102} ${t - 64} ${CX + 98} ${t + 34} Z`;
      g = `<path d="M${CX + 60} ${t + 10} Q${CX + 150} ${t - 24} ${CX + 170} ${t + 8} Q${CX + 128} ${t + 34} ${CX + 78} ${t + 32} Z" fill="${shade(color, 0.22)}" ${stroke}/>
<path d="${dome}" fill="${fill}" ${stroke}/>
${inside(dome, `<path d="M${CX} ${t - 40} Q${CX - 44} ${t - 20} ${CX - 64} ${t + 34} M${CX} ${t - 40} Q${CX + 44} ${t - 20} ${CX + 64} ${t + 34}" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>${gloss(`M${CX - 70} ${t - 8} Q${CX - 50} ${t - 32} ${CX - 22} ${t - 40}`)}`)}
<path d="M${CX - 28} ${t + 34} Q${CX} ${t - 2} ${CX + 28} ${t + 34} Z" fill="${skin.shade}" ${stroke}/>
<rect x="${CX - 34}" y="${t + 13}" width="68" height="11" rx="5" fill="${INK}"/>
<circle cx="${CX - 20}" cy="${t + 18.5}" r="2" fill="#fff" fill-opacity="0.45"/><circle cx="${CX}" cy="${t + 18.5}" r="2" fill="#fff" fill-opacity="0.45"/><circle cx="${CX + 20}" cy="${t + 18.5}" r="2" fill="#fff" fill-opacity="0.45"/>
<circle cx="${CX}" cy="${t - 40}" r="7" fill="${color}" ${stroke}/>`;
      break;
    }
    case 'beanie': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.16)], [0.5, color], [1, shade(color, 0.28)]]);
      const ribs = [];
      for (let x = CX - 84; x <= CX + 84; x += 14) ribs.push(`M${x} ${t + 13} V${t + 41}`);
      const pom = [[0, 0, 22], [-16, -12, 10], [16, -12, 10], [-20, 8, 9], [20, 8, 9], [0, -21, 10], [-6, 19, 9], [9, 18, 9]]
        .map(([dx, dy, r]) => `<circle cx="${CX + dx}" cy="${t - 84 + dy}" r="${r}"/>`)
        .join('');
      const dome = `M${CX - 96} ${t + 30} C${CX - 100} ${t - 80} ${CX + 100} ${t - 80} ${CX + 96} ${t + 30} Z`;
      g = `<path d="${dome}" fill="${fill}" ${stroke}/>
${inside(dome, `<path d="M${CX - 46} ${t - 42} Q${CX - 52} ${t - 10} ${CX - 54} ${t + 22} M${CX} ${t - 52} V${t + 22} M${CX + 46} ${t - 42} Q${CX + 52} ${t - 10} ${CX + 54} ${t + 22}" fill="none" stroke="${INK}" stroke-opacity="0.2" stroke-width="4" stroke-linecap="round"/>${gloss(`M${CX - 72} ${t - 24} Q${CX - 52} ${t - 48} ${CX - 24} ${t - 54}`)}`)}
<rect x="${CX - 104}" y="${t + 6}" width="208" height="42" rx="16" fill="${fill}" ${stroke}/>
<path d="${ribs.join(' ')}" stroke="${INK}" stroke-opacity="0.2" stroke-width="3" stroke-linecap="round"/>
${union(pom, '#F4F1EA', INK)}
<path d="M${CX - 10} ${t - 96} Q${CX - 2} ${t - 104} ${CX + 8} ${t - 100}" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="4" stroke-linecap="round"/>`;
      break;
    }
    case 'wizard': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.18)], [0.45, color], [1, shade(color, 0.32)]]);
      const brim = defs.linear('brim', 'v', [[0, tint(color, 0.12)], [1, shade(color, 0.32)]]);
      const gold = '#F5C542';
      const cone = `M${CX - 88} ${t + 26} C${CX - 50} ${t - 40} ${CX - 10} ${t - 100} ${CX + 10} ${t - 126} C${CX + 18} ${t - 142} ${CX + 48} ${t - 150} ${CX + 58} ${t - 132} C${CX + 44} ${t - 132} ${CX + 36} ${t - 120} ${CX + 36} ${t - 106} C${CX + 46} ${t - 60} ${CX + 70} ${t - 20} ${CX + 88} ${t + 26} Z`;
      g = `<ellipse cx="${CX}" cy="${t + 28}" rx="138" ry="24" fill="${brim}" ${stroke}/>
<path d="${cone}" fill="${fill}" ${stroke}/>
${inside(cone, `<path d="${star(CX - 24, t - 50, 13)}" fill="${gold}"/><path d="${star(CX + 22, t - 90, 8)}" fill="${gold}"/><path d="${star(CX + 18, t - 112, 4.5)}" fill="${gold}"/>
<path d="M${CX + 38} ${t - 42} a10 10 0 1 0 8 14 a7 7 0 1 1 -8 -14 Z" fill="${gold}"/>
${gloss(`M${CX - 60} ${t - 22} Q${CX - 42} ${t - 60} ${CX - 14} ${t - 96}`)}`)}
<path d="M${CX - 70} ${t - 12} Q${CX} ${t + 6} ${CX + 70} ${t - 12} L${CX + 78} ${t + 12} Q${CX} ${t + 30} ${CX - 78} ${t + 12} Z" fill="${shade(color, 0.42)}" ${stroke}/>
<rect x="${CX - 14}" y="${t - 8}" width="28" height="24" rx="4" fill="${gold}" ${stroke.replace('6', '4')}/>
<rect x="${CX - 6}" y="${t - 1}" width="12" height="10" rx="2" fill="${shade(color, 0.42)}"/>`;
      break;
    }
    case 'crown': {
      const gold = defs.linear('hat', 'v', [[0, '#FBD75B'], [0.55, '#F2B632'], [1, '#C98A14']]);
      const velvet = defs.linear('velvet', 'h', [[0, tint(color, 0.16)], [1, shade(color, 0.3)]]);
      const points = `M${CX - 82} ${t + 12} L${CX - 88} ${t - 50} L${CX - 44} ${t - 12} L${CX} ${t - 72} L${CX + 44} ${t - 12} L${CX + 88} ${t - 50} L${CX + 82} ${t + 12} Z`;
      const gem = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="3.5"/><circle cx="${n(x - r * 0.35)}" cy="${n(y - r * 0.35)}" r="${n(r * 0.28)}" fill="#fff" fill-opacity="0.85"/>`;
      g = `<path d="M${CX - 72} ${t + 14} C${CX - 70} ${t - 32} ${CX + 70} ${t - 32} ${CX + 72} ${t + 14} Z" fill="${velvet}" ${stroke}/>
<path d="${points}" fill="${gold}" ${stroke}/>
${inside(points, gloss(`M${CX - 76} ${t + 4} L${CX - 82} ${t - 38}`))}
<circle cx="${CX - 88}" cy="${t - 52}" r="7" fill="#FBD75B" ${stroke}/><circle cx="${CX}" cy="${t - 74}" r="8" fill="#FBD75B" ${stroke}/><circle cx="${CX + 88}" cy="${t - 52}" r="7" fill="#FBD75B" ${stroke}/>
<rect x="${CX - 88}" y="${t + 6}" width="176" height="30" rx="8" fill="${gold}" ${stroke}/>
${gem(CX, t + 21, 10, '#D9342B')}${gem(CX - 52, t + 21, 7, '#2D7DD2')}${gem(CX + 52, t + 21, 7, '#2D7DD2')}
<circle cx="${CX - 26}" cy="${t + 21}" r="4" fill="#3FA86B" stroke="${INK}" stroke-width="2.5"/><circle cx="${CX + 26}" cy="${t + 21}" r="4" fill="#3FA86B" stroke="${INK}" stroke-width="2.5"/>`;
      break;
    }
    case 'hardhat': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.22)], [0.5, color], [1, shade(color, 0.3)]]);
      const dome = `M${CX - 94} ${t + 22} C${CX - 98} ${t - 74} ${CX + 98} ${t - 74} ${CX + 94} ${t + 22} Z`;
      g = `<path d="${dome}" fill="${fill}" ${stroke}/>
${inside(dome, gloss(`M${CX - 74} ${t - 10} Q${CX - 60} ${t - 36} ${CX - 36} ${t - 44}`))}
<path d="M${CX - 18} ${t - 50} Q${CX} ${t - 58} ${CX + 18} ${t - 50} V${t + 22} H${CX - 18} Z" fill="${tint(color, 0.14)}" ${stroke}/>
<path d="M${CX - 126} ${t + 22} H${CX + 126} Q${CX + 128} ${t + 42} ${CX + 106} ${t + 42} H${CX - 106} Q${CX - 128} ${t + 42} ${CX - 126} ${t + 22} Z" fill="${fill}" ${stroke}/>
<path d="M${CX - 116} ${t + 31} H${CX + 116}" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>
<path d="M${CX - 62} ${t - 2} h14 M${CX + 48} ${t - 2} h14" stroke="${INK}" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round"/>`;
      break;
    }
    case 'party': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.2)], [0.5, color], [1, shade(color, 0.3)]]);
      const cone = `M${CX - 72} ${t + 30} L${CX + 6} ${t - 124} L${CX + 76} ${t + 30} Z`;
      const pom = [[0, 0, 13], [-9, -8, 7], [9, -8, 7], [-11, 5, 6], [11, 5, 6], [0, -13, 6], [0, 12, 6]]
        .map(([dx, dy, r]) => `<circle cx="${CX + 6 + dx}" cy="${t - 128 + dy}" r="${r}"/>`)
        .join('');
      g = `<path d="${cone}" fill="${fill}" ${stroke}/>
${inside(cone, `<path d="M${CX - 110} ${t + 4} L${CX + 70} ${t - 70} M${CX - 90} ${t + 40} L${CX + 110} ${t - 40}" stroke="#fff" stroke-opacity="0.45" stroke-width="14"/>`)}
<path d="${cone}" fill="none" ${stroke}/>
<circle cx="${CX - 22}" cy="${t + 8}" r="5" fill="#fff" fill-opacity="0.8"/><circle cx="${CX + 26}" cy="${t - 30}" r="4" fill="#fff" fill-opacity="0.8"/><circle cx="${CX + 36}" cy="${t + 12}" r="4.5" fill="#fff" fill-opacity="0.8"/>
${union(pom, '#F4F1EA', INK)}`;
      break;
    }
    case 'beret': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.18)], [0.5, color], [1, shade(color, 0.3)]]);
      const disc = `M${CX - 100} ${t + 24} C${CX - 118} ${t - 36} ${CX + 50} ${t - 84} ${CX + 118} ${t - 10} C${CX + 128} ${t + 16} ${CX + 60} ${t + 34} ${CX - 20} ${t + 36} C${CX - 60} ${t + 36} ${CX - 92} ${t + 34} ${CX - 100} ${t + 24} Z`;
      g = `<path d="${disc}" fill="${fill}" ${stroke}/>
${inside(disc, `<path d="M${CX - 94} ${t + 26} C${CX - 60} ${t + 14} ${CX + 20} ${t + 10} ${CX + 108} ${t - 2}" fill="none" stroke="${INK}" stroke-opacity="0.25" stroke-width="4"/>${gloss(`M${CX - 66} ${t - 8} Q${CX - 30} ${t - 44} ${CX + 12} ${t - 50}`)}`)}
<path d="M${CX - 4} ${t - 56} q2 -14 14 -18" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
      break;
    }
    default:
      return '';
  }
  const s = b.hatScale;
  return s === 1 ? g : `<g transform="translate(${CX} ${t}) scale(${s}) translate(${-CX} ${-t})">${g}</g>`;
}
