import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../firebase';
import { serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Building2, FileText, Users, ArrowRight, Loader2, DollarSign, Palette, CheckCircle2 } from 'lucide-react';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';

export default function OnboardingPortal() {
  const stateCode = localStorage.getItem('provider_state') || localStorage.getItem('detected_state') || 'us';
  const stateData = US_STATES[stateCode] || DEFAULT_STATE;

  const step = 1;
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type') || 'provider'; // 'provider' or 'reseller'
  const fname = searchParams.get('fname') || '';
  const lname = searchParams.get('lname') || '';
  const bname = searchParams.get('bname') || '';
  const initialRegion = searchParams.get('region') || '';
  const emailParam = searchParams.get('email') || '';
  const mode = searchParams.get('mode') || 'new'; // 'new' or 'add_site'
  const initialCareType = searchParams.get('careType') || 'Assisted Living Home < 10 Beds';
  
  const defaultPartnerName = bname ? bname : (fname && lname ? `${fname} ${lname}` : '');

  // Care Home Provider Form State
  // Business Info
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  
  // First Home Info
  const [homeName, setHomeName] = useState(bname);
  const [address, setAddress] = useState(initialRegion);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [careType, setCareType] = useState(initialCareType);
  const businessStatus = 'Operational';
  const homePhoto = null;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setBusinessEmail(emailParam || u.email || 'test@example.com');
      }
    });
    return () => unsub();
  }, [emailParam]);
  
  // Calculate dynamic max beds based on jurisdiction. Default to 6, with exceptions.
  const maxBeds = stateData.maxBeds || (stateCode === 'wa' ? 8 : stateCode === 'ca' ? 15 : 6);
  const capacity = Math.min(4, maxBeds);
  const staffCount = 5;
  const addressRef = useRef(null);
  const nameRef = useRef(null);

  // Affiliate (Reseller) Form State
  const [partnerName, setPartnerName] = useState(defaultPartnerName);
  const [region, setRegion] = useState(initialRegion);
  const [brandName, setBrandName] = useState(defaultPartnerName);
  const [payoutEmail, setPayoutEmail] = useState('');

  useEffect(() => {
    const prefillData = async () => {
      if (type === 'reseller' && auth.currentUser) {
        try {
          const homeSnap = await getDoc(doc(db, 'homes', auth.currentUser.uid));
          const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          
          let establishedName = '';
          let establishedAddress = '';
          let establishedEmail = auth.currentUser.email || '';

          if (homeSnap.exists()) {
            const hData = homeSnap.data();
            establishedName = hData.homeName || hData.agencyName || hData.businessName || '';
            establishedAddress = hData.address || hData.location || '';
            if (hData.providerEmail) establishedEmail = hData.providerEmail;
          }

          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (!establishedName) establishedName = uData.name || uData.displayName || uData.businessName || '';
            if (!establishedAddress) establishedAddress = uData.address || uData.region || '';
          }

          // Native Auth Fallback
          if (!establishedName) establishedName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || '';

          if (establishedName) {
            setPartnerName(establishedName);
            setBrandName(establishedName);
          }
          if (establishedAddress) setRegion(establishedAddress);
          setPayoutEmail(establishedEmail);

        } catch (err) {
          console.error("Failed to prefill reseller data", err);
        }
      }
    };
    prefillData();

    // Check if adding a site to an existing business
    if (mode === 'add_site' && auth.currentUser) {
      const checkExisting = async () => {
        const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (uData.businessId) {
            const bSnap = await getDoc(doc(db, 'businesses', uData.businessId));
            if (bSnap.exists()) {
              setBusinessName(bSnap.data().businessName);
              setCareType(bSnap.data().careType || 'Assisted Living');
              // We stay on step 1 now as the UI is unified, but with pre-filled business context
            }
          }
        }
      };
      checkExisting();
    }
  }, [type, mode]);

  const googleInitialized = useRef(false);

  useEffect(() => {
    // Only attempt initialization once per step/type combination
    if (step === 1 && window.google && !googleInitialized.current) {
      const initAutocomplete = () => {
        try {
          if (!nameRef.current) return;
          
          // Check if Google Maps script actually loaded correctly (not a 403/InvalidKey)
          // We can't perfectly detect key errors from JS, but we can catch init errors
          const nameAutocomplete = new window.google.maps.places.Autocomplete(nameRef.current, {
            types: ['establishment'],
            componentRestrictions: { country: 'us' }
          });
          
          // Google sometimes injects styles/classes that fight with React
          // If we detect an error happened (via console override or similar), we could stop
          
          nameAutocomplete.addListener('place_changed', () => {
            const place = nameAutocomplete.getPlace();
            if (place.name) {
              setBusinessName(place.name); 
              if (nameRef.current) nameRef.current.value = place.name;
              if (type === 'provider') setHomeName(place.name);
              else setPartnerName(place.name);
            }
            if (place.formatted_address) {
              if (type === 'provider') {
                setAddress(place.formatted_address);
                if (addressRef.current) addressRef.current.value = place.formatted_address;
              } else {
                setRegion(place.formatted_address);
              }
              
              const addressComponents = place.address_components;
              if (addressComponents && type === 'provider') {
                const stateComponent = addressComponents.find(c => c.types.includes('administrative_area_level_1'));
                if (stateComponent) {
                  localStorage.setItem('provider_state', stateComponent.short_name.toLowerCase());
                }
              }
            }
            if (place.formatted_phone_number) {
              setBusinessPhone(place.formatted_phone_number);
            }
          });

          if (addressRef.current) {
            const addressAutocomplete = new window.google.maps.places.Autocomplete(addressRef.current, {
              types: type === 'reseller' ? ['(regions)'] : ['address'],
              componentRestrictions: { country: 'us' }
            });
            addressAutocomplete.addListener('place_changed', () => {
              const place = addressAutocomplete.getPlace();
              if (place.formatted_address) {
                if (type === 'provider') {
                  setAddress(place.formatted_address);
                  if (addressRef.current) addressRef.current.value = place.formatted_address;
                } else {
                  setRegion(place.formatted_address);
                }
                
                const addressComponents = place.address_components;
                if (addressComponents && type === 'provider') {
                  const stateComponent = addressComponents.find(c => c.types.includes('administrative_area_level_1'));
                  if (stateComponent) {
                    localStorage.setItem('provider_state', stateComponent.short_name.toLowerCase());
                  }
                }

                if (place.name && !place.formatted_address.includes(place.name) && type === 'provider') {
                  setHomeName(place.name);
                }
              }
            });
          }
          
          googleInitialized.current = true;
        } catch (err) {
          console.error("Google Autocomplete initialization failed", err);
        }
      };

      const timer = setTimeout(initAutocomplete, 500);
      return () => clearTimeout(timer);
    }
  }, [step, type]);

  const handleProviderComplete = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // 1. Create Business Doc (if new)
      let currentBusinessId = '';
      if (mode === 'new') {
        const businessId = `biz_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'businesses', businessId), {
          ownerUid: auth.currentUser.uid,
          businessName,
          businessEmail: businessEmail || auth.currentUser?.email || 'test@example.com',
          businessPhone,
          careType,
          createdAt: serverTimestamp()
        });
        currentBusinessId = businessId;
      } else {
        // Find existing businessId
        const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        currentBusinessId = uSnap.data()?.businessId;
      }

      // 2. Create Home Doc
      const homeId = `home_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, 'homes', homeId), {
        ownerId: auth.currentUser.uid,
        businessId: currentBusinessId,
        homeName: homeName || businessName,
        address,
        state: localStorage.getItem('provider_state') || 'us',
        licenseNumber,
        careType,
        homePhoto,
        capacity: careType === 'In-Home Care Agency' || businessStatus === 'Aspiring' ? 0 : capacity,
        staffCount: careType === 'In-Home Care Agency' && businessStatus !== 'Aspiring' ? staffCount : 0,
        subscriptionStatus: businessStatus === 'Aspiring' ? 'incubation' : 'trial',
        businessStatus,
        trialEndsAt: trialEndsAt.toISOString(),
        createdAt: serverTimestamp(),
        refId: searchParams.get('ref') || null
      });

      // 3. Update User Doc
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        role: 'provider',
        businessId: currentBusinessId,
        activeHomeId: homeId,
        isAdmin: true
      }, { merge: true });
      
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorText(err.message || 'An error occurred during setup.');
      setLoading(false);
    }
  };


  const handleResellerComplete = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      // 1. Create the reseller record in Firestore without Stripe info initially
      await setDoc(doc(db, 'resellers', auth.currentUser.uid), {
        ownerId: auth.currentUser.uid,
        partnerName,
        address: region,
        brandName,
        payoutEmail: payoutEmail || auth.currentUser?.email || 'test@example.com',
        resellerType: searchParams.get('entity') || 'Unknown',
        stripeConnectStatus: 'Action Required',
        deployedSandboxes: 0,
        createdAt: serverTimestamp(),
      }, { merge: true });

      // 2. Also ensure user doc is updated
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        role: 'reseller',
        isAdmin: true
      }, { merge: true });

      navigate('/reseller-portal');
    } catch (err) {
      console.error(err);
      setErrorText(err.message || 'An error occurred during finalization.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-12 pb-12 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
         <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${type === 'reseller' ? 'bg-indigo-500/20' : 'bg-primary/20'} rounded-full blur-[150px]`} />
         <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 ${type === 'reseller' ? 'bg-blue-500/10' : 'bg-emerald-500/10'} rounded-full blur-[150px]`} />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
            Business Onboarding
          </h1>
          <p className="text-muted">
            {type === 'reseller' 
              ? 'Setup your Affiliate Dashboard, Custom Branding, and Stripe Payouts.' 
              : `Configure your Agentic Home Care OS instance for Assisted Living, Home Care, or Partners.`}
          </p>
          {type !== 'reseller' && (
            <p className="text-[10px] text-muted/60 mt-1 uppercase tracking-widest font-bold">
              Compliance Target: {stateData.code === 'us' ? 'Assisted Living Provider' : stateData.name} {stateData.complianceLaw}
            </p>
          )}
        </div>

        {/* Progress Bar Removed as it is now a single step */}

        <div className="glass-card shadow-2xl overflow-hidden border border-white/10 relative">
          <AnimatePresence mode="wait">
            
            {/* UNIFIED SINGLE-STEP ONBOARDING */}
            {step === 1 && (
              <motion.div key="unified-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 flex flex-col gap-6">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                  <div className={`p-3 ${careType === 'Reseller Partner' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-primary/10 text-primary'} rounded-xl`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {mode === 'add_site' ? 'New Site Registration' : (careType === 'Reseller Partner' ? 'Partner Enrollment' : 'Business Registration')}
                    </h2>
                    <p className="text-sm text-muted">
                      Complete your profile to access your dashboard.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Type of Organization</label>
                    <select value={careType} onChange={e => setCareType(e.target.value)} className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 shadow-inner appearance-none">
                      <option value={"Assisted Living Home < 10 Beds"}>Assisted Living Home &lt; 10 Beds</option>
                      <option value={"Assisted Living Facility > 10 Beds"}>Assisted Living Facility &gt; 10 Beds</option>
                      <option value="In-Home Care Agency">In-Home Care Agency</option>
                      <option value="Individual Reseller">Individual Affiliate</option>
                      <option value="Business Reseller">Business Affiliate</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">{mode === 'add_site' ? 'Home / Facility Name' : 'Legal Business Name'}</label>
                    <input 
                      ref={nameRef} 
                      type="text" 
                      value={businessName} 
                      onChange={e => {
                        setBusinessName(e.target.value);
                        if (careType === 'Reseller Partner') setPartnerName(e.target.value);
                        if (type === 'provider') setHomeName(e.target.value);
                      }} 
                      placeholder="e.g. Cascade Care Holdings LLC" 
                      autoComplete="off" 
                      className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 shadow-inner" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">
                    {mode === 'add_site' ? 'Physical Site Address' : (careType === 'Reseller Partner' || careType.includes('Reseller') || careType.includes('Affiliate') ? 'Business Address' : 'Physical Address')}
                  </label>
                  <input 
                    ref={addressRef} 
                    type="text" 
                    value={careType === 'Reseller Partner' ? region : address} 
                    onChange={e => {
                      if (careType === 'Reseller Partner') setRegion(e.target.value);
                      else setAddress(e.target.value);
                    }} 
                    placeholder="e.g. 123 Evergreen Terrace, Seattle WA" 
                    autoComplete="off" 
                    className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 shadow-inner" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Contact Phone</label>
                    <input type="tel" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="(555) 000-0000" className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 shadow-inner" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Contact Email</label>
                    <input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="admin@cascadecare.com" className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 shadow-inner" />
                  </div>
                </div>

                {/* License Number Row */}
                {!careType.includes('Reseller') && !careType.includes('Affiliate') && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">License Number</label>
                    <input 
                      type="text" 
                      value={licenseNumber} 
                      onChange={e => setLicenseNumber(e.target.value)} 
                      placeholder="e.g. AFH-123456" 
                      className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 shadow-inner" 
                    />
                  </div>
                )}

                {errorText && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400 text-sm font-bold">
                    {errorText}
                  </div>
                )}

                <button 
                  onClick={() => {
                    if (careType === 'Reseller Partner') handleResellerComplete();
                    else handleProviderComplete();
                  }} 
                  disabled={!businessName || (!address && !region) || (!licenseNumber && !careType.includes('Reseller')) || loading} 
                  className={`w-full mt-4 ${careType === 'Reseller Partner' ? 'bg-indigo-600' : 'bg-primary'} text-white py-4 rounded-lg font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{mode === 'add_site' ? 'Register New Site' : 'Complete Setup'} <ArrowRight className="w-4 h-4" /></>}
                </button>

                <p className="text-[10px] text-center text-muted italic">
                  Additional details like capacity, licensing, and branding can be configured in your dashboard settings.
                </p>
              </motion.div>
            )}

            {/* STRIPE STEP REMOVED - NOW ACCESSIBLE FROM DASHBOARD AFTER FIRST HOME ADDED */}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
