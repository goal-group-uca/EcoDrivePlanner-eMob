import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow" style={{
      backgroundColor: '#3498db',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    }}>
      <div className="container">
        <Link className="navbar-brand" to="/" style={{
          fontWeight: '600',
          fontSize: '1.5rem'
        }}>
          <strong>eMOB</strong>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/gestionar-vehiculos' ? 'active' : ''}`}
                to="/gestionar-vehiculos"
                style={{
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  ...(location.pathname === '/gestionar-vehiculos' && {
                    fontWeight: '600',
                    color: 'white'
                  })
                }}
              >
                <i className="bi bi-truck me-2"></i>
                Vehicle Management
              </Link>
            </li>

            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/mapa-interactivo' ? 'active' : ''}`}
                to="/mapa-interactivo"
                style={{
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  ...(location.pathname === '/mapa-interactivo' && {
                    fontWeight: '600',
                    color: 'white'
                  })
                }}
              >
                <i className="bi bi-map me-2"></i>
                Interactive Map
              </Link>
            </li>

            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/crear-soluciones' ? 'active' : ''}`}
                to="/crear-soluciones"
                style={{
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  ...(location.pathname === '/crear-soluciones' && {
                    fontWeight: '600',
                    color: 'white'
                  })
                }}
              >
                <i className="bi bi-lightbulb me-2"></i>
                Solutions Generator
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Estilos para el hover y elementos activos */}
      <style>{`
        .navbar-nav .nav-link {
          color: rgba(255, 255, 255, 0.9);
          padding: 0.5rem 1rem;
          margin: 0 0.2rem;
          border-radius: 6px;
        }
        .navbar-nav .nav-link:hover {
          color: white !important;
          background-color: #2980b9;
          transform: translateY(-2px);
        }
        .navbar-nav .nav-link.active {
          color: white !important;
          background-color: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;