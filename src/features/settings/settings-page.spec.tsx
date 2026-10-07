import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as update from '../../lib/pwa/update';
import { useAuth } from '../../lib/spotify/auth';
import { useSettings } from '../../lib/storage/settings';
import { useArchiveStore } from '../archive/archive-store';
import * as controller from '../player/player-controller';

import SettingsPage from './settings-page';

describe('SettingsPage', () => {
  afterEach(() => act(() => update.resetUpdate()));

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

  it('shows pending archive syncs and retries failed ones', async () => {
    useArchiveStore.setState({
      pending: {
        a: {
          id: 'a',
          uri: 'u',
          name: 'A',
          durationMs: 1,
          archivedAt: 0,
          attempts: 3,
        },
        b: {
          id: 'b',
          uri: 'u',
          name: 'B',
          durationMs: 1,
          archivedAt: 0,
          attempts: 0,
        },
      },
    });
    const run = vi.spyOn(controller, 'runArchiveSync').mockResolvedValue();
    render(<SettingsPage />);
    expect(screen.getByText('2 episodes waiting to sync')).toBeInTheDocument();
    expect(screen.getByText(/1 could not be synced/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry now' }));
    expect(useArchiveStore.getState().pending.a.attempts).toBe(0);
    expect(run).toHaveBeenCalled();
    useArchiveStore.setState({ pending: {} });
  });

  it('shows the build and checks for updates', async () => {
    const check = vi.spyOn(update, 'checkForUpdate').mockResolvedValue();
    update.useUpdate.setState({ available: true });
    render(<SettingsPage />);
    expect(screen.getByText(new RegExp(__APP_BUILD__.sha))).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Check for updates' }),
    );
    expect(check).toHaveBeenCalled();
  });

  it('applies a waiting update', async () => {
    const apply = vi.spyOn(update, 'applyUpdate').mockResolvedValue();
    update.useUpdate.setState({ available: true, needRefresh: true });
    render(<SettingsPage />);
    expect(screen.getByText('A new version is ready.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(apply).toHaveBeenCalled();
  });
});
