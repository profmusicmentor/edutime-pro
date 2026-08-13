import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Guida from './Guida';
import './index.css';

const path = window.location.pathname.replace(/\/+$/, '');
const isGuida = path === '/guida' || path === '/guida.html';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isGuida ? <Guida /> : <App />}</React.StrictMode>
);
