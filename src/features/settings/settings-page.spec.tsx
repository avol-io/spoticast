import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as update from '../../lib/pwa/update';
import { useAuth } from '../../lib/spotify/auth';
import { useSettings } from '../../lib/storage/settings';
import { useArchiveStore } from '../archive/archive-store';
import { closeFeedback, useFeedback } from '../feedback/feedback-store';
import * as controller from '../player/player-controller';

import SettingsPage from './settings-page';

const build = vi.hoisted(() => ({
  beta: false,
  releaseUrl: undefined as string | undefined,
}));
vi.mock('../../lib/build-info', () => ({
  get APP_BUILD() {
    return { ...__APP_BUILD__, releaseUrl: build.releaseUrl };
  },
  get IS_BETA() {
    return build.beta;
  },
  LOGO_URL: '/logo.svg',
  APP_TITLE: 'Spoticast',
}));

const diagnostics = vi.hoisted(() => ({ enabled: true }));
vi.mock('../../lib/diagnostics/config', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  get DIAG_ENABLED() {
    return diagnostics.enabled;
  },
}));

describe('SettingsPage', () => {
  afterEach(() => {
    act(() => update.resetUpdate());
    Object.assign(build, { beta: false, releaseUrl: undefined });
    diagnostics.enabled = true;
    closeFeedback();
  });

  it('updates the theme and skip intervals', async () => {
    render(<SettingsPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(useSettings.getState().theme).toBe('light');

    const forward = screen.getByRole('radiogroup', { name: 'Skip forward' });
    await userEvent.click(
      forward.querySelector('[role=radio]:last-child') as HTMLElement,
    );
    expect(useSettings.getState().skipForwardSeconds).toBe(60);
  });

  it('names this device in Spotify Connect', async () => {
    render(<SettingsPage />, { wrapper: MemoryRouter });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Device name' }),
      "Ale's iPhone",
    );
    expect(useSettings.getState().deviceName).toBe("Ale's iPhone");
    expect(
      screen.getByText(/In Spotify Connect: “Spoticast \(Ale's iPhone\)”/),
    ).toHaveTextContent('It changes the next time you open the app.');
    act(() => useSettings.setState({ deviceName: '' }));
  });

  it('logs out', async () => {
    useAuth.setState({
      tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: 0, scope: '' },
    });
    render(<SettingsPage />, { wrapper: MemoryRouter });
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
          sharedAt: null,
        },
        b: {
          id: 'b',
          uri: 'u',
          name: 'B',
          durationMs: 1,
          archivedAt: 0,
          attempts: 0,
          sharedAt: null,
        },
      },
    });
    const run = vi.spyOn(controller, 'runArchiveSync').mockResolvedValue();
    render(<SettingsPage />, { wrapper: MemoryRouter });
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
    render(<SettingsPage />, { wrapper: MemoryRouter });
    expect(screen.getByText(new RegExp(__APP_BUILD__.sha))).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Release notes' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Check for updates' }),
    );
    expect(check).toHaveBeenCalled();
  });

  it('applies a waiting update', async () => {
    const apply = vi.spyOn(update, 'applyUpdate').mockResolvedValue();
    update.useUpdate.setState({ available: true, needRefresh: true });
    render(<SettingsPage />, { wrapper: MemoryRouter });
    expect(screen.getByText('A new version is ready.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(apply).toHaveBeenCalled();
  });

  it('marks beta builds and links the release notes', () => {
    Object.assign(build, {
      beta: true,
      releaseUrl: 'https://example.com/v1.0.0-beta.1',
    });
    render(<SettingsPage />, { wrapper: MemoryRouter });
    // In the mobile header and next to the version.
    expect(screen.getAllByText('Beta')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Release notes' })).toHaveAttribute(
      'href',
      'https://example.com/v1.0.0-beta.1',
    );
  });

  it('names the version waiting to be applied', () => {
    update.useUpdate.setState({
      available: true,
      needRefresh: true,
      next: { version: 'v2.0.0' },
    });
    render(<SettingsPage />, { wrapper: MemoryRouter });
    expect(screen.getByText('Version v2.0.0 is ready.')).toBeInTheDocument();
  });

  it('opens the feedback report (beta)', async () => {
    render(<SettingsPage />, { wrapper: MemoryRouter });
    await userEvent.click(
      screen.getByRole('button', { name: 'Report a problem' }),
    );
    expect(useFeedback.getState().open).toBe(true);
  });

  it('toggles debug mode (beta)', async () => {
    render(<SettingsPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('switch', { name: /Debug mode/ }));
    expect(useSettings.getState().debugMode).toBe(true);
    act(() => useSettings.setState({ debugMode: false }));
  });

  it('has no feedback or debug mode in production', () => {
    diagnostics.enabled = false;
    render(<SettingsPage />, { wrapper: MemoryRouter });
    expect(screen.queryByText('Feedback (beta)')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
