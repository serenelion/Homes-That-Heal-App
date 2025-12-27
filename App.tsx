import React, { useState } from 'react';
import { ScanProvider } from './core/ScanContext';
import { Home } from './pages/Home';
import { ScanSession } from './pages/ScanSession';
import { Results } from './pages/Results';
import { Processing } from './pages/Processing';

export default function App() {
  const [page, setPage] = useState('home');

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home onNavigate={setPage} />;
      case 'scan':
        return <ScanSession onNavigate={setPage} />;
      case 'results':
        return <Results onNavigate={setPage} />;
      case 'processing':
        return <Processing onNavigate={setPage} />;
      default:
        return <Home onNavigate={setPage} />;
    }
  };

  return (
    <ScanProvider>
      <div className="h-full w-full">
        {renderPage()}
      </div>
    </ScanProvider>
  );
}
