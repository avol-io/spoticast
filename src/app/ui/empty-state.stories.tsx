import type { Meta, StoryObj } from '@storybook/react-vite';
import { Headphones } from 'lucide-react';
import EmptyState from './empty-state';

const meta = { component: EmptyState, title: 'UI/EmptyState' } satisfies Meta<
  typeof EmptyState
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = {
  args: {
    icon: <Headphones />,
    title: 'Sei in pari!',
    description:
      'Tutti gli episodi caricati di questo podcast sono archiviati.',
    action: (
      <button className="rounded-full bg-brand px-4 py-2 font-semibold text-brand-fg">
        Cerca podcast
      </button>
    ),
  },
};

export const TitleOnly: Story = {
  args: { title: 'Nessun episodio corrisponde al filtro' },
};
