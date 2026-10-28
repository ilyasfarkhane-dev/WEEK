export class AsyncLocalStorage<T> {
  private current: T | undefined;

  getStore() {
    return this.current;
  }

  run<R>(store: T, fn: () => R) {
    const previous = this.current;
    this.current = store;
    try {
      return fn();
    } finally {
      this.current = previous;
    }
  }
}
