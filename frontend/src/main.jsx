import 'bootstrap/dist/css/bootstrap.min.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';  
import './index.css';
import App from './App.jsx';
import Home from './pages/Home';
import MapaInteractivo from './components/MapaInteractivo.jsx';
import CrearSoluciones from './components/CrearSoluciones.jsx';
import VisualizadorSoluciones from './components/VisualizadorSoluciones.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} /> {/* Página principal */}
        <Route path="/gestionar-vehiculos" element={<App />} /> {/* Página de gestión de vehículos */}
        <Route path="/mapa-interactivo" element={<MapaInteractivo />} /> {/* Página del Mapa */}
        <Route path="/crear-soluciones" element={<CrearSoluciones />} /> {/* Página de Generar Soluciones */}
        <Route path="/soluciones/:idRuta" element={<VisualizadorSoluciones />} /> {/* Página Mostrar Soluciones */}
      </Routes>
    </Router>
  </StrictMode>
);
