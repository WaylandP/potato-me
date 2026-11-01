// A small weighted LRU. Pixel budgets bound decoded-image/canvas memory even
// when someone explores the whole catalog in one session.
export class LruCache {
  constructor(limit) { this.limit = limit; this.weight = 0; this.entries = new Map(); }
  has(key) { return this.entries.has(key); }
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key); this.entries.set(key, entry);
    return entry.value;
  }
  delete(key) {
    const entry = this.entries.get(key);
    if (entry) this.weight -= entry.weight;
    return this.entries.delete(key);
  }
  set(key, value, weight = 1) {
    this.delete(key);
    this.entries.set(key, { value, weight }); this.weight += weight;
    while (this.weight > this.limit && this.entries.size) this.delete(this.entries.keys().next().value);
    return this;
  }
}
