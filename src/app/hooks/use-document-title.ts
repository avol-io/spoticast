import { useEffect } from 'react';
import { APP_TITLE } from '../../lib/build-info';

/** Names the window after the page: "<title> · Spoticast". */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE;
  }, [title]);
}
