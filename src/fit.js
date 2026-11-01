// The fitting page: adjust FIT.surfaceNudges.shapes / FIT.surfaceNudges.parts live and copy the result into src/fit-data.js.
import { OPTIONS, SKINS, DEFAULT_STATE } from './options.js';
import { FIT } from './fit-data.js';
import { LAYER_ORDER, PARTS } from './assets.js';
import { renderPotato, availableOptions } from './raster.js';

const $ = (s) => document.querySelector(s);
const avail = availableOptions();
const stage = $('#stage');
const fields = ['dx', 'dy', 'scale', 'rot'];

const fill = (sel, entries, value) => {
  sel.replaceChildren(...entries.map(([k, label]) => Object.assign(document.createElement('option'), { value: k, textContent: label })));
  if (value) sel.value = value;
};
fill($('#shape'), Object.entries(OPTIONS.body), 'classic');
fill($('#skin'), Object.entries(SKINS).map(([k, v]) => [k, v.label]), 'russet');
fill($('#group'), LAYER_ORDER.filter((g) => g !== 'body').map((g) => [g, g]), 'hat');

function fillParts() {
  const group = $('#group').value;
  fill($('#part'), Object.entries(avail[group] || {}).filter(([k]) => PARTS[group]?.[k]));
}
fillParts();

/** The entry the controls are editing right now. */
function entry(create = false) {
  const shape = $('#shape').value;
  const group = $('#group').value;
  const part = $('#part').value;
  const scope = $('#scope').value;
  if (scope === 'shape') {
    FIT.surfaceNudges.shapes[shape] ||= {};
    if (create) FIT.surfaceNudges.shapes[shape][group] ||= {};
    return FIT.surfaceNudges.shapes[shape][group];
  }
  const key = scope === 'part' ? `${group}/${part}` : `${group}/${part}@${shape}`;
  if (create) FIT.surfaceNudges.parts[key] ||= {};
  return FIT.surfaceNudges.parts[key];
}

function loadControls() {
  const e = entry() || {};
  for (const f of fields) $('#' + f).value = e[f] ?? (f === 'scale' ? 1 : 0);
  $('#flip').checked = Boolean(e.flip);
}

function saveControls() {
  const e = entry(true);
  for (const f of fields) {
    const input = $('#' + f);
    if (!input.value.trim()) continue;
    let v = Number(input.value);
    if (!Number.isFinite(v)) continue;
    if (f === 'scale') v = Math.max(.05, Math.min(4, v));
    if ((f === 'scale' && v === 1) || (f !== 'scale' && v === 0)) delete e[f];
    else e[f] = f === 'scale' ? Math.round(v * 1000) / 1000 : Math.round(v * 2) / 2;
  }
  if ($('#flip').checked) e.flip = true;
  else delete e.flip;
  prune();
  draw();
  printResult();
}

function prune() {
  for (const [shape, groups] of Object.entries(FIT.surfaceNudges.shapes)) for (const [g, o] of Object.entries(groups)) if (!Object.keys(o).length) delete groups[g];
  for (const [k, o] of Object.entries(FIT.surfaceNudges.parts)) if (!Object.keys(o).length) delete FIT.surfaceNudges.parts[k];
}

function state() {
  const group = $('#group').value;
  const s = { ...DEFAULT_STATE, body: $('#shape').value, skin: $('#skin').value, capText: 'A+W' };
  s[group] = $('#part').value;
  return s;
}

let token = 0;
async function draw() {
  const t = ++token;
  try {
    const c = await renderPotato(state(), { size: 1024 });
    if (t !== token) return;
    stage.getContext('2d').drawImage(c, 0, 0);
    $('#fit-status').textContent = '';
  } catch {
    if (t === token) $('#fit-status').textContent = 'Couldn’t load this part. Check your connection and choose it again.';
  }
}

function printResult() {
  const lines = ['  surfaceNudges: { shapes: ' + JSON.stringify(FIT.surfaceNudges.shapes, null, 2).replace(/\n/g, '\n  ') + ',', '  parts: ' + JSON.stringify(FIT.surfaceNudges.parts, null, 2).replace(/\n/g, '\n  ') + ' },'];
  $('#out').value = lines.join('\n').replace(/"(\w+)":/g, '$1:').replace(/"/g, "'");
}

for (const id of ['shape', 'skin', 'group', 'part', 'scope']) {
  $('#' + id).addEventListener('change', () => {
    if (id === 'group') fillParts();
    loadControls();
    draw();
  });
}
for (const f of [...fields, 'flip']) $('#' + f).addEventListener('input', saveControls);

stage.tabIndex = 0;
stage.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 10 : 1;
  const bump = (id, d) => {
    $('#' + id).value = Number($('#' + id).value) + d;
    saveControls();
  };
  const map = { ArrowLeft: () => bump('dx', -step), ArrowRight: () => bump('dx', step), ArrowUp: () => bump('dy', -step), ArrowDown: () => bump('dy', step), '+': () => bump('scale', 0.01), '=': () => bump('scale', 0.01), '-': () => bump('scale', -0.01), '[': () => bump('rot', -0.5), ']': () => bump('rot', 0.5) };
  if (map[e.key]) {
    e.preventDefault();
    map[e.key]();
  } else if (e.key.toLowerCase() === 'f') {
    $('#flip').checked = !$('#flip').checked;
    saveControls();
  } else if (e.key === '0') {
    const en = entry();
    if (en) for (const k of Object.keys(en)) delete en[k];
    prune();
    loadControls();
    draw();
    printResult();
  }
});

$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#out').value); $('#fit-status').textContent = 'Fitting data copied.'; }
  catch { $('#out').focus(); $('#out').select(); $('#fit-status').textContent = 'Copy the selected fitting data.'; }
});
$('#reset').addEventListener('click', () => location.reload());

loadControls();
draw();
printResult();
