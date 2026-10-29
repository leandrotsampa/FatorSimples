import {createRoot} from 'react-dom/client';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import { StorageErrorScreen } from './components/StorageErrorScreen';
import './index.css';
import { initAppPrefs } from './utils/appPrefs';

// Tema e preferências do banco (desktop) antes do primeiro desenho
initAppPrefs();

// Banco não abriu: a tela de erro no lugar do app (nada é gravado em outro lugar)
const storageError = window.electronAPI?.storageError;

createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    {storageError ? <StorageErrorScreen message={storageError.message} dbPath={storageError.dbPath} /> : <App />}
  </MotionConfig>
);
