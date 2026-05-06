import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { requestLocationPermissions } from '@/services/locationService';
import { startAutosave } from '@/services/autosaveService';
import MapScreen from '@/screens/MapScreen';
import ProjectsScreen from '@/screens/ProjectsScreen';
import ProjectDetailScreen from '@/screens/ProjectDetailScreen';
import LayersScreen from '@/screens/LayersScreen';
import LayerDetailScreen from '@/screens/LayerDetailScreen';
import ImportScreen from '@/screens/ImportScreen';
import ExportScreen from '@/screens/ExportScreen';
import SettingsScreen from '@/screens/SettingsScreen';

/**
 * Root component. Equivalent to ContentView.swift — picks which
 * screen to render based on the current state in the store.
 *
 * No external router (react-router) is used; we keep the screen
 * stack inside the Zustand store so it's trivial to navigate
 * programmatically from anywhere in the app.
 */
export default function App() {
  const currentScreen = useAppStore((s) => s.currentScreen);

  useEffect(() => {
    // Ask for GPS permission at startup so the map can show the user's location
    requestLocationPermissions().catch((err) => {
      console.warn('Could not request location permissions:', err);
    });

    // Start writing every store change back to the local database
    const stopAutosave = startAutosave();
    return () => {
      stopAutosave();
    };
  }, []);

  switch (currentScreen.name) {
    case 'map':
      return <MapScreen />;
    case 'projects':
      return <ProjectsScreen />;
    case 'projectDetail':
      return <ProjectDetailScreen projectId={currentScreen.projectId} />;
    case 'layers':
      return <LayersScreen />;
    case 'layerDetail':
      return <LayerDetailScreen layerId={currentScreen.layerId} />;
    case 'import':
      return <ImportScreen />;
    case 'export':
      return <ExportScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}
