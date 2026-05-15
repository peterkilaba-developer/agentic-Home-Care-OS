import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, ShieldCheck, Activity, ChevronDown } from 'lucide-react';
import { US_STATES } from '../data/statesData';

const navLinks = [
  { name: 'Platform', path: '/platform' },
  { name: 'Pricing', path: '/pricing' },
  { name: 'Marketplace', path: '/marketplace' },
  { name: 'Legal', path: '/legal' },
];

// Sort states for the mega menu
const stateList = Object.values(US_STATES).filter(s => s.code !== 'us').sort((a, b) => a.name.localeCompare(b.name));

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [showMega, setShowMega] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setIsOpen(false);
    setShowMega(false);
  }, [location]);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        scrolled || showMega
          ? 'bg-background/95 backdrop-blur-xl border-b border-border py-4' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-sans font-bold tracking-tight text-foreground">Operational Compliance</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] -mt-1">Agentic OS</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.path ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Compliance Mega Menu Trigger */}
          <div 
            className="relative"
            onMouseEnter={() => setShowMega(true)}
            onMouseLeave={() => setShowMega(false)}
          >
            <button className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${showMega ? 'text-primary' : 'text-muted-foreground'}`}>
              State Compliance <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showMega ? 'rotate-180' : ''}`} />
            </button>

            {/* Mega Menu Portal */}
            <AnimatePresence>
              {showMega && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="fixed top-[73px] left-0 right-0 bg-background/95 backdrop-blur-2xl border-b border-border shadow-2xl py-12 px-6 max-h-[80vh] overflow-y-auto"
                >
                  <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-12">
                      {stateList.map((state) => (
                        <Link 
                          key={state.code}
                          to={`/state/${state.code}`}
                          className="group flex flex-col gap-1 hover:bg-primary/5 p-2 rounded-lg transition-all"
                        >
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{state.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{state.regulator} Compliant</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            to="/auth" 
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Sign In
          </Link>
          <Link 
            to="/auth?join=provider" 
            className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-y-auto max-h-[90vh]"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.path}
                  className="text-xl font-serif italic text-foreground hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              
              <div className="pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">State Compliance</h4>
                <div className="grid grid-cols-2 gap-4">
                  {stateList.map((state) => (
                    <Link 
                      key={state.code} 
                      to={`/state/${state.code}`}
                      className="text-sm font-medium text-foreground"
                    >
                      {state.name}
                    </Link>
                  ))}
                </div>
              </div>

              <hr className="border-border" />
              <div className="flex flex-col gap-4">
                <Link 
                  to="/auth" 
                  className="w-full py-4 rounded-2xl border border-border text-center font-bold"
                >
                  Sign In
                </Link>
                <Link 
                  to="/auth?join=provider" 
                  className="w-full py-4 rounded-2xl bg-primary text-white text-center font-bold shadow-lg"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
