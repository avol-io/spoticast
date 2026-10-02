import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyCriteria } from '../../lib/filters/engine';

import FilterSummary from './filter-summary';

describe('FilterSummary', () => {
  it('describes every active condition', async () => {
    const onClear = vi.fn();
    render(
      <FilterSummary
        criteria={{
          ...emptyCriteria,
          maxMinutes: 30,
          withinDays: 7,
          status: 'not-started',
          text: 'ai',
        }}
        onClear={onClear}
      />,
    );
    for (const text of ['≤ 30 min', 'last 7 days', 'Not started', '“ai”']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders nothing for an empty filter', () => {
    const { container } = render(<FilterSummary criteria={emptyCriteria} />);
    expect(container).toBeEmptyDOMElement();
  });
});
