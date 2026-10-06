import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import Switch from './switch';

const meta = { title: 'UI/Switch' } satisfies Meta;
export default meta;

function SwitchDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <div className="max-w-md">
      <Switch
        label="Crea playlist su Spotify"
        description="“Spoticast - Ascolti veloci” viene ricreata a ogni avvio."
        checked={checked}
        onChange={setChecked}
      />
    </div>
  );
}

export const WithDescription: StoryObj = { render: () => <SwitchDemo /> };
