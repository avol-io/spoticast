import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { emptyCriteria, type FilterCriteria } from '../../lib/filters/engine';
import FilterEditor from './filter-editor';

const meta = { title: 'Filters/FilterEditor' } satisfies Meta;
export default meta;

function EditorDemo() {
  const [value, setValue] = useState<FilterCriteria>({
    ...emptyCriteria,
    maxMinutes: 30,
    withinDays: 7,
    status: 'not-started',
  });
  return (
    <div className="max-w-lg">
      <FilterEditor value={value} onChange={setValue} showVideoOption />
    </div>
  );
}

export const SmartList: StoryObj = { render: () => <EditorDemo /> };
