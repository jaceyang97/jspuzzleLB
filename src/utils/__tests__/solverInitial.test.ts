import { solverInitial } from '../solverInitial';

describe('Unicode solver initials', () => {
  test.each([
    ['  ada ', 'A'],
    ['éloïse', 'É'],
    ['e\u0301loïse', 'E\u0301'],
    ['蒋小猫', '蒋'],
    ['𠮷田', '𠮷'],
    ['👩🏽‍💻 Solver', '👩🏽‍💻'],
    ['🇲🇾 Solver', '🇲🇾'],
    ['Δημήτρης', 'Δ'],
    ['Мария', 'М'],
    ['', '?'],
    ['   ', '?'],
  ])('keeps the first complete character of %s', (name, expected) => {
    expect(solverInitial(name)).toBe(expected);
  });

  test('older browsers retain simple initials and use an intact placeholder for complex ones', () => {
    const original = Intl.Segmenter;
    try {
      Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: undefined });
      jest.isolateModules(() => {
        const fallback = require('../solverInitial').solverInitial;
        expect(fallback('ada')).toBe('A');
        expect(fallback('👩🏽‍💻 Solver')).toBe('?');
        expect(fallback('e\u0301loïse')).toBe('?');
      });
    } finally {
      Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: original });
    }
  });
});
