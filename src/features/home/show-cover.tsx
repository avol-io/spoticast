import { pickImage } from '../../lib/episodes';
import type { SimplifiedShow } from '../../lib/spotify/types';
import type { Badge } from '../library/queries';

export interface ShowCoverProps {
  show: Pick<SimplifiedShow, 'id' | 'name' | 'images'>;
  badge?: Badge;
  /** Shared-element name for the view transition to the podcast detail. */
  transitionName?: string;
  /** Rendered width hint, used to pick the image size. */
  size?: number;
  className?: string;
}

export function ShowCover({
  show,
  badge,
  transitionName,
  size = 200,
  className = '',
}: ShowCoverProps) {
  const src = pickImage(show.images, size);
  return (
    <div className={`relative aspect-square ${className}`}>
      <div
        className="size-full overflow-hidden rounded-xl bg-surface-2 shadow-md ring-1 ring-black/5"
        style={{ viewTransitionName: transitionName }}
      >
        {src && (
          <img
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
            className="size-full object-cover"
          />
        )}
      </div>
      {badge && badge.count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-brand-fg tabular-nums shadow ring-2 ring-bg">
          {badge.more ? `${badge.count}+` : badge.count}
        </span>
      )}
    </div>
  );
}

export default ShowCover;
