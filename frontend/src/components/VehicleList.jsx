import React, { useEffect, useState } from 'react';
import { getVehiculos, updateVehiculo, deleteVehiculo } from '../api/api';

const VehicleList = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [filteredVehiculos, setFilteredVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editVehiculo, setEditVehiculo] = useState(null);
  const [updatedVehiculo, setUpdatedVehiculo] = useState(null);
  const [solucionInput, setSolucionInput] = useState('');
  const [nuevaCaracteristica, setNuevaCaracteristica] = useState({
    nombre: '',
    valor: ''
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el modal de soluciones
  const [showSolutionsModal, setShowSolutionsModal] = useState(false);
  const [currentVehicleSolutions, setCurrentVehicleSolutions] = useState([]);
  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [solutionsPerPage] = useState(10);
  const [routeNames, setRouteNames] = useState({});

  useEffect(() => {
    const fetchVehiculos = async () => {
      const data = await getVehiculos();
      setVehiculos(data);
      setFilteredVehiculos(data);
      setLoading(false);
    };
    fetchVehiculos();
  }, []);

  useEffect(() => {
    let filtered = vehiculos;

    if (searchTerm) {
      filtered = filtered.filter(
        (vehiculo) =>
          vehiculo.Id_Vehiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vehiculo.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredVehiculos(filtered);
  }, [searchTerm, vehiculos]);

  const fetchVehicleSolutions = async (vehicleId) => {
    setSolutionsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/soluciones_por_vehiculo/${vehicleId}`);
      if (!response.ok) throw new Error('Error fetching solutions');
      const data = await response.json();

      // Obtener nombres de rutas
      const routeIds = [...new Set(data.map(sol => sol.ruta_completa))];
      const namesResponse = await fetch('http://localhost:8000/rutas_completas');
      const routesData = await namesResponse.json();

      const namesMap = {};
      routesData.forEach(route => {
        namesMap[route.Id_RutaCompleta] = route.Nombre;
      });

      setRouteNames(namesMap);
      setCurrentVehicleSolutions(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error:', error);
      setCurrentVehicleSolutions([]);
    } finally {
      setSolutionsLoading(false);
    }
  };

  // Paginación para soluciones
  const indexOfLastSolution = currentPage * solutionsPerPage;
  const indexOfFirstSolution = indexOfLastSolution - solutionsPerPage;
  const currentSolutions = currentVehicleSolutions.slice(indexOfFirstSolution, indexOfLastSolution);
  const totalPages = Math.ceil(currentVehicleSolutions.length / solutionsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleDeleteVehiculo = async () => {
    if (confirmDeleteId) {
      await deleteVehiculo(confirmDeleteId);
      setVehiculos((prev) => prev.filter((vehiculo) => vehiculo.Id_Vehiculo !== confirmDeleteId));
      setFilteredVehiculos((prev) => prev.filter((vehiculo) => vehiculo.Id_Vehiculo !== confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  const handleInputChange = (e) => {
    setUpdatedVehiculo({
      ...updatedVehiculo,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSolucion = () => {
    if (solucionInput) {
      setUpdatedVehiculo({
        ...updatedVehiculo,
        lista_soluciones: [...updatedVehiculo.lista_soluciones, solucionInput],
      });
      setSolucionInput('');
    }
  };

  const handleDeleteSolucion = (solucion) => {
    setUpdatedVehiculo({
      ...updatedVehiculo,
      lista_soluciones: updatedVehiculo.lista_soluciones.filter((s) => s !== solucion),
    });
  };

  const handleAddCaracteristica = () => {
    if (nuevaCaracteristica.nombre && nuevaCaracteristica.valor) {
      setUpdatedVehiculo({
        ...updatedVehiculo,
        caracteristicas_adicionales: {
          ...updatedVehiculo.caracteristicas_adicionales,
          [nuevaCaracteristica.nombre]: nuevaCaracteristica.valor
        }
      });
      setNuevaCaracteristica({ nombre: '', valor: '' });
    }
  };

  const handleDeleteCaracteristica = (nombre) => {
    const nuevasCaracteristicas = { ...updatedVehiculo.caracteristicas_adicionales };
    delete nuevasCaracteristicas[nombre];
    setUpdatedVehiculo({
      ...updatedVehiculo,
      caracteristicas_adicionales: nuevasCaracteristicas
    });
  };

  return (
    <div className="container mt-4 p-4 bg-light rounded shadow">
      <h2 className="text-center mb-4">Vehicle List</h2>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by ID or Type"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : filteredVehiculos.length === 0 ? (
        <p className="text-center">No vehicles available.</p>
      ) : (
        <div className="row justify-content-center">
          {filteredVehiculos.map((vehiculo) => (
            <div key={vehiculo.Id_Vehiculo} className="col-md-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    {vehiculo.tipo} - {vehiculo.Id_Vehiculo}
                  </h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item"><strong>Battery:</strong> {vehiculo.bateria} kWh</li>
                    <li className="list-group-item"><strong>Weight:</strong> {vehiculo.peso} kg</li>
                    <li className="list-group-item"><strong>Frontal Section:</strong> {vehiculo.seccion_frontal} m²</li>
                    <li className="list-group-item"><strong>ICE Efficiency:</strong> {vehiculo.eficiencia_ice}</li>
                    <li className="list-group-item"><strong>EV Efficiency:</strong> {vehiculo.eficiencia_ev}</li>
                    <li className="list-group-item"><strong>ICE Power:</strong> {vehiculo.potencia_max_ice} kW</li>
                    <li className="list-group-item"><strong>EV Power:</strong> {vehiculo.potencia_max_ev} kW</li>
                  </ul>

                  {vehiculo.lista_soluciones && vehiculo.lista_soluciones.length > 0 && (
                    <>
                      <h6 className="mt-3">Solutions:</h6>
                      <ul className="list-group">
                        {vehiculo.lista_soluciones.map((solucion, index) => (
                          <li key={index} className="list-group-item">{solucion}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {vehiculo.caracteristicas_adicionales && Object.keys(vehiculo.caracteristicas_adicionales).length > 0 && (
                    <>
                      <h6 className="mt-3">Additional Characteristics:</h6>
                      <ul className="list-group">
                        {Object.entries(vehiculo.caracteristicas_adicionales).map(([nombre, valor], index) => (
                          <li key={index} className="list-group-item">
                            <strong>{nombre}:</strong> {valor}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="d-flex justify-content-between mt-3">
                    <div>
                      <button
                        className="btn btn-primary me-2"
                        onClick={() => {
                          setEditVehiculo(vehiculo);
                          setUpdatedVehiculo({
                            ...vehiculo,
                            lista_soluciones: [...(vehiculo.lista_soluciones || [])],
                            caracteristicas_adicionales: { ...(vehiculo.caracteristicas_adicionales || {}) }
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-info me-2"
                        onClick={() => {
                          fetchVehicleSolutions(vehiculo.Id_Vehiculo);
                          setShowSolutionsModal(true);
                        }}
                      >
                        Solutions
                      </button>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => setConfirmDeleteId(vehiculo.Id_Vehiculo)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDeleteId && (
        <div className="modal-backdrop">
          <div className="modal d-block">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmation</h5>
                  <button type="button" className="btn-close" onClick={() => setConfirmDeleteId(null)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this vehicle?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteVehiculo}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editVehiculo && (
        <div className="modal-backdrop">
          <div className="modal d-block">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Vehicle: {updatedVehiculo.Id_Vehiculo}</h5>
                  <button type="button" className="btn-close" onClick={() => setEditVehiculo(null)}></button>
                </div>
                <div className="modal-body">
                  <form>
                    {['tipo', 'bateria', 'peso', 'seccion_frontal', 'eficiencia_ice', 'eficiencia_ev', 'potencia_max_ice', 'potencia_max_ev'].map((attr) => (
                      <div className="mb-3" key={attr}>
                        <label className="form-label">{attr.replace('_', ' ').toUpperCase()}</label>
                        <input
                          type="text"
                          name={attr}
                          value={updatedVehiculo[attr] || ''}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                    ))}

                    <h5>Assigned Solutions:</h5>
                    <div className="mb-3 d-flex">
                      <input
                        type="text"
                        placeholder="Solution ID"
                        value={solucionInput}
                        onChange={(e) => setSolucionInput(e.target.value)}
                        className="form-control me-2"
                      />
                      <button type="button" className="btn btn-primary" onClick={handleAddSolucion}>
                        Add
                      </button>
                    </div>
                    <ul className="list-group mb-3">
                      {updatedVehiculo.lista_soluciones && updatedVehiculo.lista_soluciones.map((solucion, index) => (
                        <li key={index} className="list-group-item d-flex justify-content-between">
                          {solucion}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteSolucion(solucion)}
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>

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
                          <button
                            type="button"
                            className="btn btn-primary w-100"
                            onClick={handleAddCaracteristica}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <ul className="list-group mb-3">
                      {updatedVehiculo.caracteristicas_adicionales && Object.entries(updatedVehiculo.caracteristicas_adicionales).map(([nombre, valor], index) => (
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
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditVehiculo(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={async () => {
                      await updateVehiculo(updatedVehiculo.Id_Vehiculo, updatedVehiculo);
                      setEditVehiculo(null);
                      // Actualizamos la lista de vehículos
                      const data = await getVehiculos();
                      setVehiculos(data);
                      setFilteredVehiculos(data);
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSolutionsModal && (
        <div className="modal-backdrop">
          <div className="modal d-block">
            <div className="modal-dialog modal-xl"> {/* Cambiado a modal-xl para más espacio */}
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">Vehicle Solutions</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowSolutionsModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {solutionsLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading solutions...</p>
                    </div>
                  ) : currentVehicleSolutions.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-info-circle fs-1 text-muted"></i>
                      <p className="mt-2">This vehicle has no associated solutions.</p>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table table-hover align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Solution ID</th>
                              <th>Complete Route</th>
                              <th>Driving Modes</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentSolutions.map((solucion) => (
                              <tr key={solucion.Id_Solucion}>
                                <td className="text-nowrap">{solucion.Id_Solucion}</td>
                                <td>
                                  {routeNames[solucion.ruta_completa] || solucion.ruta_completa}
                                </td>
                                <td>
                                  {solucion.tramos && (
                                    <div className="d-flex flex-wrap gap-1">
                                      {Object.entries(
                                        solucion.tramos.reduce((acc, tramo) => {
                                          acc[tramo.modo_conduccion] = (acc[tramo.modo_conduccion] || 0) + 1;
                                          return acc;
                                        }, {})
                                      ).map(([modo, count]) => (
                                        <span key={modo} className={`badge ${modo === 'eléctrico' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                          {modo}: {count}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => {
                                      // Aquí podrías implementar la lógica para ver más detalles
                                      console.log("Ver detalles de:", solucion.Id_Solucion);
                                    }}
                                  >
                                    View details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginación */}
                      {totalPages > 1 && (
                        <nav className="d-flex justify-content-center mt-4">
                          <ul className="pagination">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => paginate(currentPage - 1)}
                              >
                                &laquo;
                              </button>
                            </li>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                              <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => paginate(number)}
                                >
                                  {number}
                                </button>
                              </li>
                            ))}

                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => paginate(currentPage + 1)}
                              >
                                &raquo;
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}

                      <div className="text-muted text-center mt-2">
                        Showing {indexOfFirstSolution + 1}-{Math.min(indexOfLastSolution, currentVehicleSolutions.length)} of {currentVehicleSolutions.length} solutions
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSolutionsModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleList;