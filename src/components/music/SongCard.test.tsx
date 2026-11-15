import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SongCard } from './SongCard';
import { setNowPlaying } from '../../services/nowPlaying';
import type { Song } from '../../types/song';

const song: Song = {
  id: 'song-1',
  title: 'Le lapin malin',
  youtubeVideoId: 'dQw4w9WgXcQ',
  categoryId: 'c1',
  illustration: 'bunny',
  favorite: false,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
};

function renderCard() {
  return render(
    <MemoryRouter>
      <SongCard song={song} source="all" />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  setNowPlaying(null);
});

describe('SongCard', () => {
  it('affiche la miniature, le libellé accessible et conserve la liste d’origine', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Lire la vidéo : Le lapin malin' });
    expect(link).toHaveAttribute('href', '/play/song-1?list=all');
    expect(link.querySelector('img')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('n’affiche pas l’indicateur de lecture quand la chanson ne joue pas', () => {
    renderCard();
    expect(screen.queryByLabelText('En cours de lecture')).not.toBeInTheDocument();
  });

  it('affiche l’indicateur de lecture quand cette chanson joue', () => {
    setNowPlaying('song-1');
    renderCard();
    expect(screen.getByLabelText('En cours de lecture')).toBeInTheDocument();
  });
});
