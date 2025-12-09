import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import InfogramPage from './pages/InfogramPage';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/infogram/:id" element={<InfogramPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
