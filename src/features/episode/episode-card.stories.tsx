import type { Meta, StoryObj } from '@storybook/react-vite';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Episode } from '../../lib/spotify/types';
import EpisodeCard from './episode-card';
import { episodeKey } from './open-episode';

const episode = {
  id: 'e1',
  uri: 'spotify:episode:e1',
  type: 'episode',
  name: 'Episodio 80: il futuro dell’IA',
  description: '',
  html_description:
    '<p>In questa puntata parliamo di modelli, agenti e di cosa cambia per chi sviluppa.</p><ul><li>00:00 Introduzione</li><li>12:30 Gli agenti</li></ul><p>Link: <a href="https://example.com">example.com</a></p>',
  duration_ms: 54 * 60_000,
  release_date: '2026-10-10',
  explicit: false,
  images: [],
  external_urls: { spotify: 'https://open.spotify.com/episode/e1' },
  resume_point: { fully_played: false, resume_position_ms: 18 * 60_000 },
  show: {
    id: 's1',
    name: 'Tech Talk Daily',
    images: [],
    media_type: 'audio',
  },
} as unknown as Episode;

/** Seeds the episode and opens the card on it, as a row click does. */
function Opened() {
  const queryClient = useQueryClient();
  useState(() => queryClient.setQueryData(episodeKey('e1'), episode));
  const navigate = useNavigate();
  useEffect(() => navigate('?episode=e1', { replace: true }), [navigate]);
  return <EpisodeCard />;
}

const meta = {
  component: EpisodeCard,
  title: 'Episode/EpisodeCard',
  render: () => <Opened />,
} satisfies Meta<typeof EpisodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
