import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight, Shield, Loader2, Phone, MessageSquare, Mail } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db, functions } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { enableLocalDemo } from '../data/localDemo';
import { mapAuthError } from '../utils/authErrors';
import { providerHasHome } from '../data/homeAccess';

const STAFF_PORTAL_ROLES = ['caregiver', 'med-tech', 'rn-delegator'];

function isStaffPortalUser(userData = {}) {
  const role = userData.role?.toLowerCase();
  const staffRole = userData.staffRole?.toLowerCase();
  return STAFF_PORTAL_ROLES.includes(role) || STAFF_PORTAL_ROLES.includes(staffRole);
}

export default function AuthSite() {
  const [loading, setLoading] = useState(false);
  const businessNameRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isResellerSignup = queryParams.get('join') === 'reseller';
  const isCaregiverSignup = queryParams.get('join') === 'caregiver';
  const customBrand = queryParams.get('ref');
  const homeId = queryParams.get('homeId');
  const prefilledEmail = queryParams.get('email') || '';
  const prefilledPhone = queryParams.get('phone') || '';
  
  // Persist referral data across reloads/redirects (critical for mobile Google Auth)
  useEffect(() => {
    if (customBrand) sessionStorage.setItem('pending_ref', customBrand);
    if (queryParams.get('join')) sessionStorage.setItem('pending_join', queryParams.get('join'));
  }, [customBrand, queryParams]);

  const effectiveRef = customBrand || sessionStorage.getItem('pending_ref');
  const isProviderSignup = queryParams.get('join') === 'provider' || sessionStorage.getItem('pending_join') === 'provider';

  const fromPath = location.state?.from?.pathname || '';

  // Determine initial role. If referred by an affiliate (ref), force 'provider' role.
  let initialRole = 'provider';
  if (isResellerSignup && !effectiveRef) initialRole = 'reseller';
  else if (isCaregiverSignup) initialRole = 'caregiver';
  else if (fromPath) {
    if (fromPath.startsWith('/caregiver')) initialRole = 'caregiver';
    else if (fromPath.startsWith('/client-portal')) initialRole = 'family';
    else if (fromPath.startsWith('/reseller-portal') && !effectiveRef) initialRole = 'reseller';
    else if (fromPath.startsWith('/dashboard')) initialRole = 'provider';
  }

  const [role, setRole] = useState(initialRole);
  
  // New States for Onboarding View
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [resellerType, setResellerType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [region, setRegion] = useState('');
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [phone, setPhone] = useState(prefilledPhone);
  const [errorText, setErrorText] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [googleReady, setGoogleReady] = useState(!!window.google || !!window.__googleMapsReady);
  
  const regionRef = useRef(null);

  // Detect when Google Maps script is fully loaded and ready
  useEffect(() => {
    const handleGoogleReady = () => {
      console.log("Google Maps API Script Loaded via Callback.");
      setGoogleReady(true);
    };

    const handleGoogleError = () => {
      console.error("Google Maps API Key Error: Billing or Domain Restriction issue.");
      setErrorText("Google Maps Autocomplete failed. This usually indicates an invalid API key, missing billing, or domain restrictions in your Google Cloud Console.");
      setGoogleReady(false);
    };

    window.addEventListener('google-maps-ready', handleGoogleReady);
    window.addEventListener('google-maps-error', handleGoogleError);

    if (window.google || window.__googleMapsReady) {
      queueMicrotask(handleGoogleReady);
    }
    
    return () => {
      window.removeEventListener('google-maps-ready', handleGoogleReady);
      window.removeEventListener('google-maps-error', handleGoogleError);
    };
  }, []);

  const initFields = () => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
 
    if (regionRef.current && !regionRef.current.dataset.initialized) {
      try {
        const addrAutocomplete = new window.google.maps.places.Autocomplete(regionRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' }
        });
        regionRef.current.dataset.initialized = "true";
        addrAutocomplete.addListener('place_changed', () => {
          const place = addrAutocomplete.getPlace();
          if (place.formatted_address) {
            setRegion(place.formatted_address);
            setIsAddressVerified(true);
          }
        });
      } catch (e) { console.error("Address Autocomplete Init Error:", e); }
    }
 
    if (businessNameRef.current && !businessNameRef.current.dataset.initialized) {
      try {
        const bizAutocomplete = new window.google.maps.places.Autocomplete(businessNameRef.current, {
          types: ['establishment'],
          componentRestrictions: { country: 'us' }
        });
        businessNameRef.current.dataset.initialized = "true";
        bizAutocomplete.addListener('place_changed', () => {
          const place = bizAutocomplete.getPlace();
          if (place.name) setBusinessName(place.name);
          if (place.formatted_address) {
            setRegion(place.formatted_address);
            setIsAddressVerified(true);
          }
        });
      } catch (e) { console.error("Business Autocomplete Init Error:", e); }
    }
  };

  useEffect(() => {
    if (googleReady && needsOnboarding) {
      const timer = setTimeout(initFields, 100);
      return () => clearTimeout(timer);
    }
  }, [googleReady, needsOnboarding, resellerType]);

  const isSigningInRef = useRef(false);

  const acceptCaregiverInvite = useCallback(async (uid) => {
    if (!homeId) return;

    try {
      const acceptStaffInvite = httpsCallable(functions, 'acceptStaffInvite');
      const result = await acceptStaffInvite({ homeId, email: prefilledEmail, phone: prefilledPhone || phone });
      const acceptedStaff = result.data?.staffMember || {};
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const existingData = userSnap.exists() ? userSnap.data() : {};
      const existingRole = existingData.role?.toLowerCase();
      const existingStaffRole = (acceptedStaff.role || existingData.staffRole)?.toLowerCase();
      const staffRole = STAFF_PORTAL_ROLES.includes(existingStaffRole)
        ? existingStaffRole
        : (STAFF_PORTAL_ROLES.includes(existingRole) ? existingRole : 'caregiver');

      await setDoc(userRef, {
        homeId,
        role: 'caregiver',
        staffRole,
        name: acceptedStaff.name || existingData.name || '',
        email: acceptedStaff.email || prefilledEmail || existingData.email || '',
        phone: acceptedStaff.phone || prefilledPhone || phone || existingData.phone || '',
        isAdmin: false,
      }, { merge: true });
    } catch (err) {
      console.error("Failed to auto-provision staff account:", err);
    }
  }, [homeId, prefilledEmail, prefilledPhone, phone]);

  const needsOnboardingRef = useRef(needsOnboarding);
  useEffect(() => { needsOnboardingRef.current = needsOnboarding; }, [needsOnboarding]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isSigningInRef.current) {
        setIsVerifying(false);
        return;
      }

      if (!user) {
        setIsVerifying(false);
        return;
      }

      if (isCaregiverSignup && homeId) {
        // Staff member clicked invite link while already signed in — accept the invite
        try {
          await acceptCaregiverInvite(user.uid);
        } catch (err) {
          console.error('Auto-accept invite failed:', err);
        }
        navigate('/caregiver', { replace: true });
        setIsVerifying(false);
        return;
      }

      if (needsOnboardingRef.current || isProviderSignup) {
        setIsVerifying(false);
        return;
      }

      try {
        const uid = user.uid;
        const [resellerDoc, userDoc] = await Promise.all([
          getDoc(doc(db, 'resellers', uid)),
          getDoc(doc(db, 'users', uid))
        ]);

        let destination = null;
        const hasHome = await providerHasHome(uid, userDoc.exists() ? userDoc.data() : null);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData.role?.toLowerCase();
          const userType = userData.type?.toLowerCase();
          
          if (isStaffPortalUser(userData)) {
            destination = '/caregiver';
          } else if (userRole === 'family') {
            destination = '/client-portal';
          } else if (
            userRole === 'provider' || 
            userRole === 'home' || 
            userRole === 'agency' || 
            userType === 'home' || 
            userType === 'agency' ||
            hasHome
          ) {
            // Priority 1: If they are a provider, home, or agency, they go to dashboard
            destination = '/dashboard';
          }
        } else if (hasHome) {
          // Fallback: If no user doc but they have a home (unlikely but safe)
          destination = '/dashboard';
        }

        if (destination) {
          navigate(destination, { replace: true });
          return;
        }

        if (resellerDoc.exists()) {
          navigate('/reseller-portal', { replace: true });
          return;
        }

        setNeedsOnboarding(true);
      } catch (err) {
        console.error("Session verification failed:", err);
        setNeedsOnboarding(true);
      } finally {
        setIsVerifying(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, isCaregiverSignup]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorText('');
    isSigningInRef.current = true;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;
      
      if (homeId && role === 'caregiver') {
        await acceptCaregiverInvite(uid);
        navigate('/caregiver', { replace: true });
        return;
      }
      
      const resellerDoc = await getDoc(doc(db, 'resellers', uid));
      if (resellerDoc.exists()) {
        navigate('/reseller-portal', { replace: true });
        return;
      }
      
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (isStaffPortalUser(userData)) {
          navigate('/caregiver', { replace: true });
        } else if (userData.role === 'family') {
          navigate('/client-portal', { replace: true });
        } else {
          if (await providerHasHome(uid, userDoc.data())) {
            navigate('/dashboard', { replace: true });
          } else {
            setNeedsOnboarding(true);
          }
        }
        return;
      }
      setNeedsOnboarding(true);
    } catch (err) {
      console.error('[AUTH] ERROR:', err.code, err.message);
      setErrorText(mapAuthError(err));
    } finally {
      isSigningInRef.current = false;
      setLoading(false);
    }
  };

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    if (!resellerType) {
      setErrorText("Please select an Entity Type.");
      return;
    }

    const finalBusinessName = businessNameRef.current?.value || businessName;
    const finalAddress = regionRef.current?.value || region;

    if (!finalAddress) {
      setErrorText("Please provide a Physical Address.");
      return;
    }

    if ((resellerType.includes('Assisted Living') || resellerType === 'In-Home Care Agency') && !finalBusinessName) {
      setErrorText("Please provide a Legal Business Name.");
      return;
    }
    
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("No authenticated user found.");
      
      if (role === 'provider') {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        const businessId = uid;
        await setDoc(doc(db, 'businesses', businessId), {
          ownerUid: uid,
          businessName: finalBusinessName,
          businessEmail: auth.currentUser?.email || '',
          businessPhone: phone || '',
          careType: resellerType,
          createdAt: serverTimestamp()
        });

        const homeId = uid;
        await setDoc(doc(db, 'homes', homeId), {
          ownerId: uid,
          businessId: businessId,
          homeName: finalBusinessName,
          address: finalAddress,
          careType: resellerType,
          capacity: resellerType === 'In-Home Care Agency' ? 0 : 6,
          refId: effectiveRef || null,
          referredBy: effectiveRef || null,
          subscriptionStatus: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
          createdAt: serverTimestamp()
        });

        console.log(`[ONBOARDING] Successfully attributed home to affiliate: ${effectiveRef}`);
        sessionStorage.removeItem('pending_ref');
        sessionStorage.removeItem('pending_join');

        await setDoc(doc(db, 'users', uid), {
          role: 'provider',
          businessId: businessId,
          activeHomeId: homeId,
          isAdmin: true
        }, { merge: true });

        navigate('/dashboard');
      } else if (role === 'reseller') {
        await setDoc(doc(db, 'resellers', uid), {
          ownerId: uid,
          partnerName: finalBusinessName || `${firstName} ${lastName}`,
          address: finalAddress,
          brandName: finalBusinessName || `${firstName} ${lastName}`,
          payoutEmail: auth.currentUser?.email || '',
          resellerType: resellerType,
          stripeConnectStatus: 'Action Required',
          deployedSandboxes: 0,
          createdAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, 'users', uid), {
          role: 'reseller'
        }, { merge: true });

        navigate('/reseller-portal');
      }
    } catch (err) {
      console.error('[AUTH] Reseller signup error:', err.code, err.message);
      setErrorText(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center pt-12 pb-12 px-4 relative overflow-hidden font-serif">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-3xl font-sans font-bold tracking-tight mb-6">
            <Brain className={`${customBrand ? 'text-indigo-400' : 'text-primary'} w-8 h-8`} />
            {customBrand ? (
              <span className="capitalize">{customBrand} <span className="text-primary font-light italic font-serif">OS</span></span>
            ) : (
              <span className="font-serif italic font-medium tracking-tight">Agentic <span className="text-primary not-italic font-sans font-bold">Home Care OS</span></span>
            )}
          </Link>
          <h2 className="text-3xl font-serif italic font-medium mb-2">
             {needsOnboarding ? "Complete Your Profile" : "Platform Login"}
          </h2>
          <p className="text-muted text-sm">
             {isVerifying ? "Detecting active session..." : (needsOnboarding ? "Tell us how you plan to use Agentic Home Care OS." : (isCaregiverSignup ? "Scan the QR code to drop right into the portal." : "Welcome back. Sign in securely."))}
          </p>
        </div>

        <div className="glass-card shadow-2xl py-8 px-4 border border-border min-h-[240px] flex flex-col justify-center">
          {isVerifying ? (
             <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="font-bold animate-pulse">Syncing Compliance Profiles...</p>
             </div>
          ) : (
            <>
          {errorText && <p className="text-accent text-sm font-bold bg-accent/10 border border-accent/20 p-3 rounded-lg mb-4">{errorText}</p>}

          {!needsOnboarding ? (
            <div className="flex flex-col gap-4">
              <button 
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="bg-white text-slate-900 rounded-lg py-4 font-bold transition-all hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 w-full shadow-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    {isCaregiverSignup ? 'Scan & Sign in with Google' : 'Sign in with Google'}
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-muted mt-4">
                {isCaregiverSignup 
                  ? "Scanning the QR code drops you right into the secure Caregiver Portal." 
                  : "No credit card required. Military-grade Business Associate Agreement (BAA) signed upon entry."}
              </p>
              
              {['localhost', '127.0.0.1'].includes(window.location.hostname) && (
                <button 
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      enableLocalDemo();
                      navigate('/dashboard/settings');
                    } catch (err) {
                      console.error("Bypass failed:", err);
                      setErrorText("Bypass failed: " + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="mt-8 text-[10px] text-muted hover:text-primary transition-colors uppercase tracking-tighter opacity-50"
                >
                  Developer: Bypass Auth for Testing
                </button>
              )}
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleCompleteSetup}>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest">Entity Type</label>
                <select 
                  value={resellerType}
                  onChange={(e) => {
                    setResellerType(e.target.value);
                    setRegion('');
                    setIsAddressVerified(false);
                    if (e.target.value.includes('Assisted Living') || e.target.value === 'In-Home Care Agency') {
                      setRole('provider');
                    } else {
                      setRole('reseller');
                    }
                  }}
                  required
                  className="w-full bg-background border border-border rounded-lg py-3 px-4 focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                >
                  <option value="" disabled>Select your entity type...</option>
                  <option value={"Assisted Living Home < 10 Beds"}>Assisted Living Home &lt; 10 Beds</option>
                  <option value={"Assisted Living Facility > 10 Beds"}>Assisted Living Facility &gt; 10 Beds</option>
                  <option value="In-Home Care Agency">In-Home Care Agency</option>
                  {!effectiveRef && (
                    <>
                      <option value="Individual Reseller">Individual Affiliate</option>
                      <option value="Business Reseller">Business Affiliate</option>
                    </>
                  )}
                </select>
              </div>

              {resellerType === 'Individual Reseller' && (
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">First Name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 transition-colors" placeholder="John" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Last Name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 transition-colors" placeholder="Doe" />
                  </div>
                </div>
              )}
              
              {resellerType && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-muted uppercase tracking-widest">
                        {(resellerType.includes('Assisted Living') || resellerType === 'In-Home Care Agency') ? 'Physical Address' : 'Business Address'}
                      </label>
                      {isAddressVerified && (
                        <button type="button" onClick={() => { setRegion(''); setIsAddressVerified(false); }} className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter">Change</button>
                      )}
                    </div>
                    <input ref={regionRef} type="text" value={region} onChange={e => { setRegion(e.target.value); setIsAddressVerified(false); }} readOnly={isAddressVerified} autoComplete="off" className={`w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 transition-colors ${isAddressVerified ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="123 Main St, City, State" />
                  </div>

                  {(resellerType === 'Business Reseller' || resellerType.includes('Assisted Living') || resellerType === 'In-Home Care Agency') && (
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-bold text-muted uppercase tracking-widest">Legal Business Name</label>
                      <input ref={businessNameRef} type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} autoComplete="off" className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 transition-colors" placeholder="Enter your company name..." />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Contact Phone</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 transition-colors" placeholder="(555) 000-0000" />
                  </div>
                </div>
              )}

              <button type="submit" disabled={!resellerType || loading} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-3 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Complete {resellerType.includes('Reseller') ? 'Partner' : 'Provider'} Setup <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
          </>
          )}
        </div>

        <div className="mt-8 flex justify-center items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
           <Shield className="w-4 h-4 text-primary" /> SECURED BY OPERATIONAL COMPLIANCE ENGINE
        </div>
      </div>
    </div>
  );
}
