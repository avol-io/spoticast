import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../app/ui/empty-state';
import PageHeader from '../../app/ui/page-header';

export function HomePage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.podcasts')} />
      <EmptyState icon={<LayoutGrid />} title={t('placeholder.comingSoon')} />
    </>
  );
}

export default HomePage;
