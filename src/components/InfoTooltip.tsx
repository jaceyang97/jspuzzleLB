import React from 'react';
import Tooltip from './Tooltip';

interface InfoTooltipProps {
  content: React.ReactNode;
  label: string;
  className?: string;
  describedBy?: string;
}

export default function InfoTooltip({ content, label, className = '', describedBy }: InfoTooltipProps) {
  return <Tooltip content={content} rich className={`info-tooltip ${className}`}>
    <button type="button" className="info-tooltip-button" aria-label={label} aria-describedby={describedBy}>
      <span className="panel-info-marker" aria-hidden="true">i</span>
    </button>
  </Tooltip>;
}
