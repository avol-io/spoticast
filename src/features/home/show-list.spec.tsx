import { render, screen } from '@testing-library/react';
import type {
  SimplifiedEpisode,
  SimplifiedShow,
} from '../../lib/spotify/types';

import ShowListRow from './show-list';

describe('ShowListRow', () => {
  it('renders the latest episode and the unplayed count', () => {
    render(
      <ShowListRow
        show={
          { id: 's', name: 'My Show', images: [] } as unknown as SimplifiedShow
        }
        latest={
          { name: 'Ep 42', release_date: '2020-01-02' } as SimplifiedEpisode
        }
        badge={{ count: 3, more: false }}
      />,
    );
    expect(screen.getByText('My Show')).toBeInTheDocument();
    expect(screen.getByText(/Ep 42/)).toBeInTheDocument();
    expect(screen.getByText('3 episodes to listen to')).toBeInTheDocument();
  });
});
