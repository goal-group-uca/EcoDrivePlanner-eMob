import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../pages/Navbar.jsx';
import { Modal, Button, Form, Card, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Gear, GraphUp, People, ArrowLeftRight,
  Search, Stopwatch, Hdd, CheckCircle,
  ListCheck, ListOl
} from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

const BACKEND_API_URL = 'http://127.0.0.1:8000';

const CrearSoluciones = () => {
  // Estados para las soluciones generadas
  const [vistaActiva, setVistaActiva] = useState('generar');
  const [rutasGeneradas, setRutasGeneradas] = useState([]);
  const [rutasGeneradasFiltradas, setRutasGeneradasFiltradas] = useState([]);
  const [terminoBusquedaGeneradas, setTerminoBusquedaGeneradas] = useState("");
  const [paginaActualGeneradas, setPaginaActualGeneradas] = useState(1);
  const navigate = useNavigate();

  // Estados existentes para generar soluciones
  const [rutasCompletas, setRutasCompletas] = useState([]);
  const [rutasFiltradas, setRutasFiltradas] = useState([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [cargando, setCargando] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const rutasPorPagina = 10;
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);


  // Parámetros del algoritmo
  const [config, setConfig] = useState({
    maxEvaluations: 30,
    populationSize: 10,
    offspringSize: 1,
    crossoverProbability: 1,
    neighborhoodSize: 3,
    takeStops: false,
    processId: 0,
    dResults: './000_output_results'
  });

  useEffect(() => {
    const fetchRutasCompletas = async () => {
      try {
        const response = await axios.get(`${BACKEND_API_URL}/rutas_completas`);
        setRutasCompletas(response.data);
        setRutasFiltradas(response.data);
      } catch (error) {
        console.error("Error al obtener rutas completas:", error);
        alert("There was an error loading routes.");
      }
    };

    const fetchRutasGeneradas = async () => {
      try {
        const response = await axios.get(`${BACKEND_API_URL}/rutas_con_soluciones`);
        setRutasGeneradas(response.data);
        setRutasGeneradasFiltradas(response.data);
      } catch (error) {
        console.error("Error al obtener rutas generadas:", error);
        setRutasGeneradas([]);
        setRutasGeneradasFiltradas([]);
      }
    };

    const fetchVehiculos = async () => {
      try {
        const response = await axios.get(`${BACKEND_API_URL}/vehiculos`);
        setVehiculos(response.data);
      } catch (error) {
        console.error("Error al obtener vehículos:", error);
      }
    };

    fetchRutasCompletas();
    fetchRutasGeneradas();
    fetchVehiculos();
  }, []);

  // Efecto para filtrar rutas cuando cambia el término de búsqueda (generar)
  useEffect(() => {
    if (terminoBusqueda === "") {
      setRutasFiltradas(rutasCompletas);
    } else {
      const filtradas = rutasCompletas.filter(ruta =>
        ruta.Nombre.toLowerCase().includes(terminoBusqueda.toLowerCase())
      );
      setRutasFiltradas(filtradas);
    }
  }, [terminoBusqueda, rutasCompletas]);

  // Efecto para filtrar rutas generadas cuando cambia el término de búsqueda
  useEffect(() => {
    if (terminoBusquedaGeneradas === "") {
      setRutasGeneradasFiltradas(rutasGeneradas);
    } else {
      const filtradas = rutasGeneradas.filter(ruta =>
        ruta.Nombre.toLowerCase().includes(terminoBusquedaGeneradas.toLowerCase())
      );
      setRutasGeneradasFiltradas(filtradas);
    }
  }, [terminoBusquedaGeneradas, rutasGeneradas]);

  const seleccionarRuta = (ruta) => {
    setRutaSeleccionada(ruta);
    setMensajeEstado("");
    setCargando(false);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setMensajeEstado("");
    setCargando(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const ejecutarAlgoritmo = async () => {
    if (!rutaSeleccionada || !vehiculoSeleccionado) {
      alert("You must select a route and a vehicle.");
      return;
    }

    try {
      setCargando(true);
      setMensajeEstado(`🔄 Generating solutions for route "${rutaSeleccionada.Nombre}"...`);

      const idRuta = rutaSeleccionada.Id_RutaCompleta;

      const { data: { existe } } = await axios.get(`${BACKEND_API_URL}/csv_existe/${idRuta}`);

      if (!existe) {
        await axios.post(`${BACKEND_API_URL}/generar_csv_ruta/${idRuta}`);
      }

      await axios.post(`${BACKEND_API_URL}/ejecutar_algoritmo`, {
        maxEvaluations: config.maxEvaluations,
        populationSize: config.populationSize,
        offspringSize: config.offspringSize,
        crossoverProbability: config.crossoverProbability,
        neighborhoodSize: config.neighborhoodSize,
        takeStops: config.takeStops,
        processId: config.processId,
        dResults: config.dResults,
        ruta_id: idRuta,
        vehiculo_id: vehiculoSeleccionado, // <-- Enviamos el ID del vehículo
      });

      setMensajeEstado("✅ Solutions generated successfully.");

      const response = await axios.get(`${BACKEND_API_URL}/rutas_con_soluciones`);
      setRutasGeneradas(response.data);
      setRutasGeneradasFiltradas(response.data);

    } catch (error) {
      console.error("❌ Error al generar soluciones:", error);
      setMensajeEstado("❌ An error occurred generating solutions.");
    } finally {
      setCargando(false);
    }
  };

  // Paginación para generar soluciones
  const totalPaginas = Math.ceil(rutasFiltradas.length / rutasPorPagina);
  const rutasPaginadas = rutasFiltradas.slice(
    (paginaActual - 1) * rutasPorPagina,
    paginaActual * rutasPorPagina
  );

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  // Paginación para ver soluciones generadas
  const totalPaginasGeneradas = Math.ceil(rutasGeneradasFiltradas.length / rutasPorPagina);
  const rutasGeneradasPaginadas = rutasGeneradasFiltradas.slice(
    (paginaActualGeneradas - 1) * rutasPorPagina,
    paginaActualGeneradas * rutasPorPagina
  );

  const cambiarPaginaGeneradas = (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginasGeneradas) {
      setPaginaActualGeneradas(nuevaPagina);
    }
  };

  const verSoluciones = (idRuta) => {
    navigate(`/soluciones/${idRuta}`);
    console.log("Navegando a ruta con ID:", idRuta); // Para depuración
  };

  return (
    <>
      <Navbar />

      <style>{`
        .btn-group .btn {
          transition: all 0.3s ease;
          border-width: 2px;
        }
        .btn-group .btn:hover {
          background-color: #2980b9 !important;
          color: white !important;
          transform: translateY(-1px);
        }
        .btn-group .btn:active {
          transform: translateY(0);
        }
      `}</style>

      <div className="container mt-4">
        <h2 className="mb-4 text-center">🧠 Solutions Generator</h2>

        {/* Pestañas para alternar entre vistas */}
        <div className="d-flex justify-content-center mb-4">
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${vistaActiva === 'generar' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setVistaActiva('generar')}
              style={{
                backgroundColor: vistaActiva === 'generar' ? '#3498db' : 'transparent',
                color: vistaActiva === 'generar' ? 'white' : '#3498db',
                borderColor: '#3498db',
                fontWeight: '500'
              }}
            >
              <ListOl className="me-2" /> Generate Solutions
            </button>
            <button
              type="button"
              className={`btn ${vistaActiva === 'ver' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setVistaActiva('ver')}
              style={{
                backgroundColor: vistaActiva === 'ver' ? '#3498db' : 'transparent',
                color: vistaActiva === 'ver' ? 'white' : '#3498db',
                borderColor: '#3498db',
                fontWeight: '500'
              }}
            >
              <ListCheck className="me-2" /> View Generated Solutions
            </button>
          </div>
        </div>

        {/* Vista para generar soluciones */}
        {vistaActiva === 'generar' && (
          <div className="card p-4 shadow-sm">
            <h5 className="mb-3">Select a Route to generate solutions</h5>

            {/* Barra de búsqueda */}
            <div className="mb-3">
              <Form.Control
                type="text"
                placeholder="🔍 Search route by name..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
              />
            </div>

            {rutasFiltradas.length === 0 ? (
              <p>No routes found matching the search.</p>
            ) : (
              <ul className="list-group">
                {rutasPaginadas.map((ruta) => (
                  <li
                    key={ruta.Id_RutaCompleta}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <strong>{ruta.Nombre}</strong>
                    <button className="btn btn-primary" onClick={() => seleccionarRuta(ruta)}>
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="d-flex justify-content-center align-items-center mt-3">
                <button
                  className="btn btn-outline-secondary btn-sm me-2"
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                >
                  ◀
                </button>
                <span>Page {paginaActual} of {totalPaginas}</span>
                <button
                  className="btn btn-outline-secondary btn-sm ms-2"
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        )}

        {/* Vista para ver soluciones generadas */}
        {vistaActiva === 'ver' && (
          <div className="card p-4 shadow-sm">
            <h5 className="mb-3">Routes with generated solutions</h5>

            {/* Barra de búsqueda */}
            <div className="mb-3">
              <Form.Control
                type="text"
                placeholder="🔍 Search route by name..."
                value={terminoBusquedaGeneradas}
                onChange={(e) => setTerminoBusquedaGeneradas(e.target.value)}
              />
            </div>

            {rutasGeneradasFiltradas.length === 0 ? (
              <p>No routes with generated solutions.</p>
            ) : (
              <ul className="list-group">
                {rutasGeneradasPaginadas.map((ruta) => (
                  <li
                    key={ruta.Id_RutaCompleta}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <strong>{ruta.Nombre}</strong>
                    <button
                      className="btn btn-info"
                      onClick={() => verSoluciones(ruta.Id_RutaCompleta)}
                    >
                      View Solutions
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Paginación */}
            {totalPaginasGeneradas > 1 && (
              <div className="d-flex justify-content-center align-items-center mt-3">
                <button
                  className="btn btn-outline-secondary btn-sm me-2"
                  onClick={() => cambiarPaginaGeneradas(paginaActualGeneradas - 1)}
                  disabled={paginaActualGeneradas === 1}
                >
                  ◀
                </button>
                <span>Page {paginaActualGeneradas} of {totalPaginasGeneradas}</span>
                <button
                  className="btn btn-outline-secondary btn-sm ms-2"
                  onClick={() => cambiarPaginaGeneradas(paginaActualGeneradas + 1)}
                  disabled={paginaActualGeneradas === totalPaginasGeneradas}
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal con la información de la ruta seleccionada y formulario de configuración */}
        <Modal show={mostrarModal} onHide={cerrarModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <Gear className="me-2" /> Genetic Algorithm Configuration
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {rutaSeleccionada && (
              <>
                {/* 🔵 Selección de vehículo */}
                <Form.Group className="mb-4">
                  <Form.Label><strong>Selecciona el Vehículo para la ejecución</strong></Form.Label>
                  <Form.Select
                    value={vehiculoSeleccionado || ""}
                    onChange={(e) => setVehiculoSeleccionado(e.target.value)}
                  >
                    <option value="" disabled>Select a vehicle...</option>
                    {vehiculos.map((vehiculo) => (
                      <option key={vehiculo.Id_Vehiculo} value={vehiculo.Id_Vehiculo}>
                        {vehiculo.Id_Vehiculo} - {vehiculo.tipo}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body>
                    <h5>
                      <CheckCircle className="text-primary me-2" />
                      Selected Route
                    </h5>
                    <p className="lead mb-0">{rutaSeleccionada.Nombre}</p>
                  </Card.Body>
                </Card>

                <Row>
                  {/* Columna 1: Parámetros de Ejecución */}
                  <Col md={6}>
                    <Card className="mb-3 border-0 shadow-sm h-100">
                      <Card.Header className="fw-bold d-flex align-items-center">
                        <GraphUp className="me-2" />
                        Execution Parameters
                      </Card.Header>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <Stopwatch className="me-2" />
                            Max Evaluations
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="maxEvaluations"
                            value={config.maxEvaluations}
                            onChange={handleChange}
                            min="1"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>
                            <People className="me-2" />
                            Population Size
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="populationSize"
                            value={config.populationSize}
                            onChange={handleChange}
                            min="1"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>
                            <ArrowLeftRight className="me-2" />
                            Offspring Size
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="offspringSize"
                            value={config.offspringSize}
                            onChange={handleChange}
                            min="1"
                          />
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Columna 2: Parámetros de Búsqueda */}
                  <Col md={6}>
                    <Card className="mb-3 border-0 shadow-sm h-100">
                      <Card.Header className="fw-bold d-flex align-items-center">
                        <Search className="me-2" />
                        Search Parameters
                      </Card.Header>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <ArrowLeftRight className="me-2" />
                            Crossover Probability
                          </Form.Label>
                          <Form.Control
                            type="number"
                            step="0.1"
                            name="crossoverProbability"
                            value={config.crossoverProbability}
                            onChange={handleChange}
                            min="0"
                            max="1"
                          />
                          <Form.Text muted>Value between 0 and 1</Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>
                            <Search className="me-2" />
                            Neighborhood Size
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="neighborhoodSize"
                            value={config.neighborhoodSize}
                            onChange={handleChange}
                            min="1"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            label={
                              <>
                                <CheckCircle className="me-2" />
                                Take stops into account?
                              </>
                            }
                            name="takeStops"
                            checked={config.takeStops}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Configuración Avanzada */}
                <Row className="justify-content-center">
                  <Col md={8}>
                    <Card className="mt-3 border-0 shadow-sm">
                      <Card.Header className="fw-bold d-flex align-items-center">
                        <Hdd className="me-2" />
                        Advanced Configuration
                      </Card.Header>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Label>Process ID</Form.Label>
                          <Form.Control
                            type="number"
                            name="processId"
                            value={config.processId}
                            onChange={handleChange}
                            min="0"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Results Path</Form.Label>
                          <Form.Control
                            type="text"
                            name="dResults"
                            value={config.dResults}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {mensajeEstado && (
                  <div
                    className={`mt-3 alert ${mensajeEstado.includes("✅")
                        ? "alert-success"
                        : mensajeEstado.includes("❌")
                          ? "alert-danger"
                          : "alert-info"
                      } text-center`}
                  >
                    {mensajeEstado}
                  </div>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={cerrarModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={ejecutarAlgoritmo} disabled={cargando}>
              {cargando ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Processing...
                </>
              ) : (
                "Execute Algorithm"
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
};

export default CrearSoluciones;