import ReactDOM from 'react-dom/client';
import { IonApp } from '@ionic/react';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import App from './App';
import './index.css';

// Note: React StrictMode is intentionally NOT used here.
// In dev, StrictMode mounts every component twice on first render to surface
// effect-cleanup bugs. That's normally fine, but with MapLibre GL it causes
// the WebGL canvas to be created and destroyed in quick succession, which
// occasionally races with our source/layer setup and leaves pins / measure
// overlays unrendered. Removing StrictMode is the simplest reliable fix
// here. Standard mounts in production are unaffected either way.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <IonApp>
    <App />
  </IonApp>
);
