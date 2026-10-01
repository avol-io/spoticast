import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  /** Buttons rendered on the right of the title. */
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
        <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">
          {title}
        </h1>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
