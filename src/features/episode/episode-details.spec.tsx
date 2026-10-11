import { render, screen } from '@testing-library/react';

import EpisodeDetails from './episode-details';

describe('EpisodeDetails', () => {
  it('renders the HTML notes without unsafe markup', () => {
    render(
      <EpisodeDetails
        episode={{
          description: 'plain',
          html_description:
            '<p>Notes with <a href="https://x.y">a link</a></p><script>bad()</script>',
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'a link' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(document.querySelector('script')).toBeNull();
  });

  it('falls back to the plain description', () => {
    render(
      <EpisodeDetails
        episode={{ description: 'Plain', html_description: '' }}
      />,
    );
    expect(screen.getByText('Plain')).toBeInTheDocument();
  });
});
