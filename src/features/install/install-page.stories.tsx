import type { Meta, StoryObj } from '@storybook/react-vite';
import { useInstall } from '../../lib/pwa/install';
import InstallPage from './install-page';

const meta = {
  component: InstallPage,
  title: 'Install/InstallPage',
} satisfies Meta<typeof InstallPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Steps: Story = {
  beforeEach: () => {
    useInstall.setState({ prompt: null, installed: false });
  },
};

export const Installed: Story = {
  beforeEach: () => {
    useInstall.setState({ installed: true });
    return () => useInstall.setState({ installed: false });
  },
};
