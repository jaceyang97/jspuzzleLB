import React from 'react';
import Tooltip from './Tooltip';

interface InfoTooltipProps {
  content: React.ReactNode;
  label: string;
  className?: string;
  describedBy?: string;
  interactive?: boolean;
  popupLabel?: string;
}

export default function InfoTooltip({ content, label, className = '', describedBy, interactive, popupLabel }: InfoTooltipProps) {
  return <Tooltip content={content} rich interactive={interactive} popupLabel={popupLabel} className={`info-tooltip ${className}`}>
    <button type="button" className="info-tooltip-button" aria-label={label} aria-describedby={describedBy}
      aria-haspopup={interactive ? 'dialog' : undefined}>
      <span className="panel-info-marker" aria-hidden="true">i</span>
    </button>
  </Tooltip>;
}
