import React, { useState } from 'react';
import { createVehiculo } from '../api/api';

const VehicleForm = () => {
  const [vehiculo, setVehiculo] = useState({
    Id_Vehiculo: '',
    tipo: '',
    bateria: '',
    peso: '',
    seccion_frontal: '',
    eficiencia_ice: '',
    eficiencia_ev: '',
    potencia_max_ice: '',
    potencia_max_ev: '',
    lista_soluciones: [],
    caracteristicas_adicionales: {}
  });

  const [mensajeExito, setMensajeExito] = useState('');
  const [solucionInput, setSolucionInput] = useState('');
  const [nuevaCaracteristica, setNuevaCaracteristica] = useState({
    nombre: '',
    valor: ''
  });

  const handleChange = (e) => {
    setVehiculo({
      ...vehiculo,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSolucion = () => {
    if (solucionInput) {
      setVehiculo({
        ...vehiculo,
        lista_soluciones: [...vehiculo.lista_soluciones, solucionInput],
      });
      setSolucionInput('');
    }
  };

  const handleDeleteSolucion = (solucion) => {
    setVehiculo({
      ...vehiculo,
      lista_soluciones: vehiculo.lista_soluciones.filter((s) => s !== solucion),
    });
  };

  const handleAddCaracteristica = () => {
    if (nuevaCaracteristica.nombre && nuevaCaracteristica.valor) {
      setVehiculo({
        ...vehiculo,
        caracteristicas_adicionales: {
          ...vehiculo.caracteristicas_adicionales,
          [nuevaCaracteristica.nombre]: nuevaCaracteristica.valor
        }
      });
      setNuevaCaracteristica({ nombre: '', valor: '' });
    }
  };

  const handleDeleteCaracteristica = (nombre) => {
    const nuevasCaracteristicas = { ...vehiculo.caracteristicas_adicionales };
    delete nuevasCaracteristicas[nombre];
    setVehiculo({
      ...vehiculo,
      caracteristicas_adicionales: nuevasCaracteristicas
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createVehiculo(vehiculo);
    setMensajeExito('Vehicle created successfully');
    setVehiculo({
      Id_Vehiculo: '',
      tipo: '',
      bateria: '',
      peso: '',
      seccion_frontal: '',
      eficiencia_ice: '',
      eficiencia_ev: '',
      potencia_max_ice: '',
      potencia_max_ev: '',
      lista_soluciones: [],
      caracteristicas_adicionales: {}
    });
  };

  return (
    <div className="container mt-4 p-4 bg-light rounded shadow">
      <h2 className="mb-4">Add New Vehicle</h2>
      <form onSubmit={handleSubmit}>
        {/* Campos existentes */}
        <div className="mb-3">
          <label className="form-label">Vehicle ID:</label>
          <input type="text" name="Id_Vehiculo" value={vehiculo.Id_Vehiculo} onChange={handleChange} required className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Type:</label>
          <input type="text" name="tipo" value={vehiculo.tipo} onChange={handleChange} required className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Battery (kWh):</label>
          <input type="number" name="bateria" value={vehiculo.bateria} onChange={handleChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Weight (kg):</label>
          <input type="number" name="peso" value={vehiculo.peso} onChange={handleChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Frontal Section (m²):</label>
          <input type="number" name="seccion_frontal" value={vehiculo.seccion_frontal} onChange={handleChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">ICE Efficiency:</label>
          <input type="number" name="eficiencia_ice" value={vehiculo.eficiencia_ice} onChange={handleChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">EV Efficiency:</label>
          <input type="number" name="eficiencia_ev" value={vehiculo.eficiencia_ev} onChange={handleChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Max ICE Power (kW):</label>
          <input type="number" name="potencia_max_ice" value={vehiculo.potencia_max_ice} onChange={handleChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Max EV Power (kW):</label>
          <input type="number" name="potencia_max_ev" value={vehiculo.potencia_max_ev} onChange={handleChange} className="form-control" />
        </div>

        {/* Nueva sección para características adicionales */}
        <h5>Additional Characteristics:</h5>
        <div className="mb-3">
          <div className="row g-2">
            <div className="col-md-5">
              <input
                type="text"
                placeholder="Feature name"
                className="form-control"
                value={nuevaCaracteristica.nombre}
                onChange={(e) => setNuevaCaracteristica({ ...nuevaCaracteristica, nombre: e.target.value })}
              />
            </div>
            <div className="col-md-5">
              <input
                type="text"
                placeholder="Value"
                className="form-control"
                value={nuevaCaracteristica.valor}
                onChange={(e) => setNuevaCaracteristica({ ...nuevaCaracteristica, valor: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <button type="button" className="btn btn-primary w-100" onClick={handleAddCaracteristica}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Lista de características adicionales */}
        <ul className="list-group mb-3">
          {Object.entries(vehiculo.caracteristicas_adicionales).map(([nombre, valor], index) => (
            <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{nombre}:</strong> {valor}
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleDeleteCaracteristica(nombre)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <button type="submit" className="btn btn-success">Create Vehicle</button>
        {mensajeExito && <div className="alert alert-success mt-3">{mensajeExito}</div>}
      </form>
    </div>
  );
};

export default VehicleForm;