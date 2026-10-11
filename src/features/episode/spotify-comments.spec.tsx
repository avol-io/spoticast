import { render, screen } from '@testing-library/react';

import SpotifyComments from './spotify-comments';

describe('SpotifyComments', () => {
  it('links to the episode on Spotify', () => {
    render(<SpotifyComments episodeId="e1" />);
    expect(
      screen.getByRole('link', { name: 'Comment on Spotify' }),
    ).toHaveAttribute('href', 'https://open.spotify.com/episode/e1');
    expect(screen.getByText(/come back here/)).toBeInTheDocument();
  });
});
