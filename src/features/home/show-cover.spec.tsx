import { render, screen } from '@testing-library/react';

import ShowCover from './show-cover';

const show = {
  id: 's1',
  name: 'Show',
  images: [{ url: 'cover.jpg', width: 300, height: 300 }],
};

describe('ShowCover', () => {
  it('shows the unplayed badge', () => {
    render(<ShowCover show={show} badge={{ count: 50, more: true }} />);
    expect(screen.getByText('50+')).toBeInTheDocument();
  });

  it('hides an empty badge', () => {
    const { container } = render(
      <ShowCover show={show} badge={{ count: 0, more: false }} />,
    );
    expect(container.querySelector('span')).toBeNull();
  });
});
