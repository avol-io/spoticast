import { useTranslation } from 'react-i18next';

/** Marks the beta channel build (see src/lib/build-info.ts). */
export function BetaBadge() {
  const { t } = useTranslation();
  return (
    <span className="rounded-full bg-brand px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-brand-fg">
      {t('beta')}
    </span>
  );
}

export default BetaBadge;
