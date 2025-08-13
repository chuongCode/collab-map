export class ColorAssigner {
  private palette: string[];
  private byId = new Map<string, string>();
  private next = 0;

  constructor(palette: string[]) {
    this.palette = palette;
  }

  get(id: string): string {
    const existing = this.byId.get(id);
    if (existing) return existing;
    const color = this.palette[this.next % this.palette.length];
    this.next += 1;
    this.byId.set(id, color);
    return color;
  }

  release(id: string) {
    this.byId.delete(id);
  }

  reset() {
    this.byId.clear();
    this.next = 0;
  }
}