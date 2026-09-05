import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useReducedMotion } from 'motion/react';
import ThemeToggle from '../ThemeToggle';

jest.mock('motion/react', () => ({
  ...jest.requireActual('motion/react'),
  useReducedMotion: jest.fn(() => false),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    document.documentElement.removeAttribute('data-theme-transition');
  });

  afterEach(() => document.documentElement.removeAttribute('data-theme-transition'));

  test('exposes one correctly named button and calls the supplied action once', () => {
    const onToggle = jest.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('preserves the focused button while successive theme changes animate its icon', async () => {
    const onToggle = jest.fn();
    const { rerender } = render(<ThemeToggle theme="light" onToggle={onToggle} />);
    const button = screen.getByRole('button');
    button.focus();
    await act(async () => rerender(<ThemeToggle theme="dark" onToggle={onToggle} />));
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBe(button);
    expect(button).toHaveFocus();
    await act(async () => rerender(<ThemeToggle theme="light" onToggle={onToggle} />));
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(button).toHaveAccessibleName('Switch to dark mode');
    expect(button).toHaveFocus();
  });

  test('remains usable with reduced motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onToggle = jest.fn();
    const { rerender } = render(<ThemeToggle theme="dark" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    await act(async () => rerender(<ThemeToggle theme="light" onToggle={onToggle} />));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  });

  test('the first paint has a complete icon and native page snapshots contain only the final glyph', () => {
    const { rerender } = render(<ThemeToggle theme="light" onToggle={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button.querySelector('.theme-toggle-symbol')).toHaveStyle({ opacity: '1', filter: 'blur(0px)' });
    document.documentElement.setAttribute('data-theme-transition', 'view');
    rerender(<ThemeToggle theme="dark" onToggle={jest.fn()} />);
    expect(button.querySelectorAll('svg')).toHaveLength(1);
    expect(button.querySelector('.theme-toggle-symbol')).not.toHaveStyle({ opacity: '0' });
    expect(button).toHaveAccessibleName('Switch to light mode');
  });
});
