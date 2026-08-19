import '@testing-library/jest-dom/vitest'

// jsdom does not implement layout APIs used by ProseMirror's selection code.
document.elementFromPoint ??= (() => null) as typeof document.elementFromPoint
Range.prototype.getClientRects ??= (() => [] as unknown as DOMRectList) as typeof Range.prototype.getClientRects
Range.prototype.getBoundingClientRect ??= (() => new DOMRect()) as typeof Range.prototype.getBoundingClientRect

if (!globalThis.localStorage) {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
}
