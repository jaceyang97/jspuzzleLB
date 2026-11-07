import React, { useId } from 'react';

const disclaimer = 'This site is not affiliated with, endorsed by, or sponsored by Jane Street. All puzzle data is compiled from publicly available information.';

export default function ProjectInfoCard() {
  const field = useId();
  const hint = useId();
  return <section className="flow-card flow-about selected-sidebar-card" aria-label="About this project">
    <a className="selected-project-learn" href="https://github.com/jaceyang97/jspuzzleLB" target="_blank" rel="noopener noreferrer"><span>Learn how this site is made</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M7 5h12v12M19 5 5 19" /></svg></a>
    <form className="selected-project-feedback" onSubmit={(event) => event.preventDefault()}>
      <label className="lab-visually-hidden" htmlFor={field}>Features, fixes, feedback…</label>
      <textarea id={field} name="correction" rows={2} maxLength={2000} placeholder="Features, fixes, feedback…" aria-describedby={hint} />
      <button type="submit" disabled title="Feedback sending will be enabled soon.">Send</button>
      <span id={hint} className="lab-visually-hidden">Feedback sending is not enabled yet.</span>
    </form>
    <p className="selected-project-disclaimer">{disclaimer}{' '}<span className="selected-project-credit">Created by <a href="https://www.jaceyang.com/" target="_blank" rel="noopener noreferrer">Jace Yang</a>.</span></p>
  </section>;
}
