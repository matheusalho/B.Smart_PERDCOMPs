import React, { useId } from 'react';

type StatusBadgeTone = 'success' | 'danger' | 'warning' | 'muted';

type StatusBadgeProps = {
  tone: StatusBadgeTone;
  children: React.ReactNode;
  tooltip?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  tone,
  children,
  tooltip,
  ariaLabel,
  className,
  style,
}) => {
  const tooltipId = useId();
  const classes = [
    'status-led',
    `status-${tone}`,
    tooltip ? 'status-led--tooltip' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={style}
      tabIndex={tooltip ? 0 : undefined}
      aria-label={ariaLabel}
      aria-describedby={tooltip ? tooltipId : undefined}
    >
      {children}
      {tooltip && (
        <span id={tooltipId} role="tooltip" className="tooltip-content">
          {tooltip}
        </span>
      )}
    </span>
  );
};
