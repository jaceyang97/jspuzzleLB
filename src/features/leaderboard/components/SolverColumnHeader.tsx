import React from 'react';
import InfoTooltip from '../../../components/InfoTooltip';

const HINT = 'Select a solver to view their record';

export default function SolverColumnHeader() {
  return (
    <span className="solver-column-title">
      <span className="solver-column-label">Solver</span>
      <span className="solver-column-hint">{HINT}</span>
      <InfoTooltip content={HINT} label="About solver profiles" className="solver-column-info" />
    </span>
  );
}
