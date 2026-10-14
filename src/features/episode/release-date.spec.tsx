import { act, render, screen } from '@testing-library/react';
import { useSettings } from '../../lib/storage/settings';

import ReleaseDate from './release-date';

describe('ReleaseDate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2024, 4, 20, 15), toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    act(() => useSettings.setState({ debugMode: false }));
  });

  it('shows only the formatted date', () => {
    const { container } = render(
      <ReleaseDate
        episode={{ release_date: '2024-05-19', release_date_precision: 'day' }}
      />,
    );
    expect(container).toHaveTextContent(/^yesterday$/);
  });

  it('shows the raw date next to it in debug mode', () => {
    useSettings.setState({ debugMode: true });
    render(
      <ReleaseDate
        episode={{ release_date: '2024-05-19', release_date_precision: 'day' }}
      />,
    );
    expect(screen.getByText(/2024-05-19 → yesterday/)).toBeInTheDocument();
  });

  it('names a coarser precision in debug mode', () => {
    useSettings.setState({ debugMode: true });
    render(
      <ReleaseDate
        episode={{ release_date: '2023-04', release_date_precision: 'month' }}
      />,
    );
    expect(
      screen.getByText(/2023-04 \(month\) → Sat, Apr 1, 2023/),
    ).toBeInTheDocument();
  });
});
