import { OPTIONS, BG_COLORS, HAT_COLORS, DEFAULT_STATE, SIGN_MAX } from './options.js';
import { composeSVG, cropFor } from './compose.js';
import { normalizeState, encodeState, decodeState, randomState, cleanSign } from './state.js';
import { svgToPngBlob, downloadBlob } from './export.js';

// Which option groups live on which tab, and how each group is drawn.
// "thumb" groups show a mini potato per option; "swatch" groups show a color dot.
const TABS = {
  body: [
    { key: 'body', title: 'Shape', kind: 'thumb' },
    { key: 'skin', title: 'Skin', kind: 'thumb' },
  ],
  face: [
    { key: 'eyes', title: 'Eyes', kind: 'thumb' },
    { key: 'mouth', title: 'Mouth', kind: 'thumb' },
    { key: 'cheeks', title: 'Cheeks', kind: 'thumb' },
  ],
  hat: [
    { key: 'hat', title: 'Hat', kind: 'thumb' },
    { key: 'hatColor', title: 'Hat, mug & bow tie color', kind: 'swatch', colors: HAT_COLORS },
  ],
  gear: [
    { key: 'item', title: 'Holding', kind: 'thumb' },
    { key: 'gesture', title: 'Free hand', kind: 'thumb', onlyWhen: (s) => s.item === 'none', hint: 'Pick “Nothing” under Holding to free up a hand.' },
    { key: 'accessory', title: 'Accessory', kind: 'thumb' },
  ],
  bg: [
    { key: 'bg', title: 'Color', kind: 'swatch', colors: BG_COLORS },
    { key: 'pattern', title: 'Pattern', kind: 'thumb' },
  ],
};

let state = decodeState(location.hash);
let activeTab = 'body';

const $ = (sel) => document.querySelector(sel);
const preview = $('#preview');
const panel = $('#panel');
const toastEl = $('#toast');

function setState(patch) {
  state = normalizeState({ ...state, ...patch });
  const hash = encodeState(state);
  history.replaceState(null, '', hash || location.pathname + location.search);
  render();
}

function renderPreview() {
  preview.innerHTML = composeSVG(state, { idPrefix: 'main', size: 512 });
}

function optionButton(group, value, label) {
  const selected = state[group.key] === value;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `opt opt-${group.kind}`;
  btn.setAttribute('aria-pressed', String(selected));
  btn.dataset.key = group.key;
  btn.dataset.value = value;

  if (group.kind === 'swatch') {
    const dot = document.createElement('span');
    dot.className = 'swatch';
    dot.style.background = group.colors[value].value;
    btn.append(dot);
  } else {
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    const candidate = { ...state, [group.key]: value };
    thumb.innerHTML = composeSVG(candidate, {
      idPrefix: `t-${group.key}-${value}`,
      size: 88,
      viewBox: cropFor(group.key, candidate),
    });
    // The thumbnail's own aria-label would repeat; the text label below names it.
    thumb.firstElementChild?.setAttribute('aria-hidden', 'true');
    btn.append(thumb);
  }
  const text = document.createElement('span');
  text.className = 'opt-label';
  text.textContent = label;
  btn.append(text);
  return btn;
}

function renderPanel() {
  panel.replaceChildren();
  for (const group of TABS[activeTab]) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'group';
    const legend = document.createElement('legend');
    legend.textContent = group.title;
    fieldset.append(legend);

    if (group.onlyWhen && !group.onlyWhen(state)) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = group.hint;
      fieldset.append(hint);
      panel.append(fieldset);
      continue;
    }

    const grid = document.createElement('div');
    grid.className = `grid grid-${group.kind}`;
    for (const [value, label] of Object.entries(OPTIONS[group.key])) {
      grid.append(optionButton(group, value, label));
    }
    fieldset.append(grid);

    if (group.key === 'item' && state.item === 'sign') {
      const wrap = document.createElement('div');
      wrap.className = 'sign-field';
      wrap.innerHTML = `<label for="sign-input">Sign text</label>
<input id="sign-input" type="text" maxlength="${SIGN_MAX}" autocomplete="off" spellcheck="false">
<span class="hint">Up to ${SIGN_MAX} characters. Try LGTM, SHIP IT or 404.</span>`;
      const input = wrap.querySelector('input');
      input.value = state.sign;
      input.addEventListener('input', () => {
        const clean = cleanSign(input.value);
        if (clean !== input.value) input.value = clean;
        state = normalizeState({ ...state, sign: clean });
        history.replaceState(null, '', encodeState(state) || location.pathname);
        renderPreview();
      });
      fieldset.append(wrap);
    }
    panel.append(fieldset);
  }
}

function renderTabs() {
  for (const tab of document.querySelectorAll('[role="tab"]')) {
    const on = tab.dataset.tab === activeTab;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    if (on) panel.setAttribute('aria-labelledby', tab.id);
  }
}

function render() {
  renderPreview();
  renderTabs();
  // Keep focus on the option the person just picked after the panel redraws.
  const focused = document.activeElement;
  const refocus = focused?.classList?.contains('opt') ? [focused.dataset.key, focused.dataset.value] : null;
  renderPanel();
  if (refocus) panel.querySelector(`[data-key="${refocus[0]}"][data-value="${refocus[1]}"]`)?.focus();
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// --- events ---------------------------------------------------------------

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('.opt');
  if (btn) setState({ [btn.dataset.key]: btn.dataset.value });
});

const tablist = document.querySelector('[role="tablist"]');
tablist.addEventListener('click', (e) => {
  const tab = e.target.closest('[role="tab"]');
  if (!tab) return;
  activeTab = tab.dataset.tab;
  render();
});
tablist.addEventListener('keydown', (e) => {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const i = tabs.findIndex((t) => t.dataset.tab === activeTab);
  let next = null;
  if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
  if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
  if (e.key === 'Home') next = tabs[0];
  if (e.key === 'End') next = tabs[tabs.length - 1];
  if (!next) return;
  e.preventDefault();
  activeTab = next.dataset.tab;
  render();
  next.focus();
});

$('#crop-toggle').addEventListener('change', (e) => {
  preview.dataset.crop = e.target.checked ? 'on' : 'off';
});

$('#randomize').addEventListener('click', () => {
  state = randomState(Math.random, state.sign);
  setState({});
  preview.classList.remove('wiggle');
  void preview.offsetWidth; // restart the animation
  preview.classList.add('wiggle');
});

$('#reset').addEventListener('click', () => {
  state = normalizeState(DEFAULT_STATE);
  setState({});
  toast('Back to the original potato.');
});

$('#download-png').addEventListener('click', async () => {
  try {
    const blob = await svgToPngBlob(composeSVG(state, { idPrefix: 'export', size: 512 }), 512);
    downloadBlob(blob, 'potato-me.png');
    toast(`Saved potato-me.png (${Math.max(1, Math.round(blob.size / 1024))} KB)`);
  } catch (err) {
    toast('Download failed. Try the SVG instead.');
    console.error(err);
  }
});

$('#download-svg').addEventListener('click', () => {
  const svg = composeSVG(state, { idPrefix: 'export', size: 512 });
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'potato-me.svg');
  toast('Saved potato-me.svg');
});

$('#copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Link copied. Anyone with it gets this exact potato.');
  } catch {
    toast('Copy the address bar to share this potato.');
  }
});

window.addEventListener('hashchange', () => {
  state = decodeState(location.hash);
  render();
});

render();
