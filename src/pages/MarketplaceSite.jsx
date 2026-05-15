import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Search, MapPin, ShieldCheck, Filter, Users, MessageSquare, Send, X, Bot } from 'lucide-react';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';

export default function MarketplaceSite() {
  const stateCode = localStorage.getItem('detected_state') || localStorage.getItem('provider_state') || 'us';
  const stateData = US_STATES[stateCode] || DEFAULT_STATE;

  const [chatOpen, setChatOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [providers, setProviders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [chatMessages] = useState([
    { id: 1, text: `Hello! I am the Digital Intake Coordinator for the ${stateData.name} ${stateData.shortFacilityType} network. Are you looking for care for a loved one?`, sender: 'bot' }
  ]);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'homes'),
      where('complianceStatus', '==', 'Verified')
    );
    const unsub = onSnapshot(q, (snap) => {
      const activeProviders = snap.docs.map(doc => {
        const data = doc.data();
        let extractedState = 'us';
        if (data.address) {
          const match = data.address.match(/,\s*([A-Z]{2})\s*\d{5}/i);
          if (match && match[1]) {
            extractedState = match[1].toLowerCase();
          }
        }
        return { 
          id: doc.id,
          name: data.homeName || data.agencyName,
          city: data.address,
          state: extractedState,
          beds: data.vacancies || 0, 
          capacity: data.capacity || 0,
          staffCount: data.staffCount || 0,
          description: data.description || '',
          stateReady: true,
          careType: data.careType || 'Assisted Living',
          img: (data.publicPhotos && data.publicPhotos.length > 0) ? data.publicPhotos[0] : (data.homePhoto || '/images/afh_exterior.png')
        };
      });
      setProviders(activeProviders);
    }, (error) => {
      console.error("Marketplace fetch error:", error);
    });
    return () => unsub();
  }, []);

  const filteredProviders = providers.filter(p => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Assisted Living Home < 10 Beds') {
      return (p.careType.includes('Assisted Living') || p.careType.includes('Home')) && p.capacity < 10;
    }
    if (activeFilter === 'Assisted Living Facility > 10 Beds') {
      return (p.careType.includes('Assisted Living') || p.careType.includes('Facility')) && p.capacity >= 10;
    }
    if (activeFilter === 'In-Home Care' && p.careType === 'In-Home Care Agency') return true;
    return false;
  });

  const handleSimulateSearch = () => {
    setSearching(true);
    setTimeout(() => setSearching(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background pt-8 px-4 pb-24 relative overflow-hidden">
      {/* HEADER SECTION */}
      <motion.header initial="hidden" animate="visible" variants={fadeUp} className="max-w-7xl mx-auto text-center relative z-10">
        <h1 className="text-6xl lg:text-8xl font-serif italic font-medium tracking-tight mb-6 mt-12">
          Find Pre-Audited <br/><span className="text-primary not-italic font-sans font-bold">{stateData.facilityType}s</span>
        </h1>
        <p className="text-xl text-muted max-w-2xl mx-auto mb-16">
          Discover pre-audited domestic residences across {stateData.name === 'United States' ? 'the United States' : `${stateData.name} State`}. Listed homes use Agentic Home Care OS to maintain audit-ready {stateData.complianceLaw} evidence and resident safety workflows.
        </p>

        {/* SEARCH BAR */}
        <div className="max-w-3xl mx-auto glass-card flex items-center p-2 rounded-full shadow-2xl relative z-20 mb-20">
          <div className="pl-4 pr-2 text-muted"><Search className="w-6 h-6" /></div>
          <input 
            type="text" 
            placeholder={`Search for a licensed ${stateData.shortFacilityType}...`}
            className="flex-1 bg-transparent border-none outline-none text-foreground px-2 py-3 text-lg placeholder-muted"
          />
          <button onClick={handleSimulateSearch} disabled={searching} className="bg-primary hover:bg-blue-500 text-white px-4 py-3 rounded-full font-bold transition-transform hover:scale-105 hidden sm:block disabled:opacity-50">
            {searching ? 'Loading...' : 'Search'}
          </button>
        </div>
      </motion.header>

      {/* FILTER TABS */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-border relative z-10 gap-4">
         <h2 className="text-2xl font-serif italic font-medium">{stateData.name} Providers</h2>
         
         <div className="flex bg-surface-hover p-1 rounded-lg border border-border overflow-x-auto max-w-full">
           {['All', 'Assisted Living Home < 10 Beds', 'Assisted Living Facility > 10 Beds', 'In-Home Care'].map(tab => (
             <button 
               key={tab}  
               onClick={() => setActiveFilter(tab)}
               className={`px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeFilter === tab ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-foreground'}`}
             >
               {tab}
             </button>
           ))}
         </div>

         <button onClick={handleSimulateSearch} disabled={searching} className="flex items-center gap-2 text-muted hover:text-foreground transition-colors glass-card px-4 py-2 rounded-lg text-sm bg-surface ring-1 ring-border disabled:opacity-50">
           <Filter className="w-4 h-4" /> Filters
         </button>
      </div>

      {/* GRID */}
      {searching ? (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10 mt-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-card h-[350px] animate-pulse bg-surface/50 rounded-2xl flex flex-col">
              <div className="h-48 bg-white/5 w-full rounded-t-2xl" />
              <div className="py-6 px-4 flex flex-col gap-3">
                 <div className="h-6 w-3/4 bg-white/5 rounded" />
                 <div className="h-4 w-1/2 bg-white/5 rounded" />
                 <div className="mt-auto h-10 w-full bg-white/5 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10 mt-8">
          {filteredProviders.map((provider) => (
            <motion.div key={provider.id} variants={fadeUp} className="glass-card hover:scale-[1.02] transition-transform duration-300 overflow-hidden flex flex-col group cursor-pointer relative z-10">
              {/* Image Banner */}
              <div className="h-48 relative overflow-hidden">
                 <img src={provider.img} alt={provider.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                 {/* Badges */}
                 <div className="absolute top-4 right-4 flex gap-2">
                    <div className="bg-background/80 backdrop-blur-md text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-500/30">
                      {provider.careType}
                    </div>
                    {provider.stateReady && (
                      <div className="bg-background/80 backdrop-blur-md text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> {provider.state ? US_STATES[provider.state]?.complianceLaw || 'STATE' : stateData.complianceLaw || 'STATE'} AUDITED
                      </div>
                    )}
                 </div>
                 <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-muted border border-border">
                   {provider.careType === 'In-Home Care Agency' ? `${provider.staffCount} Field Staff` : `${provider.capacity} Bed Capacity`}
                 </div>
              </div>

              {/* Content body */}
              <div className="py-6 px-4 flex flex-col flex-1">
                <h3 className="text-2xl font-serif italic font-medium mb-2 line-clamp-1 text-foreground">{provider.name}</h3>
                <div className="flex items-center gap-2 text-muted text-sm mb-2">
                  <MapPin className="w-4 h-4" /> <span className="line-clamp-1">{provider.city}</span>
                </div>
                <p className="text-sm text-muted mb-6 line-clamp-2 min-h-[40px]">
                  {provider.description || `State-licensed ${stateData.shortFacilityType} providing domestic residential care.`}
                </p>
                <div className="mt-auto border-t border-border pt-4 flex items-center justify-between">
                  <div>
                    {provider.careType === 'In-Home Care Agency' ? (
                      <div className="flex flex-col">
                        <span className="text-accent font-bold">{provider.staffCount} Field Staff</span>
                        <span className="text-xs text-muted/70 flex items-center gap-1 mt-1"><Users className="w-3 h-3"/> Active Caregivers</span>
                      </div>
                    ) : provider.beds > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-accent font-bold">{provider.beds} Beds Available</span>
                        <span className="text-xs text-muted/70 flex items-center gap-1 mt-1"><Users className="w-3 h-3"/> Intimate {stateData.shortFacilityType} scale</span>
                      </div>
                    ) : (
                      <span className="text-muted/70 font-medium">Waitlist Only</span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setChatOpen(true); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${(provider.beds > 0 || provider.careType === 'In-Home Care Agency') ? 'bg-primary text-white shadow-lg hover:bg-blue-600' : 'bg-surface border border-border text-muted hover:text-foreground'}`}
                  >
                    {(provider.beds > 0 || provider.careType === 'In-Home Care Agency') ? 'Start Digital Intake' : 'Join Waitlist'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* FLOATING DIGITAL CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="glass-card w-[350px] overflow-hidden flex flex-col shadow-2xl border border-primary/20"
              style={{ height: '400px' }}
            >
              <div className="bg-primary/20 border-b border-primary/30 p-4 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Digital Intake Coordinator</h4>
                    <p className="text-xs text-primary font-bold">Online</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-muted hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-background/50">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.sender === 'bot' ? 'bg-surface border border-border text-foreground rounded-tl-none' : 'bg-primary text-white rounded-tr-none shadow-lg'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border bg-surface flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-primary/50"
                  readOnly 
                />
                <button className="p-2 bg-primary text-white rounded-full hover:bg-blue-600 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!chatOpen && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChatOpen(true)}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] border border-primary/50 text-white relative group"
          >
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-background rounded-full animate-pulse" />
            <MessageSquare className="w-7 h-7 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
