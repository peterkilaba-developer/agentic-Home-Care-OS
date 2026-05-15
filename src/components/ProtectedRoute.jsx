import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { DEMO_USER, isLocalDemoEnabled } from '../data/localDemo';

export default function ProtectedRoute({ children }) {
  const isLocalDemo = isLocalDemoEnabled();
  const [user, setUser] = useState(() => (isLocalDemo ? DEMO_USER : null));
  const [loading, setLoading] = useState(() => !isLocalDemo);
  const location = useLocation();

  useEffect(() => {
    if (isLocalDemo) return undefined;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isLocalDemo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans text-slate-300">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-widest uppercase text-slate-500 animate-pulse">Authenticating Session...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect them to the auth page, but save the current location they were trying to go to if needed
    // For now, simple redirect to auth
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}
