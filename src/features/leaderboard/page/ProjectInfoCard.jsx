import React, { useId, useRef, useState } from 'react';

const disclaimer = 'This site is not affiliated with, endorsed by, or sponsored by Jane Street. All puzzle data is compiled from publicly available information.';

export default function ProjectInfoCard() {
  const field = useId();
  const hint = useId();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const sendFeedback = async (event) => {
    event.preventDefault();
    if (pending.current || !message.trim()) return;
    pending.current = true;
    setStatus('sending');
    setNotice('');
    const form = event.currentTarget;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), website: new FormData(form).get('website') }),
        signal: controller.signal,
      });
      if (!response.ok) {
        setStatus('error');
        setNotice(response.status === 429 ? 'Please wait a few minutes before sending again.' : 'Could not send. Please try again.');
        return;
      }
      const result = await response.json();
      if (result.ok !== true) throw new Error('Feedback was not accepted');
      setMessage('');
      setStatus('sent');
      setNotice('Sent. Thank you!');
    } catch {
      setStatus('error');
      setNotice('Could not send. Please try again.');
    } finally {
      clearTimeout(timeout);
      pending.current = false;
    }
  };
  return <section className="flow-card flow-about selected-sidebar-card" aria-label="About this project">
    <a className="selected-project-learn" href="https://x.com/jaceyang97/status/2119479003392467001" target="_blank" rel="noopener noreferrer"><span>Learn how this site is made</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M7 5h12v12M19 5 5 19" /></svg></a>
    <form className="selected-project-feedback" onSubmit={sendFeedback} aria-busy={status === 'sending'}>
      <label className="lab-visually-hidden" htmlFor={field}>Features, fixes, feedback…</label>
      <textarea id={field} name="correction" rows={2} maxLength={2000} placeholder="Features, fixes, feedback…" aria-describedby={notice ? hint : undefined}
        value={message} readOnly={status === 'sending'} onChange={(event) => { setMessage(event.target.value); if (status !== 'idle') { setStatus('idle'); setNotice(''); } }}
        onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
      <input className="selected-project-trap" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={!message.trim() || status === 'sending'} aria-label={status === 'sending' ? 'Sending feedback' : 'Send feedback'} title="Send feedback (Ctrl/Cmd+Enter)">{status === 'sending' ? '…' : 'Send'}</button>
    </form>
    <p id={hint} className={notice ? 'selected-project-feedback-status' : 'lab-visually-hidden'} role="status" aria-live="polite">{notice}</p>
    <p className="selected-project-disclaimer">{disclaimer}{' '}<span className="selected-project-credit">Created by <a href="https://www.jaceyang.com/" target="_blank" rel="noopener noreferrer">Jace Yang</a>.</span></p>
  </section>;
}
