import { useMemo } from 'react';
import { sanitizeHtml } from '../../lib/html/sanitize';
import type { SimplifiedEpisode } from '../../lib/spotify/types';

export interface EpisodeDetailsProps {
  episode: Pick<SimplifiedEpisode, 'description' | 'html_description'>;
}

/** The episode notes, with their paragraphs, lists and links. */
export function EpisodeDetails({ episode }: EpisodeDetailsProps) {
  const html = useMemo(
    () =>
      episode.html_description ? sanitizeHtml(episode.html_description) : '',
    [episode.html_description],
  );
  const className =
    'text-sm leading-relaxed break-words text-fg-muted [&_a]:text-accent-ink [&_a]:underline [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:text-fg [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5';
  return html ? (
    // Sanitized above: only formatting tags and web links are left.
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <p className={`${className} whitespace-pre-line`}>{episode.description}</p>
  );
}

export default EpisodeDetails;
