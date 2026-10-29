import { OPTIONS, MULTI, TEXT, PRESETS, BG_COLORS, HAT_COLORS, STICKERS, DEFAULT_STATE } from './options.js';
import { encodeState, decodeState, cleanText } from './state.js';
import { surprise } from './surprise.js';
import { renderPotato, exportPng, availableOptions, missingParts, drawableState, cropBox, hasSticker, partSrc } from './raster.js';
import { downloadBlob } from './export.js';
import { stickerSVG } from './parts/stickers.js';

// Which option groups live on which tab, and how each group is drawn.
//   thumb   one mini potato per option
//   swatch  a color dot per option
//   multi   toggle buttons, pick several (MULTI in options.js)
//   text    a short text field (TEXT in options.js)
//   preset  one-click personalities (PRESETS in options.js)
// `onlyWhen` hides a group (showing `hint` instead) until the state makes it relevant.
const CAP_TEXT_HATS = ['backwardCap', 'cap', 'beanie', 'headband'];
const TABS = {
  body: [
    { key: 'body', title: 'Shape', kind: 'thumb' },
    { key: 'skin', title: 'Skin', kind: 'thumb' },
  ],
  face: [
    { key: 'preset', title: 'Vibe', kind: 'preset', hint: 'One click sets the eyes, eyebrows and mouth. Tweak from there.' },
    { key: 'eyes', title: 'Eyes', kind: 'thumb' },
    { key: 'brows', title: 'Eyebrows', kind: 'thumb' },
    { key: 'mouth', title: 'Mouth', kind: 'thumb' },
    { key: 'cheeks', title: 'Cheeks', kind: 'thumb' },
    { key: 'facialHair', title: 'Facial hair', kind: 'thumb' },
  ],
  hat: [
    { key: 'hat', title: 'Hat', kind: 'thumb' },
    { key: 'hatColor', title: 'Hat, mug & tie color', kind: 'swatch', colors: HAT_COLORS },
    {
      key: 'capText',
      title: 'Cap initials',
      kind: 'text',
      placeholder: 'A+W',
      onlyWhen: (s) => CAP_TEXT_HATS.includes(s.hat),
      hint: 'Pick a cap, beanie or headband to embroider up to 3 characters on it.',
      help: 'Up to 3 characters, embroidered on the hat.',
    },
  ],
  gear: [
    { key: 'item', title: 'Holding', kind: 'thumb' },
    { key: 'stickers', title: 'Laptop stickers', kind: 'multi', onlyWhen: (s) => s.item === 'laptop', hint: 'Hold the laptop to pick its stickers.', help: 'Pick up to 6, in the order you want them.' },
    { key: 'sign', title: 'Sign text', kind: 'text', placeholder: 'LGTM', onlyWhen: (s) => s.item === 'sign', hint: 'Hold the sign to write on it.', help: 'Up to 10 characters. Try LGTM, SHIP IT or 404.' },
    { key: 'gesture', title: 'Free hand', kind: 'thumb' },
    { key: 'eyewear', title: 'Eyewear', kind: 'thumb' },
    { key: 'neckwear', title: 'Neckwear', kind: 'thumb' },
    { key: 'extra', title: 'Extras', kind: 'thumb' },
  ],
  bg: [
    { key: 'bg', title: 'Color', kind: 'swatch', colors: BG_COLORS },
    { key: 'pattern', title: 'Pattern', kind: 'thumb' },
  ],
};

const AVAILABLE = availableOptions();
const MISSING = missingParts();

let state = drawableState(decodeState(location.hash));
let activeTab = 'body';

const $ = (sel) => document.querySelector(sel);
const preview = $('#preview');
const panel = $('#panel');
const toastEl = $('#toast');
const previewCanvas = document.createElement('canvas');
previewCanvas.width = previewCanvas.height = 1024;
preview.append(previewCanvas);

function commit(next, { redraw = true } = {}) {
  state = drawableState(next);
  const hash = encodeState(state);
  history.replaceState(null, '', hash || location.pathname + location.search);
  if (redraw) render();
  else renderPreview();
}

const setState = (patch) => commit({ ...state, ...patch });

// --- preview ----------------------------------------------------------------

let previewToken = 0;
async function renderPreview() {
  const token = ++previewToken;
  document.body.dataset.rendered = 'false';
  preview.classList.add('is-loading');
  try {
    const frame = await renderPotato(state, { size: 1024 });
    if (token !== previewToken) return; // a newer render finished first
    previewCanvas.getContext('2d').drawImage(frame, 0, 0);
    preview.classList.remove('is-loading', 'is-failed');
    document.body.dataset.rendered = 'true';
  } catch (err) {
    if (token !== previewToken) return;
    preview.classList.remove('is-loading');
    preview.classList.add('is-failed');
    console.error(err);
    toast('Some parts failed to load. Check your connection and reload.');
  }
}

// --- option buttons ---------------------------------------------------------

function button(group, value, label, selected, visual) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `opt opt-${group.kind}`;
  btn.setAttribute('aria-pressed', String(selected));
  btn.dataset.key = group.key;
  btn.dataset.value = value;
  btn.append(visual);
  const text = document.createElement('span');
  text.className = 'opt-label';
  text.textContent = label;
  btn.append(text);
  return btn;
}

const thumbJobs = [];
let thumbTimer = null;
/** Thumbnails render lazily, a few per frame, so the panel appears at once and fills in. */
function queueThumb(holder, candidate, category) {
  thumbJobs.push([holder, candidate, category]);
  if (!thumbTimer) thumbTimer = requestAnimationFrame(drainThumbs);
}
async function drainThumbs() {
  thumbTimer = null;
  const batch = thumbJobs.splice(0, 6);
  await Promise.all(
    batch.map(async ([holder, candidate, category]) => {
      if (!holder.isConnected) return;
      try {
        const c = await renderPotato(candidate, { size: 176, crop: cropBox(category), thumbs: true });
        c.setAttribute('aria-hidden', 'true');
        holder.replaceChildren(c);
      } catch {
        holder.classList.add('thumb-failed');
      }
    }),
  );
  if (thumbJobs.length) thumbTimer = requestAnimationFrame(drainThumbs);
}

function potatoThumb(candidate, category) {
  const holder = document.createElement('span');
  holder.className = 'thumb';
  queueThumb(holder, candidate, category);
  return holder;
}

function stickerThumb(key) {
  const holder = document.createElement('span');
  holder.className = 'thumb thumb-flat';
  if (hasSticker(key)) {
    const img = document.createElement('img');
    img.src = partSrc('stickers', key, true);
    img.alt = '';
    img.decoding = 'async';
    holder.append(img);
  } else {
    holder.innerHTML = stickerSVG(key, 88);
    holder.firstElementChild?.setAttribute('aria-hidden', 'true');
  }
  return holder;
}

function optionButton(group, value, label) {
  if (group.kind === 'swatch') {
    const dot = document.createElement('span');
    dot.className = 'swatch';
    dot.style.background = group.colors[value].value;
    return button(group, value, label, state[group.key] === value, dot);
  }
  if (group.kind === 'multi') {
    const picked = state[group.key].includes(value);
    return button(group, value, label, picked, group.key === 'stickers' ? stickerThumb(value) : potatoThumb({ ...state, [group.key]: [value] }, group.key));
  }
  if (group.kind === 'preset') {
    const patch = presetPatch(value);
    const active = Object.entries(patch).every(([k, v]) => state[k] === v);
    return button(group, value, label, active, potatoThumb({ ...state, ...patch }, group.key));
  }
  return button(group, value, label, state[group.key] === value, potatoThumb({ ...state, [group.key]: value }, group.key));
}

/** A preset's patch with any part that has no image yet left out. */
function presetPatch(name) {
  const out = {};
  for (const [k, v] of Object.entries(PRESETS[name].patch)) if (!(k in AVAILABLE) || v in AVAILABLE[k]) out[k] = v;
  return out;
}

function textField(group) {
  const spec = TEXT[group.key];
  const wrap = document.createElement('div');
  wrap.className = 'text-field';
  const id = `${group.key}-input`;
  wrap.innerHTML = `<label for="${id}">${group.title}</label>
<input id="${id}" type="text" maxlength="${spec.max}" autocomplete="off" spellcheck="false" placeholder="${group.placeholder || ''}">
<span class="hint">${group.help || ''}</span>`;
  const input = wrap.querySelector('input');
  input.value = state[group.key];
  input.addEventListener('input', () => {
    const clean = cleanText(group.key, input.value);
    if (clean !== input.value) input.value = clean;
    // Redraw only the preview so the field keeps focus while typing.
    commit({ ...state, [group.key]: clean }, { redraw: false });
  });
  return wrap;
}

function note(text, className = 'hint') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  return p;
}

function renderPanel() {
  panel.replaceChildren();
  thumbJobs.length = 0;
  for (const group of TABS[activeTab]) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'group';
    const legend = document.createElement('legend');
    legend.textContent = group.title;
    fieldset.append(legend);

    if (group.onlyWhen && !group.onlyWhen(state)) {
      fieldset.append(note(group.hint));
      panel.append(fieldset);
      continue;
    }

    if (group.kind === 'text') {
      fieldset.append(textField(group));
      panel.append(fieldset);
      continue;
    }

    if (group.hint && group.kind === 'preset') fieldset.append(note(group.hint));

    const grid = document.createElement('div');
    grid.className = `grid grid-${group.kind}`;
    const entries =
      group.kind === 'multi'
        ? Object.entries(MULTI[group.key].options)
        : group.kind === 'preset'
          ? Object.entries(PRESETS).map(([k, v]) => [k, v.label])
          : Object.entries(AVAILABLE[group.key] || OPTIONS[group.key]);
    for (const [value, label] of entries) grid.append(optionButton(group, value, label));
    fieldset.append(grid);

    if (group.help) {
      const help = group.kind === 'multi' ? `${group.help} ${state[group.key].length} of ${MULTI[group.key].max} picked.` : group.help;
      fieldset.append(note(help));
    }
    const missing = MISSING[group.key];
    if (missing?.length) {
      const labels = missing.map((k) => (group.kind === 'multi' ? STICKERS[k] : OPTIONS[group.key][k]));
      fieldset.append(note(`Not drawn yet: ${labels.join(', ')}.`, 'hint hint-missing'));
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
  toast.t = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// --- events -----------------------------------------------------------------

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('.opt');
  if (!btn) return;
  const { key, value } = btn.dataset;
  if (key === 'preset') {
    setState(presetPatch(value));
    return;
  }
  if (key in MULTI) {
    const list = state[key];
    if (list.includes(value)) setState({ [key]: list.filter((v) => v !== value) });
    else if (list.length >= MULTI[key].max) toast(`Up to ${MULTI[key].max}. Unpick one first.`);
    else setState({ [key]: [...list, value] });
    return;
  }
  setState({ [key]: value });
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
  commit(surprise(Math.random, AVAILABLE, { sign: state.sign, capText: state.capText }));
  preview.classList.remove('wiggle');
  void preview.offsetWidth; // restart the animation
  preview.classList.add('wiggle');
});

$('#reset').addEventListener('click', () => {
  commit(DEFAULT_STATE);
  toast('Back to the original potato.');
});

async function download(size) {
  const btn = $(size === 512 ? '#download-png' : '#download-big');
  btn.disabled = true;
  try {
    const blob = await exportPng(state, size);
    const name = size === 512 ? 'potato-me.png' : `potato-me-${size}.png`;
    downloadBlob(blob, name);
    toast(`Saved ${name} (${Math.max(1, Math.round(blob.size / 1024))} KB)`);
  } catch (err) {
    toast('Download failed. Try again in a moment.');
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}
$('#download-png').addEventListener('click', () => download(512));
$('#download-big').addEventListener('click', () => download(1024));

$('#copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Link copied. Anyone with it gets this exact potato.');
  } catch {
    toast('Copy the address bar to share this potato.');
  }
});

window.addEventListener('hashchange', () => {
  state = drawableState(decodeState(location.hash));
  render();
});

// Rewrite the URL once on load so links in an older format are upgraded in place.
commit(state);
