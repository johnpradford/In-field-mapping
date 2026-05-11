import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Note: React StrictMode is intentionally NOT used here.
// In dev, StrictMode mounts every component twice on first render to surface
// effect-cleanup bugs. That's normally fine, but with MapLibre GL it causes
// the WebGL canvas to be created and destroyed in quick succession, which
// occasionally races with our source/layer setup and leaves pins / measure
// overlays unrendered. Removing StrictMode is the simplest reliable fix
// here. Standard mounts in production are unaffected either way.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
