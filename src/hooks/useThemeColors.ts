import { useEffect, useState } from 'react';

export interface ThemeColors {
  gridStroke: string;
  axisStroke: string;
  textColor: string;
  tooltipBg: string;
  tooltipBorder: string;
}

const LIGHT: ThemeColors = {
  gridStroke: '#ececf0',
  axisStroke: '#d2d2d7',
  textColor: '#86868b',
  tooltipBg: 'rgba(255, 255, 255, 0.95)',
  tooltipBorder: '#e5e5ea',
};

const DARK: ThemeColors = {
  gridStroke: '#2c2c2e',
  axisStroke: '#48484a',
  textColor: '#98989d',
  tooltipBg: 'rgba(28, 28, 30, 0.95)',
  tooltipBorder: '#3a3a3c',
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
