import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card, Button, Row, Col, Tab, Tabs,
  ProgressBar, Badge, Accordion, ListGroup,
  Spinner, Alert
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LightningCharge, FuelPump, Speedometer2,
  GeoAlt, GraphUpArrow, ArrowLeftRight,
  ArrowLeft
} from 'react-bootstrap-icons';
import MapaSoluciones from './MapaSoluciones';

const BACKEND_API_URL = 'http://127.0.0.1:8000';

// Color principal que coincide con el navbar
const PRIMARY_COLOR = '#3498db';
const PRIMARY_HOVER = '#2980b9';

const VisualizadorSoluciones = () => {
  const { idRuta } = useParams();
  const navigate = useNavigate();
  const [soluciones, setSoluciones] = useState([]);
  const [detalleRuta, setDetalleRuta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [key, setKey] = useState('resumen');
  const [indiceSolucionSeleccionada, setIndiceSolucionSeleccionada] = useState(0);
  const [activeAccordionKey, setActiveAccordionKey] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!idRuta) {
          throw new Error("Route ID not provided");
        }

        setCargando(true);
        setError(null);

        const [solucionesRes, rutaRes] = await Promise.all([
          axios.get(`${BACKEND_API_URL}/soluciones_por_ruta/${idRuta}`),
          axios.get(`${BACKEND_API_URL}/detalle_ruta_completa/${idRuta}`)
        ]);

        setSoluciones(solucionesRes.data);
        setDetalleRuta(rutaRes.data);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError(err.response?.data?.detail || err.message);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [idRuta]);

  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);
  }, []);

  if (!idRuta) {
    return (
      <Alert variant="danger" className="m-4">
        Error: No valid route ID provided
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        Error loading data: {error}
        <div className="mt-2">
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
          >
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  if (cargando) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" style={{ color: PRIMARY_COLOR }} />
        <p className="mt-2">Loading solutions for route {idRuta}...</p>
      </div>
    );
  }

  if (!soluciones.length) {
    return (
      <div className="container py-4">
        <Card className="text-center my-5">
          <Card.Body>
            <Card.Title>No solutions generated</Card.Title>
            <Card.Text>
              This route has no generated solutions yet.
            </Card.Text>
          </Card.Body>
        </Card>
        <div className="text-center">
          <Button
            variant="primary"
            onClick={() => navigate('/crear-soluciones')}
            style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
          >
            <ArrowLeft className="me-1" /> Return to generator
          </Button>
        </div>
      </div>
    );
  }

  // Calcular métricas resumen para cada solución
  const solucionesConMetricas = soluciones.map(solucion => {
    const totalTramos = solucion.tramos.length;
    let tramosElectricos = 0;
    let tramosCombustion = 0;
    let distanciaElectrico = 0;
    let distanciaCombustion = 0;
    let emisionesTotales = 0;
    let energiaConsumida = 0;

    solucion.tramos.forEach(t => {
      const tramoOriginal = detalleRuta.tramos.find(tr => tr.Id_Tramo === t.Id_TramoOriginal);
      const distancia = tramoOriginal ? tramoOriginal.distancia : 0;

      if (t.modo_conduccion === "eléctrico") {
        tramosElectricos++;
        distanciaElectrico += distancia;
      } else {
        tramosCombustion++;
        distanciaCombustion += distancia;
      }

      emisionesTotales += t.emisiones;
      energiaConsumida += t.energia_consumida;
    });

    return {
      ...solucion,
      metrics: {
        tramosElectricos,
        tramosCombustion,
        porcentajeElectrico: Math.round((tramosElectricos / totalTramos) * 100),
        emisionesTotales: Math.round(emisionesTotales * 100) / 100,
        energiaConsumida: Math.round(energiaConsumida * 100) / 100,
        distanciaElectrico: Math.round(distanciaElectrico / 1000 * 100) / 100,  // en km
        distanciaCombustion: Math.round(distanciaCombustion / 1000 * 100) / 100 // en km
      }
    };
  });

  const mapaTramosPorId = {};
  detalleRuta.tramos.forEach(tramo => {
    mapaTramosPorId[tramo.Id_Tramo] = tramo;
  });

  return (
    <div className="container-fluid py-4">
      {/* Encabezado */}
      <Card className="mb-4 shadow-sm">
        <Card.Header style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}>
          <h4 className="mb-0">
            Solutions for: <strong>{detalleRuta.ruta_completa.Nombre}</strong>
          </h4>
        </Card.Header>
      </Card>

      {/* Botón de volver */}
      <div className="mb-4">
        <Button
          variant="primary"
          onClick={() => navigate('/crear-soluciones')}
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
          className="d-flex align-items-center"
        >
          <ArrowLeft className="me-1" /> Return to solutions generator
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={key}
        onSelect={(k) => setKey(k)}
        className="mb-4"
        fill
      >
        <Tab eventKey="resumen" title="Summary">
          <Row className="g-4 mt-2">
            {solucionesConMetricas.map((solucion, index) => (
              <Col key={solucion.Id_Solucion} md={6} lg={4}>
                <Card className="h-100 shadow-sm">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Solution #{index + 1}</span>
                    <Badge bg={solucion.metrics.porcentajeElectrico > 50 ? "success" : "warning"}>
                      {solucion.metrics.porcentajeElectrico}% Electric
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <h6 className="d-flex align-items-center">
                        <LightningCharge className="me-2 text-success" />
                        Electric mode:
                      </h6>
                      <ProgressBar
                        now={solucion.metrics.porcentajeElectrico}
                        variant="success"
                        label={`${solucion.metrics.tramosElectricos} segments - ${solucion.metrics.distanciaElectrico} km`}
                      />
                    </div>

                    <div className="mb-3">
                      <h6 className="d-flex align-items-center">
                        <FuelPump className="me-2 text-danger" />
                        Combustion mode:
                      </h6>
                      <ProgressBar
                        now={100 - solucion.metrics.porcentajeElectrico}
                        variant="danger"
                        label={`${solucion.metrics.tramosCombustion} segments - ${solucion.metrics.distanciaCombustion} km`}
                      />
                    </div>

                    <ListGroup variant="flush">
                      <ListGroup.Item className="d-flex justify-content-between">
                        <span><GraphUpArrow className="me-2" />Total emissions:</span>
                        <strong>{solucion.metrics.emisionesTotales} kg CO₂</strong>
                      </ListGroup.Item>
                      <ListGroup.Item className="d-flex justify-content-between">
                        <span><LightningCharge className="me-2" />Energy consumed:</span>
                        <strong>{solucion.metrics.energiaConsumida} kWh</strong>
                      </ListGroup.Item>
                    </ListGroup>
                  </Card.Body>
                  <Card.Footer className="text-center">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setKey('detalle');
                        setActiveAccordionKey(index.toString()); // ← abrimos esa solución
                      }}
                      style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
                    >
                      View full details
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="detalle" title="Full Detail">
          <Accordion activeKey={activeAccordionKey} onSelect={(k) => setActiveAccordionKey(k)} className="mt-3">
            {solucionesConMetricas.map((solucion, solIndex) => (
              <Accordion.Item key={solucion.Id_Solucion} eventKey={solIndex.toString()}>
                <Accordion.Header>
                  <div className="d-flex align-items-center">
                    <strong className="me-3">Solution #{solIndex + 1}</strong>
                    <Badge bg="success" className="me-2">
                      {solucion.metrics.tramosElectricos} electric
                    </Badge>
                    <Badge bg="danger" className="me-2">
                      {solucion.metrics.tramosCombustion} combustion
                    </Badge>
                    <Badge bg="info">
                      {solucion.metrics.emisionesTotales} kg CO₂
                    </Badge>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Segment</th>
                          <th>Mode</th>
                          <th>Distance</th>
                          <th>Energy</th>
                          <th>Emissions</th>
                          <th>Charge state</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solucion.tramos.map((tramo, tramoIndex) => {
                          // Buscar el tramo original usando el Id_TramoOriginal
                          const tramoOriginal = detalleRuta.tramos.find(t => t.Id_Tramo === tramo.Id_TramoOriginal);
                          return (
                            <tr key={tramo.Id_TramoSolucion}>
                              <td>{tramoIndex + 1}</td>
                              <td>
                                <Badge bg={tramo.modo_conduccion === "eléctrico" ? "success" : "danger"}>
                                  {tramo.modo_conduccion}
                                </Badge>
                              </td>
                              <td>{tramoOriginal ? `${tramoOriginal.distancia.toFixed(0)} m` : 'N/A'}</td>
                              <td>{tramo.energia_consumida.toFixed(2)} kWh</td>
                              <td>{tramo.emisiones.toFixed(2)} kg</td>
                              <td>
                                <ProgressBar now={tramo.soc}  // <- Ya no multiplicar por 100
                                  label={`${Math.round(tramo.soc)}%`}
                                  variant={tramo.soc < 20 ? "danger" : tramo.soc < 50 ? "warning" : "success"}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Tab>

        <Tab eventKey="mapa" title="Map Visualization">
          {key === 'mapa' && detalleRuta && (
            <>
              {solucionesConMetricas.length > 1 && (
                <div className="mb-4">
                  <label htmlFor="selector-solucion" className="form-label fw-bold">
                    Select solution to display:
                  </label>
                  <select
                    id="selector-solucion"
                    className="form-select"
                    value={indiceSolucionSeleccionada}
                    onChange={(e) => setIndiceSolucionSeleccionada(Number(e.target.value))}
                  >
                    {solucionesConMetricas.map((_, index) => (
                      <option key={index} value={index}>
                        Solution #{index + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <MapaSoluciones
                key={`solucion-${indiceSolucionSeleccionada}`}  // ← ¡Esto es la clave!
                rutaCompleta={detalleRuta.ruta_completa}
                tramos={detalleRuta.tramos}
                nodos={detalleRuta.nodos}
                solucion={solucionesConMetricas[indiceSolucionSeleccionada]}
              />
            </>
          )}
        </Tab>
      </Tabs>

      {/* Estilos para los hover */}
      <style>{`
        .btn-primary {
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          background-color: ${PRIMARY_HOVER} !important;
          border-color: ${PRIMARY_HOVER} !important;
          transform: translateY(-1px);
        }
        .btn-primary:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default VisualizadorSoluciones;