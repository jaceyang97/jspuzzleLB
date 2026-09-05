import React from 'react';
import Tooltip from '../../../components/Tooltip';

const HINT = 'Select a solver to view their record';

export default function SolverColumnHeader() {
  return (
    <span className="solver-column-title">
      <Tooltip content={HINT} rich>
        <span className="solver-column-label" tabIndex={0}>Solver</span>
      </Tooltip>
      <span className="solver-column-hint">{HINT}</span>
    </span>
  );
}
