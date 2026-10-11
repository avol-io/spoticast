import { render, screen } from '@testing-library/react';

import PageHeader from './page-header';

const build = vi.hoisted(() => ({ beta: false }));
vi.mock('../../lib/build-info', () => ({
  get IS_BETA() {
    return build.beta;
  },
  get APP_TITLE() {
    return build.beta ? 'Spoticast Beta' : 'Spoticast';
  },
  LOGO_URL: '/logo.svg',
}));

describe('PageHeader', () => {
  afterEach(() => {
    build.beta = false;
  });

  it('renders the title and actions', () => {
    render(<PageHeader title="Podcasts" actions={<button>Sort</button>} />);
    expect(
      screen.getByRole('heading', { name: 'Podcasts' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
  });

  it('shows the logo and names the window after the page', () => {
    const { container } = render(<PageHeader title="Up Next" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/logo.svg');
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(document.title).toBe('Up Next · Spoticast');
  });

  it('marks the beta build', () => {
    build.beta = true;
    render(<PageHeader title="Up Next" />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(document.title).toBe('Up Next · Spoticast Beta');
  });

  it('can show another title on mobile', () => {
    render(<PageHeader title="Podcasts" mobileTitle="Spoticast.it" />);
    expect(screen.getByText('Spoticast.it')).toHaveClass('lg:hidden');
    expect(screen.getByText('Podcasts')).toHaveClass('hidden', 'lg:inline');
    expect(document.title).toBe('Podcasts · Spoticast');
  });
});
