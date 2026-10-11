import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SmartHelp from './smart-help';

describe('SmartHelp', () => {
  it('explains smart playlists with an example', async () => {
    render(<SmartHelp />);
    await userEvent.click(
      screen.getByRole('button', { name: 'What are smart playlists?' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'What are smart playlists?' }),
    ).toHaveTextContent('Today’s news');
  });
});
