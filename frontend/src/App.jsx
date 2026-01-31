import React from 'react';
import './App.css';
import Navbar from './pages/Navbar.jsx';
import VehicleForm from './components/VehicleForm.jsx';
import VehicleList from './components/VehicleList.jsx';

function App() {
  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <div className="App">
          <h1>Vehicle Management</h1>
          <VehicleForm />
          <VehicleList />
        </div>
      </div>
    </>
  );
}

export default App;
