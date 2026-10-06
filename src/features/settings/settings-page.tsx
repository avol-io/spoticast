import { Archive, Check, Download, LogOut, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../app/ui/page-header';
import SegmentedControl from '../../app/ui/segmented-control';
import { logout } from '../../lib/spotify/auth';
import { isIos, promptInstall, useInstall } from '../../lib/pwa/install';
import {
  MAX_ARCHIVE_ATTEMPTS,
  useArchiveStore,
} from '../archive/archive-store';
import { runArchiveSync } from '../player/player-controller';
import MarketSelect from '../search/market-select';
import { usePlayer } from '../player/player-store';
import { useSettings } from '../../lib/storage/settings';

const SKIP_BACK = [5, 10, 15, 30];
const SKIP_FORWARD = [15, 30, 45, 60];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">
        {children}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <span className="font-medium">{label}</span>
      {children}
    </div>
  );
}

function InstallSection() {
  const { t } = useTranslation();
  const { prompt, installed } = useInstall();

  return (
    <Section title={t('settings.app')}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        {installed ? (
          <p className="flex items-center gap-2 font-medium text-success">
            <Check className="size-4" aria-hidden />
            {t('settings.installed')}
          </p>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-sm text-fg-muted">
              {prompt
                ? t('settings.installHint')
                : isIos()
                  ? t('settings.installIos')
                  : t('settings.installUnavailable')}
            </p>
            {prompt && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg"
              >
                <Download className="size-4" aria-hidden />
                {t('settings.install')}
              </button>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

function ArchiveSection() {
  const { t } = useTranslation();
  const pending = Object.values(useArchiveStore((s) => s.pending));
  const retryFailed = useArchiveStore((s) => s.retryFailed);
  const syncing = usePlayer((s) => s.archiveSyncing);
  const failed = pending.filter(
    (p) => p.attempts >= MAX_ARCHIVE_ATTEMPTS,
  ).length;

  return (
    <Section title={t('archive.settingsTitle')}>
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-sm text-fg-muted">{t('archive.syncHint')}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-medium">
            <Archive className="size-4 text-fg-muted" aria-hidden />
            {syncing
              ? t('archive.syncing')
              : pending.length === 0
                ? t('archive.allSynced')
                : t('archive.pending', { count: pending.length })}
            {failed > 0 && (
              <span className="text-sm text-danger">
                · {t('archive.failed', { count: failed })}
              </span>
            )}
          </p>
          {pending.length > 0 && (
            <button
              type="button"
              disabled={syncing}
              onClick={() => {
                retryFailed();
                void runArchiveSync();
              }}
              className="flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              <RefreshCw className="size-4" aria-hidden />
              {t('archive.retry')}
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="mx-auto max-w-6xl px-4 py-4 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-6">
          <Section title={t('settings.appearance')}>
            <Row label={t('settings.theme')}>
              <SegmentedControl
                label={t('settings.theme')}
                value={settings.theme}
                onChange={settings.setTheme}
                options={[
                  { value: 'dark', label: t('settings.themeDark') },
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'auto', label: t('settings.themeAuto') },
                ]}
              />
            </Row>
            <Row label={t('settings.language')}>
              <SegmentedControl
                label={t('settings.language')}
                value={settings.language}
                onChange={settings.setLanguage}
                options={[
                  { value: 'auto', label: t('settings.languageAuto') },
                  { value: 'it', label: 'Italiano' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </Row>
          </Section>

          <Section title={t('settings.playback')}>
            <Row label={t('settings.skipBack')}>
              <SegmentedControl
                label={t('settings.skipBack')}
                value={settings.skipBackSeconds}
                onChange={(v) =>
                  settings.setSkip(v, settings.skipForwardSeconds)
                }
                options={SKIP_BACK.map((s) => ({
                  value: s,
                  label: t('settings.seconds', { count: s }),
                }))}
              />
            </Row>
            <Row label={t('settings.skipForward')}>
              <SegmentedControl
                label={t('settings.skipForward')}
                value={settings.skipForwardSeconds}
                onChange={(v) => settings.setSkip(settings.skipBackSeconds, v)}
                options={SKIP_FORWARD.map((s) => ({
                  value: s,
                  label: t('settings.seconds', { count: s }),
                }))}
              />
            </Row>
          </Section>

          <Section title={t('settings.searchSection')}>
            <Row label={t('search.country')}>
              <MarketSelect />
            </Row>
          </Section>

          <ArchiveSection />

          <InstallSection />

          <Section title={t('settings.account')}>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3 font-medium text-danger hover:bg-surface-2"
            >
              <LogOut className="size-5" aria-hidden />
              {t('settings.logout')}
            </button>
          </Section>
        </div>
      </div>
    </>
  );
}

export default SettingsPage;
