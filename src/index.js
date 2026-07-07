import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.module.css';
import './styles/Global.css';
// IBM Plex Sans, self-hosted — one import per weight actually used, so
// components can vary weight (400/500/600/700) for visual hierarchy.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);





