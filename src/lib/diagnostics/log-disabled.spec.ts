import { clearLog, diag, saveLog, snapshotLog } from './log';

vi.mock('./config', () => ({
  DIAG_ENABLED: false,
  DIAG_WINDOW_MS: 60_000,
}));

describe('diagnostics log in production', () => {
  afterEach(() => clearLog());

  it('records and stores nothing', () => {
    diag('sdk', 'ready');
    saveLog();
    expect(snapshotLog()).toEqual([]);
    expect(localStorage.getItem('spoticast.diag')).toBeNull();
  });
});
