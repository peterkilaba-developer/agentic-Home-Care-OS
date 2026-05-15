import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import AuthSite from './pages/AuthSite';
import Dashboard from './pages/Dashboard';
import CaregiverPortal from './pages/CaregiverPortal';
import ClientPortal from './pages/ClientPortal';
import ResellerSite from './pages/ResellerSite';
import OnboardingPortal from './pages/OnboardingPortal';
import MarketingSite from './pages/MarketingSite';
import MarketplaceSite from './pages/MarketplaceSite';
import PlatformSite from './pages/PlatformSite';
import PricingSite from './pages/PricingSite';
import LegalSite from './pages/LegalSite';
import StateRegulations from './pages/StateRegulations';
import LocationRouter from './components/LocationRouter';

import { db } from './firebase';
import { terminate, clearIndexedDbPersistence } from 'firebase/firestore';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Global Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', background: '#020617', color: '#fb7185', minHeight: '100vh', fontFamily: 'serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '20px', fontStyle: 'italic' }}>System Halt</h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '40px', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
              A critical runtime error has occurred. This is often caused by corrupted local data or browser state conflicts.
            </p>
            
            <div style={{ background: '#1e1b4b', padding: '24px', borderRadius: '12px', border: '1px solid #3730a3', marginBottom: '40px', width: '100%' }}>
              <code style={{ fontSize: '0.9rem', color: '#e2e8f0', wordBreak: 'break-all' }}>
                {this.state.error && this.state.error.toString()}
              </code>
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
              >
                Attempt Restoration
              </button>
              
              <button 
                onClick={async () => {
                  try {
                    await terminate(db);
                    await clearIndexedDbPersistence(db);
                  } catch (e) {
                    console.error("Failed to clear Firestore persistence:", e);
                  }
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = window.location.pathname + '?reset=' + Date.now();
                }}
                style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
              >
                Clear Data & Force Reset
              </button>
            </div>
            
            <p style={{ marginTop: '40px', fontSize: '0.8rem', color: '#475569', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Agentic Home Care OS • Operational Compliance AI Engine
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import SiteLayout from './components/SiteLayout';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Main Portals */}
            <Route path="/auth/*" element={<AuthSite />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/caregiver/*" element={<CaregiverPortal />} />
            <Route path="/client-portal/*" element={<ClientPortal />} />
            <Route path="/reseller-portal/*" element={<ResellerSite />} />
            <Route path="/onboarding/*" element={<OnboardingPortal />} />
            
            {/* Informational Sites with Global Header/Footer */}
            <Route element={<SiteLayout />}>
              <Route path="/marketing" element={<MarketingSite />} />
              <Route path="/marketplace" element={<MarketplaceSite />} />
              <Route path="/platform" element={<PlatformSite />} />
              <Route path="/pricing" element={<PricingSite />} />
              <Route path="/legal" element={<LegalSite />} />
              <Route path="/state/:stateCode" element={<StateRegulations />} />
              
              {/* Root Route with Location Detection */}
              <Route path="/" element={<LocationRouter />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
