import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../app/ui/empty-state';
import PageHeader from '../../app/ui/page-header';

export function SearchPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.search')} />
      <EmptyState icon={<Search />} title={t('placeholder.comingSoon')} />
    </>
  );
}

export default SearchPage;
