import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SegmentedControl from './segmented-control';

describe('SegmentedControl', () => {
  it('marks the selected option and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Theme"
        value="dark"
        onChange={onChange}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(onChange).toHaveBeenCalledWith('light');
  });
});
