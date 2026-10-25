import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';
import { HomePage } from './pages/HomePage';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { JobManagementPage } from './pages/JobManagementPage';
import { MatchingDashboardPage } from './pages/MatchingDashboardPage';
import { SkillGapPage } from './pages/SkillGapPage';
import { JobComparisonPage } from './pages/JobComparisonPage';
import { ReportsHistoryPage } from './pages/ReportsHistoryPage';

const AppContent: React.FC = () => {
  const { currentPage } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'profile':
        return <CandidateProfilePage />;
      case 'jobs':
        return <JobManagementPage />;
      case 'matching':
        return <MatchingDashboardPage />;
      case 'gaps':
        return <SkillGapPage />;
      case 'comparison':
        return <JobComparisonPage />;
      case 'reports':
        return <ReportsHistoryPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderPage()}
        </main>
      </div>

      {/* Global Toast System */}
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
