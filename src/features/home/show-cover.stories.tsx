import type { Meta, StoryObj } from '@storybook/react-vite';
import ShowCover from './show-cover';

const cover = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#e4572e"/><stop offset="1" stop-color="#8338ec"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/></svg>',
)}`;

const meta = {
  component: ShowCover,
  title: 'Home/ShowCover',
  args: {
    show: {
      id: 's1',
      name: 'Tech Talk',
      images: [{ url: cover, width: 300, height: 300 }],
    },
  },
  decorators: [(Story) => <div className="w-40 p-2">{<Story />}</div>],
} satisfies Meta<typeof ShowCover>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithBadge: Story = { args: { badge: { count: 7, more: false } } };
export const ManyUnplayed: Story = {
  args: { badge: { count: 50, more: true } },
};
export const NoBadge: Story = {};
