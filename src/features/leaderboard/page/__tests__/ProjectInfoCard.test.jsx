import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectInfoCard from '../ProjectInfoCard';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('submits feedback once and clears the draft only after acceptance', async () => {
  let accept;
  global.fetch = jest.fn(() => new Promise(resolve => { accept = resolve; }));
  render(<ProjectInfoCard />);
  const field = screen.getByRole('textbox', { name: 'Features, fixes, feedback…' });
  expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
  fireEvent.change(field, { target: { value: '  Please add a date filter.  ' } });
  fireEvent.submit(field.form);
  fireEvent.submit(field.form);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ message: 'Please add a date filter.', website: '' });
  expect(field).toHaveAttribute('readonly');
  expect(field).toHaveValue('  Please add a date filter.  ');
  expect(screen.getByRole('button', { name: 'Sending feedback' })).toBeDisabled();
  await act(async () => { accept({ ok: true, json: async () => ({ ok: true }) }); });
  expect(field).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('Sent. Thank you!');
});

test.each([
  ['network failure', () => Promise.reject(new Error('Offline')), 'Could not send. Please try again.'],
  ['mail failure', async () => ({ ok: false, status: 502 }), 'Could not send. Please try again.'],
  ['rate limit', async () => ({ ok: false, status: 429 }), 'Please wait a few minutes before sending again.'],
  ['unexpected response', async () => ({ ok: true, json: async () => ({}) }), 'Could not send. Please try again.'],
])('keeps the draft after %s', async (_name, response, notice) => {
  global.fetch = jest.fn(response);
  render(<ProjectInfoCard />);
  const field = screen.getByRole('textbox', { name: 'Features, fixes, feedback…' });
  fireEvent.change(field, { target: { value: 'Please fix my name.' } });
  fireEvent.submit(field.form);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(notice));
  expect(field).toHaveValue('Please fix my name.');
  expect(screen.getByRole('button', { name: 'Send feedback' })).toBeEnabled();
});

test('Ctrl+Enter submits while Enter preserves multiline input', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  render(<ProjectInfoCard />);
  const field = screen.getByRole('textbox', { name: 'Features, fixes, feedback…' });
  fireEvent.change(field, { target: { value: 'A suggestion' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
});
