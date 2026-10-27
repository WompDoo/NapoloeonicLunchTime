/** Local storage that lives in memory, and can be told to fail like a full or blocked one. */
export class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  public failing = false;

  public get length(): number {
    return this.items.size;
  }

  public clear(): void {
    this.items.clear();
  }

  public getItem(key: string): string | null {
    this.failIfBroken();
    return this.items.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.items.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.failIfBroken();
    this.items.set(key, value);
  }

  private failIfBroken(): void {
    if (this.failing) {
      throw new DOMException('Storage is unavailable', 'SecurityError');
    }
  }
}
