import { ListMusic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../app/ui/empty-state';
import PageHeader from '../../app/ui/page-header';

export function QueuePage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.queue')} />
      <EmptyState icon={<ListMusic />} title={t('placeholder.comingSoon')} />
    </>
  );
}

export default QueuePage;
