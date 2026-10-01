import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../app/ui/empty-state';
import PageHeader from '../../app/ui/page-header';

export function FiltersPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.filters')} />
      <EmptyState
        icon={<SlidersHorizontal />}
        title={t('placeholder.comingSoon')}
      />
    </>
  );
}

export default FiltersPage;
