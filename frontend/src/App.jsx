import React from 'react';
import { useApp } from './context/AppContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/MapView';
import { Schedule } from './pages/Schedule';
import { SolarDeploymentIntelligence } from './pages/SolarDeploymentIntelligence';
import { SolarHealthIntelligence } from './pages/SolarHealthIntelligence';
import { SmartDiagnostics } from './pages/SmartDiagnostics';
import { Settings } from './pages/Settings';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { SearchModal } from './components/SearchModal';
import { Toast } from './components/Toast';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';

export const App = () => {
  const { currentUser, activeRoute } = useApp();

  if (!currentUser) {
    return <Login />;
  }

  const isOperator = currentUser.role === 'Operator';
  const effectiveRoute = isOperator && !['dashboard', 'map'].includes(activeRoute) ? 'dashboard' : activeRoute;

  const renderActiveScreen = () => {
    switch (effectiveRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'map':
        return <MapView />;
      case 'schedule':
        return <Schedule />;
      case 'evaluator':
        return <SolarDeploymentIntelligence />;
      case 'oracle':
        return <SolarHealthIntelligence />;
      case 'assistance':
        return <SmartDiagnostics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="main-wrapper">
        <Header />
        <main className="content-area">{renderActiveScreen()}</main>
      </div>

      {/* Mobile Bottom Navigation (LG ThinQ / iOS Style) */}
      <MobileNav />

      {/* Global Modals & Notifications */}
      <SearchModal />
      <Toast />
      <ForcePasswordChangeModal />
    </div>
  );
};
