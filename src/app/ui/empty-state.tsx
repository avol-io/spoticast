import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-16 text-center">
      {icon && <div className="text-fg-subtle [&>svg]:size-12">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  );
}

export default EmptyState;
