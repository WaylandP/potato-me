import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { APP_VERSION } from '../src/version.js';
import { decodeState } from '../src/state.js';
import { OPTIONS } from '../src/options.js';

const root = new URL('../', import.meta.url);
const json = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));

test('installed editor and public update endpoint identify the package release', async () => {
  const [pkg, live] = await Promise.all([json('package.json'), json('version.json')]);
  assert.equal(live.version, pkg.version);
  assert.equal(APP_VERSION, pkg.version);
});

test('local links and embedded images in current guides still exist', async () => {
  for (const directory of [root, new URL('docs/', root)]) {
    for (const name of (await readdir(directory)).filter(x => x.endsWith('.md'))) {
      const file = new URL(name, directory);
      const md = (await readFile(file, 'utf8')).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      const links = [...md.matchAll(/\]\(([^\s)]+)\)|(?:src|href)="([^"]+)"/g)].map(m => m[1] || m[2]);
      for (const target of links) {
        if (/^(?:#|\/\/|[a-z][a-z\d+.-]*:)/i.test(target)) continue;
        await assert.doesNotReject(access(new URL(target.split(/[?#]/, 1)[0], file)), `${name} links to missing ${target}`);
      }
    }
  }
});

test('gallery recipes contain actual editor choices rather than silently falling back', async () => {
  for (const [label, hash] of await json('docs/scenes-spec.json')) {
    const state = decodeState(hash);
    for (const [key, value] of new URLSearchParams(hash.slice(1))) {
      if (Object.hasOwn(OPTIONS, key)) assert.equal(state[key], value, `${label}: invalid ${key}=${value}`);
      else assert.ok(Object.hasOwn(state, key), `${label}: unknown field ${key}`);
    }
  }
});
