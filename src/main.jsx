import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, AnimatePresence } from 'framer-motion'

// Immediate Global Bridge (Critical for Race Condition Prevention)
window.React = React;
window.motion = motion;
window.AnimatePresence = AnimatePresence;

import './index.css'
import App from './App.jsx'

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
