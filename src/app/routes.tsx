import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { LibraryPage } from '../pages/LibraryPage';
import { SongListPage } from '../pages/SongListPage';
import { PlayerPage } from '../pages/PlayerPage';
import { ParentPage } from '../pages/ParentPage';
import { SimpleModePage } from '../pages/SimpleModePage';
import { ImagierPage } from '../pages/ImagierPage';
import { ChercheTrouvePage } from '../pages/ChercheTrouvePage';

/** Routes de l'application (HashRouter : fonctionne depuis un fichier local, donc aussi dans Capacitor). */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/list/:source" element={<SongListPage />} />
      <Route path="/play/:songId" element={<PlayerPage />} />
      <Route path="/imagier" element={<ImagierPage />} />
      <Route path="/cherche" element={<ChercheTrouvePage />} />
      <Route path="/simple" element={<SimpleModePage />} />
      <Route path="/parents" element={<ParentPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
