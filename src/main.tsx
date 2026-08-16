import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Guida from './Guida';
import './index.css';

const path = window.location.pathname.replace(/\/+$/, '');
const isGuida = path === '/guida' || path === '/guida.html';

// Quando si arriva sulla guida con l'ancora di un capitolo, il ripristino
// automatico della posizione va spento prima che la pagina si disegni:
// altrimenti riporta dove si era rimasti l'ultima volta invece che al
// capitolo chiesto. Il salto lo fa Guida.tsx appena i capitoli esistono.
if (isGuida && window.location.hash) {
  window.history.scrollRestoration = 'manual';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isGuida ? <Guida /> : <App />}</React.StrictMode>
);
