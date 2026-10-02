import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { emptyCriteria, type FilterCriteria } from '../../lib/filters/engine';

import FilterEditor from './filter-editor';

function Harness({ onChange }: { onChange: (c: FilterCriteria) => void }) {
  const [value, setValue] = useState(emptyCriteria);
  return (
    <FilterEditor
      value={value}
      showVideoOption
      onChange={(c) => {
        setValue(c);
        onChange(c);
      }}
    />
  );
}

describe('FilterEditor', () => {
  it('edits every condition', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('At least'), '10');
    await userEvent.selectOptions(screen.getByLabelText('At most'), '45');
    await userEvent.click(screen.getByRole('button', { name: '7 days' }));
    await userEvent.click(screen.getByRole('radio', { name: 'In progress' }));
    await userEvent.type(
      screen.getByLabelText('Title or description contains'),
      'ai',
    );
    await userEvent.click(
      screen.getByRole('switch', { name: 'Only video podcasts' }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      minMinutes: 10,
      maxMinutes: 45,
      withinDays: 7,
      status: 'in-progress',
      text: 'ai',
      videoOnly: true,
    });
  });

  it('accepts a custom number of days', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Last N days'), '14');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ withinDays: 14 }),
    );
  });
});
