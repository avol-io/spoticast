import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSettings } from '../../lib/storage/settings';

import MarketSelect from './market-select';

describe('MarketSelect', () => {
  afterEach(() => useSettings.setState({ chartsMarket: null }));

  it('defaults to automatic and stores an explicit country', async () => {
    render(<MarketSelect />);
    const select = screen.getByRole('combobox', { name: 'Charts country' });
    expect(select).toHaveValue('auto');
    await userEvent.selectOptions(select, 'it');
    expect(useSettings.getState().chartsMarket).toBe('it');
    await userEvent.selectOptions(select, 'auto');
    expect(useSettings.getState().chartsMarket).toBeNull();
  });
});
