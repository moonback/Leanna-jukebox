import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '../components/ui/LoadingState';

const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const LibraryPage = lazy(() => import('../pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const SongListPage = lazy(() => import('../pages/SongListPage').then((m) => ({ default: m.SongListPage })));
const PlayerPage = lazy(() => import('../pages/PlayerPage').then((m) => ({ default: m.PlayerPage })));
const ParentPage = lazy(() => import('../pages/ParentPage').then((m) => ({ default: m.ParentPage })));
const SimpleModePage = lazy(() => import('../pages/SimpleModePage').then((m) => ({ default: m.SimpleModePage })));
const ImagierPage = lazy(() => import('../pages/ImagierPage').then((m) => ({ default: m.ImagierPage })));
const ChercheTrouvePage = lazy(() => import('../pages/ChercheTrouvePage').then((m) => ({ default: m.ChercheTrouvePage })));
const MemoirePage = lazy(() => import('../pages/MemoirePage').then((m) => ({ default: m.MemoirePage })));
const JeuxPage = lazy(() => import('../pages/JeuxPage').then((m) => ({ default: m.JeuxPage })));
const MiniJeuxPage = lazy(() => import('../pages/MiniJeuxPage').then((m) => ({ default: m.MiniJeuxPage })));
const AutocollantsPage = lazy(() => import('../pages/AutocollantsPage').then((m) => ({ default: m.AutocollantsPage })));
const BallonsPage = lazy(() => import('../pages/BallonsPage').then((m) => ({ default: m.BallonsPage })));
const OmbresPage = lazy(() => import('../pages/OmbresPage').then((m) => ({ default: m.OmbresPage })));
const CompterPage = lazy(() => import('../pages/CompterPage').then((m) => ({ default: m.CompterPage })));
const MiniGamePage = lazy(() => import('../pages/MiniGamePage').then((m) => ({ default: m.MiniGamePage })));
const PianoPage = lazy(() => import('../pages/PianoPage').then((m) => ({ default: m.PianoPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState label="Ouverture de l’activité…" />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/list/:source" element={<SongListPage />} />
        <Route path="/play/:songId" element={<PlayerPage />} />
        <Route path="/imagier" element={<ImagierPage />} />
        <Route path="/cherche" element={<ChercheTrouvePage />} />
        <Route path="/memoire" element={<MemoirePage />} />
        <Route path="/jeux" element={<JeuxPage />} />
        <Route path="/mini-jeux" element={<MiniJeuxPage />} />
        <Route path="/autocollants" element={<AutocollantsPage />} />
        <Route path="/ballons" element={<BallonsPage />} />
        <Route path="/ombres" element={<OmbresPage />} />
        <Route path="/compter" element={<CompterPage />} />
        <Route path="/piano" element={<PianoPage />} />
        <Route path="/mini/:game" element={<MiniGamePage />} />
        <Route path="/simple" element={<SimpleModePage />} />
        <Route path="/parents" element={<ParentPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
