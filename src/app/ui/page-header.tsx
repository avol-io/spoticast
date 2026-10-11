import type { ReactNode } from 'react';
import { useDocumentTitle } from '../hooks/use-document-title';
import AppMark from './app-mark';

export interface PageHeaderProps {
  title: string;
  /** Replaces the title below lg (the window title keeps `title`). */
  mobileTitle?: string;
  /** Buttons rendered on the right of the title. */
  actions?: ReactNode;
}

export function PageHeader({ title, mobileTitle, actions }: PageHeaderProps) {
  useDocumentTitle(title);
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppMark />
          <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">
            {mobileTitle ? (
              <>
                <span className="lg:hidden">{mobileTitle}</span>
                <span className="hidden lg:inline">{title}</span>
              </>
            ) : (
              title
            )}
          </h1>
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
