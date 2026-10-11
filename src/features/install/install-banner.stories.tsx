import type { Meta, StoryObj } from '@storybook/react-vite';
import InstallBanner from './install-banner';

const meta = {
  component: InstallBanner,
  title: 'Install/InstallBanner',
  beforeEach: () => {
    try {
      localStorage.removeItem('spoticast.install-banner-dismissed-at');
    } catch {
      // ignore
    }
  },
} satisfies Meta<typeof InstallBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AboveTheMiniPlayer: Story = {};

export const InTheSidebar: Story = {
  args: { variant: 'sidebar' },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};
