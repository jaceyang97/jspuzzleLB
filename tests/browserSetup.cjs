// jsdom does not implement layout observers or the Web Animations API.
Element.prototype.getAnimations ??= () => [];
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// Tests send intersection entries explicitly because jsdom has no layout engine.
globalThis.IntersectionObserver ??= class {
  constructor(callback) {
    this.targets = new Set();
    this.notify = event => callback([{ target: event.target, isIntersecting: event.detail }], this);
  }
  observe(element) {
    this.targets.add(element);
    element.addEventListener('test-intersection', this.notify);
  }
  unobserve(element) {
    this.targets.delete(element);
    element.removeEventListener('test-intersection', this.notify);
  }
  disconnect() { for (const target of this.targets) this.unobserve(target); }
};
performance.getEntriesByType ??= () => [];

if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? 'mouse';
      this.pointerId = init.pointerId ?? 1;
      this.isPrimary = init.isPrimary ?? true;
    }
  };
}
Object.defineProperties(document.documentElement, {
  clientWidth: { configurable: true, get: () => window.innerWidth },
  clientHeight: { configurable: true, get: () => window.innerHeight },
});

// jsdom has no layout box metrics. Geometry tests supply the rendered rectangles.
for (const [property, dimension] of [['offsetWidth', 'width'], ['offsetHeight', 'height']]) {
  Object.defineProperty(HTMLElement.prototype, property, {
    configurable: true,
    get() { return Math.round(this.getBoundingClientRect()[dimension]); },
  });
}

Element.prototype.getClientRects = function () {
  const box = this.getBoundingClientRect();
  return box.width || box.height ? [box] : [];
};
