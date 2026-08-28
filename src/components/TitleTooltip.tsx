import React from 'react';
import Tooltip from './Tooltip';

interface TitleTooltipProps {
  as?: 'h2' | 'h3';
  tooltip: React.ReactNode;
  children: React.ReactNode;
}

// Section/chart title with an explanatory tooltip underneath. The title text
// lives in an inner span so a heading can still ellipsize without clipping
// the absolutely-positioned tooltip.
const TitleTooltip: React.FC<TitleTooltipProps> = ({
  as = 'h3',
  tooltip,
  children,
}) => (
  <Tooltip as={as} className="title-with-tooltip" content={tooltip} rich>
    <span className="title-tooltip-text">{children}</span>
  </Tooltip>
);

export default TitleTooltip;
