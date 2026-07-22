import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { StoresView } from './components/StoresView';
import { ProjectView } from './components/ProjectView';
import { LabelsView } from './components/LabelsView';

function App() {
  const [currentTab, setCurrentTab] = useState<'labels' | 'stores' | 'project'>('labels');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Barre latérale commune */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Rendu dynamique de la vue sélectionnée */}
      <main className="flex-1 overflow-auto">
        {currentTab === 'labels' && <LabelsView />}
        {currentTab === 'stores' && <StoresView />}
        {currentTab === 'project' && <ProjectView />}
      </main>
    </div>
  );
}

export default App;