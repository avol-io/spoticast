import { X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import IconButton from '../../app/ui/icon-button';
import Sheet from '../../app/ui/sheet';
import { pause } from './player-controller';
import { usePlayer } from './player-store';

interface EmbedController {
  loadEntity(uri: string, preferVideo?: boolean, startAt?: number): void;
  play(): void;
  destroy(): void;
}

interface IFrameApi {
  createController(
    element: HTMLElement,
    options: {
      uri?: string;
      width?: string | number;
      height?: string | number;
    },
    callback: (controller: EmbedController) => void,
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameApi) => void;
  }
}

let iframeApi: Promise<IFrameApi> | null = null;

function loadIframeApi(): Promise<IFrameApi> {
  iframeApi ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = () => {
      iframeApi = null;
      reject(new Error('Unable to load the Spotify embed'));
    };
    document.body.appendChild(script);
  });
  return iframeApi;
}

/** Full-screen Spotify embed playing the video version of an episode. */
export function VideoSheet() {
  const { t } = useTranslation();
  const video = usePlayer((s) => s.video);
  const setVideo = usePlayer((s) => s.setVideo);
  const hostRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setVideo(null), [setVideo]);

  useEffect(() => {
    if (!video) return;
    // Audio and video at the same time would overlap.
    void pause();
    let controller: EmbedController | null = null;
    let cancelled = false;
    loadIframeApi().then((api) => {
      const host = hostRef.current;
      if (cancelled || !host) return;
      const target = document.createElement('div');
      host.replaceChildren(target);
      api.createController(
        target,
        { uri: video.uri, width: '100%', height: '100%' },
        (c) => {
          controller = c;
          if (cancelled) {
            c.destroy();
            return;
          }
          c.loadEntity(video.uri, true, video.startAt);
          c.play();
        },
      );
    }, close);
    return () => {
      cancelled = true;
      controller?.destroy();
    };
  }, [video, close]);

  return (
    <Sheet
      open={!!video}
      onClose={close}
      label={video?.name ?? ''}
      variant="full"
      className="bg-black"
    >
      <div className="pt-safe flex h-full flex-col">
        <div className="flex items-center gap-2 p-2 text-white">
          <IconButton
            label={t('player.closeVideo')}
            onClick={close}
            className="text-white hover:bg-white/10"
          >
            <X />
          </IconButton>
          <p className="truncate font-semibold">{video?.name}</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-2 lg:p-8">
          <div
            ref={hostRef}
            className="h-full max-h-[80dvh] w-full max-w-5xl [&_iframe]:rounded-2xl"
          />
        </div>
      </div>
    </Sheet>
  );
}

export default VideoSheet;
