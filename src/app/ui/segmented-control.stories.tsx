import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import SegmentedControl from './segmented-control';

const meta = { title: 'UI/SegmentedControl' } satisfies Meta;
export default meta;

function ThemeDemo() {
  const [value, setValue] = useState('dark');
  return (
    <SegmentedControl
      label="Tema"
      value={value}
      onChange={setValue}
      options={[
        { value: 'dark', label: 'Scuro' },
        { value: 'light', label: 'Chiaro' },
        { value: 'auto', label: 'Sistema' },
      ]}
    />
  );
}

export const Theme: StoryObj = { render: () => <ThemeDemo /> };
