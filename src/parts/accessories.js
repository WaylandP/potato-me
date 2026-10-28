// Worn accessories: eyewear, mustache, bow tie.
import { CX, INK, n, tint, shade } from '../draw.js';

export function accessory({ defs, b, state, hatColor }) {
  const y = b.face;
  const stroke = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
  switch (state.accessory) {
    case 'shades': {
      const lens = defs.linear('lens', 'd', [[0, '#3A3A46'], [0.5, '#1B1B22'], [1, '#0C0B0E']]);
      return `<g ${stroke}>
<path d="M${CX - 76} ${n(y - 18)} H${CX - 10} V${n(y + 4)} Q${CX - 12} ${n(y + 28)} ${CX - 43} ${n(y + 28)} Q${CX - 74} ${n(y + 28)} ${CX - 76} ${n(y + 4)} Z" fill="${lens}"/>
<path d="M${CX + 10} ${n(y - 18)} H${CX + 76} V${n(y + 4)} Q${CX + 74} ${n(y + 28)} ${CX + 43} ${n(y + 28)} Q${CX + 12} ${n(y + 28)} ${CX + 10} ${n(y + 4)} Z" fill="${lens}"/>
<path d="M${CX - 10} ${n(y - 12)} Q${CX} ${n(y - 18)} ${CX + 10} ${n(y - 12)}" fill="none"/>
<path d="M${CX - 76} ${n(y - 14)} L${CX - 106} ${n(y - 24)} M${CX + 76} ${n(y - 14)} L${CX + 106} ${n(y - 24)}" fill="none"/></g>
<path d="M${CX - 66} ${n(y - 8)} L${CX - 50} ${n(y - 8)} M${CX + 20} ${n(y - 8)} L${CX + 36} ${n(y - 8)}" stroke="#fff" stroke-opacity="0.6" stroke-width="4" stroke-linecap="round"/>
<path d="M${CX - 70} ${n(y + 2)} L${CX - 62} ${n(y + 2)} M${CX + 16} ${n(y + 2)} L${CX + 24} ${n(y + 2)}" stroke="#fff" stroke-opacity="0.3" stroke-width="3" stroke-linecap="round"/>`;
    }
    case 'glasses': {
      const glass = defs.linear('glass', 'd', [[0, '#FFFFFF', 0.4], [0.5, '#FFFFFF', 0.08], [1, '#FFFFFF', 0.28]]);
      return `<g ${stroke}>
<circle cx="${CX - 42}" cy="${n(y + 2)}" r="27" fill="${glass}"/><circle cx="${CX + 42}" cy="${n(y + 2)}" r="27" fill="${glass}"/>
<path d="M${CX - 15} ${n(y - 2)} Q${CX} ${n(y - 10)} ${CX + 15} ${n(y - 2)}" fill="none"/>
<path d="M${CX - 69} ${n(y - 4)} L${CX - 104} ${n(y - 16)} M${CX + 69} ${n(y - 4)} L${CX + 104} ${n(y - 16)}" fill="none"/></g>
<path d="M${CX - 58} ${n(y - 10)} Q${CX - 52} ${n(y - 18)} ${CX - 44} ${n(y - 20)} M${CX + 26} ${n(y - 10)} Q${CX + 32} ${n(y - 18)} ${CX + 40} ${n(y - 20)}" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="4" stroke-linecap="round"/>`;
    }
    case 'mustache':
      return `<path d="M${CX} ${n(y + 36)} C${CX - 14} ${n(y + 24)} ${CX - 44} ${n(y + 28)} ${CX - 54} ${n(y + 44)} C${CX - 60} ${n(y + 54)} ${CX - 70} ${n(y + 50)} ${CX - 72} ${n(y + 42)} C${CX - 66} ${n(y + 66)} ${CX - 30} ${n(y + 60)} ${CX} ${n(y + 44)} C${CX + 30} ${n(y + 60)} ${CX + 66} ${n(y + 66)} ${CX + 72} ${n(y + 42)} C${CX + 70} ${n(y + 50)} ${CX + 60} ${n(y + 54)} ${CX + 54} ${n(y + 44)} C${CX + 44} ${n(y + 28)} ${CX + 14} ${n(y + 24)} ${CX} ${n(y + 36)} Z" fill="#3B2416" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M${CX - 40} ${n(y + 36)} Q${CX - 24} ${n(y + 30)} ${CX - 8} ${n(y + 36)} M${CX + 8} ${n(y + 36)} Q${CX + 24} ${n(y + 30)} ${CX + 40} ${n(y + 36)}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="3" stroke-linecap="round"/>`;
    case 'bowtie': {
      const by = y + 106;
      const fill = defs.linear('bow', 'v', [[0, tint(hatColor, 0.18)], [1, shade(hatColor, 0.3)]]);
      return `<g ${stroke} fill="${fill}">
<path d="M${CX} ${by} L${CX - 44} ${by - 23} Q${CX - 50} ${by} ${CX - 44} ${by + 23} Z"/><path d="M${CX} ${by} L${CX + 44} ${by - 23} Q${CX + 50} ${by} ${CX + 44} ${by + 23} Z"/>
<rect x="${CX - 11}" y="${by - 12}" width="22" height="24" rx="6"/></g>
<path d="M${CX - 36} ${n(by - 14)} L${CX - 16} ${n(by - 4)} M${CX + 36} ${n(by - 14)} L${CX + 16} ${n(by - 4)}" stroke="${INK}" stroke-opacity="0.3" stroke-width="3" stroke-linecap="round"/>
<path d="M${CX - 6} ${n(by - 6)} V${n(by + 2)}" stroke="#fff" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round"/>`;
    }
    default:
      return '';
  }
}
