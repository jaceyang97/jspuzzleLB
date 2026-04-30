import { useEffect, useState } from 'react';

export interface ThemeColors {
  gridStroke: string;
  axisStroke: string;
  textColor: string;
  tooltipBg: string;
  tooltipBorder: string;
}

const LIGHT: ThemeColors = {
  gridStroke: '#eee',
  axisStroke: '#ccc',
  textColor: '#666',
  tooltipBg: 'rgba(255, 255, 255, 0.95)',
  tooltipBorder: '#ddd',
};

const DARK: ThemeColors = {
  gridStroke: '#30363d',
  axisStroke: '#484f58',
  textColor: '#8b949e',
  tooltipBg: 'rgba(22, 27, 34, 0.95)',
  tooltipBorder: '#30363d',
};

const readColors = (): ThemeColors =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? DARK : LIGHT;

export const useThemeColors = (): ThemeColors => {
  const [colors, setColors] = useState<ThemeColors>(readColors);

  useEffect(() => {
    const update = () => setColors(readColors());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
};
