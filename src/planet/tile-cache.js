// Active tiles are pinned during assignment. Eviction cannot overwrite a
// slot referenced by another draw in the same frame.
export class PlanetTileCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.slots = new Map();
  }
  clear() {
    this.slots.clear();
  }
  assign(tiles) {
    const active = new Set(tiles.map(({ key }) => key));
    const assigned = new Map();
    const builds = [];
    const eviction = this.slots.keys();
    for (const tile of tiles) {
      let slot = this.slots.get(tile.key);
      if (slot === undefined) {
        if (this.slots.size < this.capacity) {
          slot = this.slots.size;
        } else {
          let victim = eviction.next();
          while (!victim.done && active.has(victim.value)) victim = eviction.next();
          if (victim.done) throw new RangeError("Visible tiles exceed cache capacity.");
          slot = this.slots.get(victim.value);
          this.slots.delete(victim.value);
        }
        builds.push({ tile, slot });
      }
      this.slots.delete(tile.key);
      this.slots.set(tile.key, slot);
      assigned.set(tile.key, slot);
    }
    return { assigned, builds };
  }
}
