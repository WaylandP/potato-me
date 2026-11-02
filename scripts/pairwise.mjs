// Deterministic greedy covering array for independent, finite option groups.
// This covers pairs, not every complete outfit. verifyPairCoverage is separate
// from the generator and checks every required pair against the returned rows.
export function pairwiseCases(factors, seed = 20261102) {
  const entries = Object.entries(factors);
  const values = entries.map(([, options]) => options);
  const token = (a, av, b, bv) => `${a}:${av}:${b}:${bv}`;
  const uncovered = new Set();
  for (let a = 0; a < values.length; a++) for (let b = a + 1; b < values.length; b++)
    for (let av = 0; av < values[a].length; av++) for (let bv = 0; bv < values[b].length; bv++) uncovered.add(token(a, av, b, bv));
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const rows = [];
  while (uncovered.size) {
    const [a, av, b, bv] = uncovered.values().next().value.split(':').map(Number);
    const row = Array(values.length).fill(-1); row[a] = av; row[b] = bv;
    while (row.includes(-1)) {
      let best = null;
      for (let f = 0; f < values.length; f++) if (row[f] < 0) for (let v = 0; v < values[f].length; v++) {
        let score = 0;
        for (let g = 0; g < values.length; g++) if (row[g] >= 0 && uncovered.has(f < g ? token(f, v, g, row[g]) : token(g, row[g], f, v))) score++;
        const rank = score + random() * .01;
        if (!best || rank > best.rank) best = { f, v, rank };
      }
      row[best.f] = best.v;
    }
    for (let f = 0; f < values.length; f++) for (let g = f + 1; g < values.length; g++) uncovered.delete(token(f, row[f], g, row[g]));
    rows.push(Object.fromEntries(entries.map(([key], i) => [key, values[i][row[i]]])));
  }
  return rows;
}

export function verifyPairCoverage(factors, rows) {
  const keys = Object.keys(factors), missing = []; let requiredPairs = 0;
  for (const row of rows) for (const key of keys) if (!factors[key].includes(row[key])) throw Error(`Invalid ${key} in covering array`);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = keys[i], b = keys[j];
    const seen = new Set(rows.map(row => JSON.stringify([row[a], row[b]])));
    for (const av of factors[a]) for (const bv of factors[b]) {
      requiredPairs++;
      if (!seen.has(JSON.stringify([av, bv]))) missing.push({ [a]: av, [b]: bv });
    }
  }
  return { factors: keys.length, cases: rows.length, requiredPairs, coveredPairs: requiredPairs - missing.length, missing };
}
