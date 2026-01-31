import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import '../global.css';

const Home = () => {
  const navigate = useNavigate();
  const [hoverStates, setHoverStates] = useState({
    gestion: false,
    mapa: false,
    soluciones: false
  });

  const handleNavigation = (route) => {
    navigate(route);
  };

  const handleHover = (button, isHovering) => {
    setHoverStates(prev => ({ ...prev, [button]: isHovering }));
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        {/* Elementos de fondo - vehículos y rutas */}
        <div style={styles.backgroundElements}>
          <div style={styles.truck}>
            <i className="bi bi-truck" style={styles.vehicleIcon}></i>
          </div>
          <div style={styles.car}>
            <i className="bi bi-car-front" style={styles.vehicleIcon}></i>
          </div>
          <div style={styles.bike}>
            <i className="bi bi-bicycle" style={styles.vehicleIcon}></i>
          </div>
          <div style={styles.route1}></div>
          <div style={styles.route2}></div>
          <div style={styles.route3}></div>
        </div>

        {/* Card principal */}
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.heading}>Welcome to eMOB</h1>
            <p style={styles.subheading}>Mobility Management System</p>
          </div>

          <p style={styles.description}>
            Comprehensive platform for intelligent management of vehicles, routes, and mobility solutions.
            Optimize your operations with our advanced tools.
          </p>

          <div style={styles.buttonContainer}>
            <button
              style={hoverStates.gestion ? styles.buttonHover : styles.button}
              onClick={() => handleNavigation('/gestionar-vehiculos')}
              onMouseEnter={() => handleHover('gestion', true)}
              onMouseLeave={() => handleHover('gestion', false)}
            >
              <i className="bi bi-truck" style={styles.icon}></i>
              Vehicle Management
            </button>

            <button
              style={hoverStates.mapa ? styles.buttonHover : styles.button}
              onClick={() => handleNavigation('/mapa-interactivo')}
              onMouseEnter={() => handleHover('mapa', true)}
              onMouseLeave={() => handleHover('mapa', false)}
            >
              <i className="bi bi-map" style={styles.icon}></i>
              Interactive Map
            </button>

            <button
              style={hoverStates.soluciones ? styles.buttonHover : styles.button}
              onClick={() => handleNavigation('/crear-soluciones')}
              onMouseEnter={() => handleHover('soluciones', true)}
              onMouseLeave={() => handleHover('soluciones', false)}
            >
              <i className="bi bi-lightbulb" style={styles.icon}></i>
              Solutions Generator
            </button>
          </div>

          <div style={styles.footer}>
            <p style={styles.footerText}>© {new Date().getFullYear()} eMOB - All rights reserved</p>
          </div>
        </div>
      </div>
    </>
  );
};

// Estilos
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    opacity: 0.15,
    overflow: 'hidden',
  },
  truck: {
    position: 'absolute',
    top: '15%',
    left: '-100px',
    fontSize: '3rem',
    color: '#3498db',
    transform: 'rotate(-15deg)',
    animation: 'moveTruck 25s linear infinite',
  },
  car: {
    position: 'absolute',
    top: '70%',
    right: '-100px',
    fontSize: '2.5rem',
    color: '#2ecc71',
    transform: 'rotate(10deg)',
    animation: 'moveCar 20s linear infinite',
  },
  bike: {
    position: 'absolute',
    top: '30%',
    right: '20%',
    fontSize: '2rem',
    color: '#e74c3c',
    transform: 'rotate(5deg)',
    animation: 'moveBike 8s ease-in-out infinite',
  },
  route1: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    width: '30%',
    height: '2px',
    backgroundColor: '#3498db',
    transform: 'rotate(-10deg)',
  },
  route2: {
    position: 'absolute',
    top: '60%',
    right: '10%',
    width: '25%',
    height: '2px',
    backgroundColor: '#2ecc71',
    transform: 'rotate(15deg)',
  },
  route3: {
    position: 'absolute',
    bottom: '15%',
    left: '20%',
    width: '40%',
    height: '2px',
    backgroundColor: '#e74c3c',
    transform: 'rotate(5deg)',
  },
  vehicleIcon: {
    fontSize: 'inherit',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
    maxWidth: '800px',
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    marginBottom: '30px',
    position: 'relative',
  },
  heading: {
    fontSize: '2.5rem',
    color: '#2c3e50',
    marginBottom: '8px',
    fontWeight: '600',
  },
  subheading: {
    fontSize: '1.2rem',
    color: '#7f8c8d',
    fontWeight: '400',
    marginBottom: '0',
  },
  description: {
    fontSize: '1.1rem',
    color: '#555',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  buttonContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
    marginBottom: '30px',
  },
  button: {
    padding: '16px 24px',
    fontSize: '1.1rem',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11)',
    fontWeight: '500',
  },
  buttonHover: {
    padding: '16px 24px',
    fontSize: '1.1rem',
    backgroundColor: '#2980b9',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1)',
    transform: 'translateY(-2px)',
    fontWeight: '500',
  },
  icon: {
    marginRight: '12px',
    fontSize: '1.3rem',
  },
  footer: {
    marginTop: '40px',
    borderTop: '1px solid #eee',
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '0.9rem',
    color: '#95a5a6',
    margin: '0',
  },
};

export default Home;