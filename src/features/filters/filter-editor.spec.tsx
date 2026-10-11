import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { emptyCriteria, type FilterCriteria } from '../../lib/filters/engine';

import FilterEditor from './filter-editor';

function Harness({
  onChange,
  showArchivedOption,
}: {
  onChange: (c: FilterCriteria) => void;
  showArchivedOption?: boolean;
}) {
  const [value, setValue] = useState(emptyCriteria);
  return (
    <FilterEditor
      value={value}
      showVideoOption
      showArchivedOption={showArchivedOption}
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
    await userEvent.click(screen.getByRole('button', { name: 'In progress' }));
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
      statuses: ['in-progress'],
      text: 'ai',
      videoOnly: true,
    });
  });

  it('toggles several listening statuses', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} showArchivedOption />);
    const chip = (name: string) => screen.getByRole('button', { name });
    expect(chip('All')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip('In progress'));
    await userEvent.click(chip('Not started'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ statuses: ['not-started', 'in-progress'] }),
    );
    expect(chip('All')).toHaveAttribute('aria-pressed', 'false');
    // Ticking every status is the same as no filter.
    await userEvent.click(chip('Archived'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ statuses: [] }),
    );
    expect(chip('All')).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves the archived status to the podcast page tabs', () => {
    render(<Harness onChange={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: 'Archived' }),
    ).not.toBeInTheDocument();
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
