import { Check, Download } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../app/ui/page-header';
import SegmentedControl from '../../app/ui/segmented-control';
import {
  installPlatform,
  promptInstall,
  useInstall,
  type InstallPlatform,
} from '../../lib/pwa/install';
import {
  AndroidMenuIllustration,
  DesktopChromeIllustration,
  IosAddToHomeIllustration,
  IosShareIllustration,
  SafariMacIllustration,
} from './install-illustrations';

function Steps({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col gap-6">{children}</ol>;
}

function Step({
  n,
  text,
  illustration,
}: {
  n: number;
  text: string;
  illustration?: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
        <p>{text}</p>
        {illustration}
      </div>
    </li>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-fg-muted">
      {children}
    </p>
  );
}

/** How to install the app on each platform, with sketches of each step. */
export function InstallPage() {
  const { t } = useTranslation();
  const { prompt, installed } = useInstall();
  const [platform, setPlatform] = useState<InstallPlatform>(() =>
    installPlatform(),
  );

  return (
    <>
      <PageHeader title={t('install.title')} />
      <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-6">
          {installed ? (
            <p className="flex items-center gap-2 font-medium text-success">
              <Check className="size-4" aria-hidden />
              {t('settings.installed')}
            </p>
          ) : (
            <p className="text-fg-muted">{t('install.intro')}</p>
          )}
          {prompt && !installed && (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="flex items-center gap-2 self-start rounded-full bg-brand px-5 py-2.5 font-semibold text-brand-fg"
            >
              <Download className="size-5" aria-hidden />
              {t('install.now')}
            </button>
          )}
          <SegmentedControl
            label={t('install.platform')}
            value={platform}
            onChange={setPlatform}
            options={[
              { value: 'ios', label: t('install.ios') },
              { value: 'android', label: t('install.android') },
              { value: 'desktop', label: t('install.desktop') },
            ]}
          />

          {platform === 'ios' && (
            <Steps>
              <Step n={1} text={t('install.iosOpen')} />
              <Step
                n={2}
                text={t('install.iosShare')}
                illustration={<IosShareIllustration />}
              />
              <Step
                n={3}
                text={t('install.iosAdd')}
                illustration={
                  <IosAddToHomeIllustration
                    copy={t('install.labelCopy')}
                    addToHome={t('install.labelAddToHome')}
                  />
                }
              />
            </Steps>
          )}

          {platform === 'android' && (
            <>
              <Steps>
                <Step n={1} text={t('install.androidOpen')} />
                <Step
                  n={2}
                  text={t('install.androidMenu')}
                  illustration={
                    <AndroidMenuIllustration
                      newTab={t('install.labelNewTab')}
                      install={t('install.labelInstallApp')}
                      settings={t('install.labelSettings')}
                    />
                  }
                />
                <Step n={3} text={t('install.androidConfirm')} />
              </Steps>
              <Note>{t('install.androidOther')}</Note>
            </>
          )}

          {platform === 'desktop' && (
            <>
              <h2 className="text-lg font-bold">{t('install.chromeTitle')}</h2>
              <Steps>
                <Step
                  n={1}
                  text={t('install.chromeIcon')}
                  illustration={
                    <DesktopChromeIllustration
                      prompt={t('install.labelInstallPrompt')}
                      install={t('install.labelInstall')}
                    />
                  }
                />
                <Step n={2} text={t('install.chromeConfirm')} />
              </Steps>
              <h2 className="text-lg font-bold">{t('install.safariTitle')}</h2>
              <Steps>
                <Step
                  n={1}
                  text={t('install.safariDock')}
                  illustration={
                    <SafariMacIllustration
                      file={t('install.labelFile')}
                      addToDock={t('install.labelAddToDock')}
                    />
                  }
                />
              </Steps>
              <Note>{t('install.firefox')}</Note>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default InstallPage;
