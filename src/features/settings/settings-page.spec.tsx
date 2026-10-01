import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '../../lib/spotify/auth';
import { useSettings } from '../../lib/storage/settings';

import SettingsPage from './settings-page';

describe('SettingsPage', () => {
  it('updates the theme and skip intervals', async () => {
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(useSettings.getState().theme).toBe('light');

    const forward = screen.getByRole('radiogroup', { name: 'Skip forward' });
    await userEvent.click(
      forward.querySelector('[role=radio]:last-child') as HTMLElement,
    );
    expect(useSettings.getState().skipForwardSeconds).toBe(60);
  });

  it('logs out', async () => {
    useAuth.setState({
      tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: 0, scope: '' },
    });
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(useAuth.getState().tokens).toBeNull();
  });
});
