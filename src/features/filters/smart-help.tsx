import { CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Popover from '../../app/ui/popover';

/** What smart playlists are, with an example. */
export function SmartHelpText() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>{t('smart.helpText')}</p>
      <p className="text-fg-muted">{t('smart.helpExample')}</p>
    </div>
  );
}

/** A (?) button next to the title that explains smart playlists. */
export function SmartHelp() {
  const { t } = useTranslation();
  return (
    <Popover
      label={t('smart.help')}
      align="start"
      className="w-80 max-w-[calc(100vw-2rem)] p-4"
      trigger={(props) => (
        <button
          type="button"
          aria-label={t('smart.help')}
          title={t('smart.help')}
          {...props}
          className="inline-flex size-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <CircleHelp className="size-5" aria-hidden />
        </button>
      )}
    >
      <SmartHelpText />
    </Popover>
  );
}

export default SmartHelp;
