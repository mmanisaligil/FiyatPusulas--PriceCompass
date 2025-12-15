import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'success' | 'warning' | 'muted' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, className, tone = 'muted', ...props }) => {
  const toneClass =
    tone === 'success'
      ? 'badge badge-success'
      : tone === 'warning'
      ? 'badge badge-warning'
      : tone === 'info'
      ? 'badge bg-sky-100 text-sky-700'
      : 'badge badge-muted';
  return (
    <span className={cn(toneClass, className)} {...props}>
      {children}
    </span>
  );
};
