import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SwipeRow from './swipe-row';

describe('SwipeRow', () => {
  afterEach(() => vi.useRealTimers());

  const renderRow = (props: Partial<Parameters<typeof SwipeRow>[0]> = {}) => {
    const onAction = vi.fn();
    const onContent = vi.fn();
    render(
      <SwipeRow
        selectLabel="Select row"
        actions={[{ label: 'Archive', icon: <svg />, onSelect: onAction }]}
        {...props}
      >
        <button type="button" onClick={onContent}>
          Content
        </button>
      </SwipeRow>,
    );
    return { onAction, onContent };
  };

  const swipe = (from: number, to: number) => {
    const target = screen.getByRole('button', { name: 'Content' });
    fireEvent.pointerDown(target, {
      pointerId: 1,
      button: 0,
      clientX: from,
      clientY: 10,
    });
    fireEvent.pointerMove(target, {
      pointerId: 1,
      clientX: (from + to) / 2,
      clientY: 10,
    });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: to, clientY: 10 });
    fireEvent.pointerUp(target, { pointerId: 1, clientX: to, clientY: 10 });
    fireEvent.click(target);
  };

  it('reveals its actions on a left swipe, without tapping the content', async () => {
    const { onAction, onContent } = renderRow();
    const action = screen.getByRole('button', {
      name: 'Archive',
      hidden: true,
    });
    expect(action.parentElement).toHaveAttribute('inert');
    swipe(200, 100);
    expect(onContent).not.toHaveBeenCalled();
    expect(action.parentElement).not.toHaveAttribute('inert');
    await userEvent.click(action);
    expect(onAction).toHaveBeenCalled();
  });

  it('ignores vertical moves (scrolling)', () => {
    renderRow();
    const target = screen.getByRole('button', { name: 'Content' });
    fireEvent.pointerDown(target, {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 10,
    });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 90, clientY: 80 });
    fireEvent.pointerUp(target, { pointerId: 1 });
    expect(
      screen.getByRole('button', { name: 'Archive', hidden: true })
        .parentElement,
    ).toHaveAttribute('inert');
  });

  it('starts the selection on a long press and swallows the click', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { onContent } = renderRow({ onLongPress });
    const target = screen.getByRole('button', { name: 'Content' });
    fireEvent.pointerDown(target, {
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(target, { pointerId: 1 });
    fireEvent.click(target);
    expect(onLongPress).toHaveBeenCalled();
    expect(onContent).not.toHaveBeenCalled();
  });

  it('toggles instead of using the content while selecting', async () => {
    const onToggle = vi.fn();
    const { onContent } = renderRow({
      selecting: true,
      selected: true,
      onToggle,
    });
    const box = screen.getByRole('checkbox', { name: 'Select row' });
    expect(box).toBeChecked();
    await userEvent.click(box);
    expect(onToggle).toHaveBeenCalled();
    expect(onContent).not.toHaveBeenCalled();
  });
});
