import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ComposeEmailModal } from './components/ComposeEmailModal';

import { DashboardPage } from './pages/DashboardPage';
import { AssistantPage } from './pages/AssistantPage';
import { EmailPage } from './pages/EmailPage';
import { TaskManagerPage } from './pages/TaskManagerPage';
import { CalendarPage } from './pages/CalendarPage';
import { RemindersPage } from './pages/RemindersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';

const MainAppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {/* Toast Notifications Overlay */}
      <ToastContainer />

      {/* Global Modals */}
      <GlobalSearchModal setActiveTab={setActiveTab} />
      <ComposeEmailModal />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setIsOpenMobile={setIsOpenMobile}
        />

        <main className="flex-1 overflow-x-hidden">
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'assistant' && <AssistantPage setActiveTab={setActiveTab} />}
          {activeTab === 'email' && <EmailPage />}
          {activeTab === 'tasks' && <TaskManagerPage />}
          {activeTab === 'calendar' && <CalendarPage />}
          {activeTab === 'reminders' && <RemindersPage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainAppLayout />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
