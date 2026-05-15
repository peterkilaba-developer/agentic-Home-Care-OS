import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { US_STATES } from '../data/statesData';
import MarketingSite from '../pages/MarketingSite';
import { providerHasHome } from '../data/homeAccess';

const STAFF_PORTAL_ROLES = ['caregiver', 'med-tech', 'rn-delegator'];

export default function LocationRouter() {
  const navigate = useNavigate();
  const [detectedState, setDetectedState] = useState(() => {
    try {
      return localStorage.getItem('detected_state') || 'us';
    } catch (_e) { return 'us'; }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in, redirect to correct portal
        try {
          const uid = user.uid;
          
          // Check if reseller
          const resellerDoc = await getDoc(doc(db, 'resellers', uid));
          if (resellerDoc.exists()) {
            navigate('/reseller-portal', { replace: true });
            return;
          }
          
          // Check if user (caregiver/family/provider)
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role?.toLowerCase();
            const staffRole = userData.staffRole?.toLowerCase();
            if (STAFF_PORTAL_ROLES.includes(role) || STAFF_PORTAL_ROLES.includes(staffRole)) {
              navigate('/caregiver', { replace: true });
              return;
            }
            if (role === 'family') {
              navigate('/client-portal', { replace: true });
              return;
            }
            if (role === 'provider') {
              // Only redirect to dashboard if they have a completed home profile
              if (await providerHasHome(uid, userDoc.data())) {
                navigate('/dashboard', { replace: true });
                return;
              }
              // No home profile yet — fall through to marketing site
            }
          }
        } catch (err) {
          console.error("Auth redirect error:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const detectLocation = async () => {
      // If we already have a detected state in localStorage, use it but still potentially refresh
      const cached = localStorage.getItem('detected_state');
      if (cached && US_STATES[cached]) {
        setDetectedState(cached);
      }

      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error("API Limit");
        
        const data = await response.json();
        const regionCode = data.region_code?.toLowerCase();

        if (regionCode && US_STATES[regionCode]) {
          localStorage.setItem('detected_state', regionCode);
          setDetectedState(regionCode);
        }
      } catch (err) {
        console.warn("Location detection failed", err);
      }
    };

    detectLocation();
  }, []);

  // Render the marketing site with the detected state as a prop
  return <MarketingSite stateOverride={detectedState} />;
}
