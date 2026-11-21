// jsdom does not implement layout observers or the Web Animations API.
Element.prototype.getAnimations ??= () => [];
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
performance.getEntriesByType ??= () => [];
