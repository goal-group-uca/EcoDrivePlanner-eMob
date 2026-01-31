import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Polygon, useMapEvents, useMap } from 'react-leaflet';
import axios from 'axios';  // Lo usamos para hacer peticiones HTTP al backend (FastAPI)
import polyline from '@mapbox/polyline'; // Usado para decodificar las rutas en formato "polyline" que devuelve OSRM
import Navbar from '../pages/Navbar.jsx';
import { v4 as uuidv4 } from 'uuid'; // Usado para generar identificadores únicos en los nodos y tramos
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button } from 'react-bootstrap'; // Importamos los componentes de Bootstrap
import L from 'leaflet'; // Importamos Leaflet para usar íconos personalizados
// Reparar iconos predeterminados de Leaflet (para que no fallen en Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
import * as turf from '@turf/turf';

const BACKEND_API_URL = 'http://127.0.0.1:8000';

// Definimos los íconos personalizados
const iconoParada = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/5193/5193890.png',
  iconSize: [30, 30], // Tamaño del ícono
  iconAnchor: [12, 25], // Punto de anclaje del ícono
  popupAnchor: [1, -34], // Punto de anclaje del popup
});

const iconoRecarga = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/5140/5140092.png',
  iconSize: [30, 30],
  iconAnchor: [12, 25],
  popupAnchor: [1, -34],
});

const iconoPredeterminado = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', // Ícono predeterminado de Leaflet
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Función para obtener el ícono adecuado según las propiedades del nodo
const obtenerIcono = (nodo) => {
  if (nodo.es_parada) return iconoParada;
  if (nodo.es_punto_recarga) return iconoRecarga;
  return iconoPredeterminado;
};

const MapaInteractivo = () => {
  const [puntos, setPuntos] = useState([]);
  const [ruta, setRuta] = useState([]);
  const [rutaCalculada, setRutaCalculada] = useState(false);
  const [nodos, setNodos] = useState([]);
  const [tramos, setTramos] = useState([]);
  const [rutas, setRutas] = useState([]); // Lista de rutas generadas
  const [nombreRutaCompleta, setNombreRutaCompleta] = useState(""); // Nombre de la ruta completa
  const [rutasAlmacenadas, setRutasAlmacenadas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modoZEZ, setModoZEZ] = useState(false);          // Activar modo selección ZEZ
  const [puntosZEZ, setPuntosZEZ] = useState([]);         // Puntos seleccionados para la ZEZ
  const [zezPoligonos, setZezPoligonos] = useState([]);   // Lista de polígonos ZEZ guardados
  const [modoREZ, setModoREZ] = useState(false);          // Activar modo selección REZ
  const [puntosREZ, setPuntosREZ] = useState([]);         // Puntos seleccionados para la REZ
  const [rezPoligonos, setRezPoligonos] = useState([]);   // Lista de polígonos REZ guardados
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [mensajeFlotante, setMensajeFlotante] = useState(null);
  const [modoEliminarZona, setModoEliminarZona] = useState(false);
  const [busquedaRuta, setBusquedaRuta] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const rutasPorPagina = 10;

  const panelRef = useRef(null);

  useEffect(() => {
    if (panelRef.current) {
      L.DomEvent.disableClickPropagation(panelRef.current);
    }
  }, []);

  useEffect(() => {
    const obtenerRutasAlmacenadas = async () => {
      try {
        const response = await axios.get(`${BACKEND_API_URL}/rutas_completas`);
        setRutasAlmacenadas(response.data);
      } catch (error) {
        console.error("Error obteniendo rutas almacenadas:", error);
      }
    };
    obtenerRutasAlmacenadas();
  }, []);

  useEffect(() => {
    const cargarZonas = async () => {
      try {
        const [zezResp, rezResp] = await Promise.all([
          axios.get(`${BACKEND_API_URL}/zez`),
          axios.get(`${BACKEND_API_URL}/rez`),
        ]);
        setZezPoligonos(zezResp.data);
        setRezPoligonos(rezResp.data);
      } catch (error) {
        console.error("Error cargando zonas ZEZ/REZ automáticamente:", error);
      }
    };

    cargarZonas();
  }, []);

  //Funciones para Modal de Rutas almacenadas
  const rutasFiltradas = rutasAlmacenadas.filter(ruta =>
    ruta.Nombre.toLowerCase().includes(busquedaRuta.toLowerCase())
  );

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

  // Función para manejar el arrastre de marcadores (solo antes de calcular la ruta)
  const handleDragEnd = (index, e) => {
    if (rutaCalculada) return;

    const newPuntos = [...puntos];
    newPuntos[index] = { lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng };
    setPuntos(newPuntos);
  };

  const eliminarPunto = (index) => {
    const nuevosPuntos = puntos.filter((_, i) => i !== index);
    setPuntos(nuevosPuntos);
    setRuta([]);
    setRutaCalculada(false);
  };

  const eliminarZona = async (tipo, id) => {
    try {
      await axios.delete(`${BACKEND_API_URL}/${tipo}/${id}`);
      if (tipo === 'zez') {
        setZezPoligonos(prev => prev.filter(z => z.Id_ZEZ !== id));
      } else {
        setRezPoligonos(prev => prev.filter(r => r.Id_REZ !== id));
      }
      setModoEliminarZona(false);
    } catch (error) {
      console.error("Error eliminando zona:", error);
      alert("There was an error deleting the zone.");
    }
  };

  // Capturamos los Clics en el Mapa y agregamos Marcadores
  const ClickHandler = () => {
    useMapEvents({
      click: (e) => {

        if (modoEliminarZona) return;

        if (modoZEZ) {
          if (puntosZEZ.length < 4) {
            setPuntosZEZ(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
          } else {
            alert("You have already selected 4 points for the ZEZ.");
          }
          return;
        }
        if (modoREZ) {
          if (puntosZEZ.length < 4) {
            setPuntosREZ(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
          } else {
            alert("You have already selected 4 points for the REZ.");
          }
          return;
        }

        if (rutaCalculada) return;

        const nuevoPunto = { lat: e.latlng.lat, lng: e.latlng.lng };
        setPuntos(prev => [...prev, nuevoPunto]);
        setRuta([]);
        setRutaCalculada(false);
      },
    });
    return null;
  };

  // Obtenemos la altura desde el backend
  const obtenerAltura = async (lat, lng) => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/obtener_altura/${lat}/${lng}`);
      return response.data.altura || 0;
    } catch (error) {
      console.error('Error obteniendo la altura:', error);
      return 0;
    }
  };

  // Funciones para calcular pendiente y ángulo:
  const calcularPendiente = (altura1, altura2, distancia) => {
    if (distancia === 0) return 0;
    return ((altura2 - altura1) / distancia) * 100;
  };

  const calcularAngulo = (altura1, altura2, distancia) => {
    if (distancia === 0) return 0;
    return Math.atan((altura2 - altura1) / distancia) * (180 / Math.PI);
  };

  const añadirPuntoManual = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter a valid latitude and longitude.");
      return;
    }

    if (rutaCalculada) {
      alert("You cannot add points after calculating the route. Clear first.");
      return;
    }

    setPuntos(prev => [...prev, { lat, lng }]);
    setRuta([]);
    setRutaCalculada(false);
    setManualLat("");
    setManualLng("");
  };

  // Funciones para calcular la ruta con OSRM
  const calcularRuta = async () => {
    if (puntos.length < 2) {
      alert('Select at least two points.');
      return;
    }

    setMensajeFlotante({ texto: "🧮 Calculating route...", tipo: "calculo" });

    // Asegurar que tenemos zonas cargadas para los cálculos
    if (zezPoligonos.length === 0 || rezPoligonos.length === 0) {
      try {
        const [zezResp, rezResp] = await Promise.all([
          axios.get(`${BACKEND_API_URL}/zez`),
          axios.get(`${BACKEND_API_URL}/rez`)
        ]);
        if (zezPoligonos.length === 0) setZezPoligonos(zezResp.data);
        if (rezPoligonos.length === 0) setRezPoligonos(rezResp.data);
      } catch (error) {
        console.error("❌ Error cargando zonas ZEZ/REZ antes de calcular la ruta:", error);
      }
    }

    let nodosOrdenados = [];
    let rutasGeneradas = [];
    let tramosGenerados = [];
    let ultimoNodoFinal = null;

    for (let i = 0; i < puntos.length - 1; i++) {
      const nodoInicio = ultimoNodoFinal ?? {
        Id_Nodo: uuidv4(),
        coordenada: { lat: puntos[i].lat, lng: puntos[i].lng },
        altura: 0,
        es_parada: false,
        es_punto_recarga: false
      };

      const nodoFinal = {
        Id_Nodo: uuidv4(),
        coordenada: { lat: puntos[i + 1].lat, lng: puntos[i + 1].lng },
        altura: 0,
        es_parada: false,
        es_punto_recarga: false
      };

      ultimoNodoFinal = nodoFinal;

      const coords = `${nodoInicio.coordenada.lng},${nodoInicio.coordenada.lat};${nodoFinal.coordenada.lng},${nodoFinal.coordenada.lat}`;

      try {
        // 1. Obtenemos la geometría de la ruta completa
        const responseGeometria = await axios.get(
          `http://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );

        if (responseGeometria.data.routes && responseGeometria.data.routes.length > 0) {
          const rutaDecodificada = responseGeometria.data.routes[0].geometry.coordinates;

          // Filtramos los nodos intermedios que estén demasiado cerca de los puntos del usuario
          const umbralProximidad = 5; // 5 metros
          const nodosIntermedios = rutaDecodificada
            .map(([lng, lat]) => ({
              Id_Nodo: uuidv4(),
              coordenada: { lat, lng },
              altura: 0,
              es_parada: false,
              es_punto_recarga: false
            }))
            .filter((nodo) => {
              return !puntos.some(
                (punto) => calcularDistancia(nodo.coordenada, punto) < umbralProximidad
              );
            });

          // Añadimos nodos en orden: Inicio → Intermedios → Final
          if (i === 0) nodosOrdenados.push(nodoInicio);
          nodosOrdenados = [...nodosOrdenados, ...nodosIntermedios, nodoFinal];

          // Generamos tramos para esta ruta específica (A→B, B→C, etc.)
          const tramosRuta = [];
          const nodosSegmento = [nodoInicio, ...nodosIntermedios, nodoFinal];

          // 2. Calculamos la duración y distancia de cada tramo
          for (let j = 0; j < nodosSegmento.length - 1; j++) {
            const nodoOrigen = nodosSegmento[j];
            const nodoDestino = nodosSegmento[j + 1];

            // Nuevas listas vacías para cada tramo
            let zonasZEZIntersecadas = [];
            let zonasREZIntersecadas = [];

            const coordsTramo = `${nodoOrigen.coordenada.lng},${nodoOrigen.coordenada.lat};${nodoDestino.coordenada.lng},${nodoDestino.coordenada.lat}`;

            const responseTramo = await axios.get(
              `http://router.project-osrm.org/route/v1/driving/${coordsTramo}?overview=false`
            );

            if (responseTramo.data.routes && responseTramo.data.routes.length > 0) {
              const tramoData = responseTramo.data.routes[0].legs[0];

              const distancia = tramoData.distance;
              const duracionTramo = tramoData.duration;

              let velocidadMedia = 0;
              if (duracionTramo > 0) {
                velocidadMedia = (distancia / duracionTramo) * 3.6;
              } else {
                velocidadMedia = 30;
              }

              const lineaTramo = turf.lineString([
                [nodoOrigen.coordenada.lng, nodoOrigen.coordenada.lat],
                [nodoDestino.coordenada.lng, nodoDestino.coordenada.lat]
              ]);

              // Verificación de intersección con ZEZ
              for (const zez of zezPoligonos) {
                try {
                  const puntosOrdenados = ordenarPuntosHorario(zez.Coordenadas);
                  const coords = puntosOrdenados.map(c => [c.lng, c.lat]);
                  coords.push(coords[0]); // Cerramos el polígono

                  const poligono = turf.polygon([coords]);

                  if (!turf.booleanValid(poligono)) {
                    console.error("Polígono ZEZ inválido:", zez.Id_ZEZ);
                    continue;
                  }

                  if (turf.booleanIntersects(lineaTramo, poligono)) {
                    console.log(`✅ Tramo ${j + 1} interseca con ZEZ ${zez.Id_ZEZ}`);
                    zonasZEZIntersecadas.push(zez.Id_ZEZ);
                  }
                } catch (error) {
                  console.error(`Error verificando ZEZ ${zez.Id_ZEZ}:`, error);
                }
              }

              // Verificación de intersección con REZ
              for (const rez of rezPoligonos) {
                try {
                  const puntosOrdenados = ordenarPuntosHorario(rez.Coordenadas);
                  const coords = puntosOrdenados.map(c => [c.lng, c.lat]);
                  coords.push(coords[0]); // Cerramos el polígono

                  const poligono = turf.polygon([coords]);

                  if (!turf.booleanValid(poligono)) {
                    console.error("Polígono REZ inválido:", rez.Id_REZ);
                    continue;
                  }

                  if (turf.booleanIntersects(lineaTramo, poligono)) {
                    console.log(`✅ Tramo ${j + 1} interseca con REZ ${rez.Id_REZ}`);
                    zonasREZIntersecadas.push(rez.Id_REZ);
                  }
                } catch (error) {
                  console.error(`Error verificando REZ ${rez.Id_REZ}:`, error);
                }
              }

              const nuevoTramo = {
                Id_Tramo: uuidv4(),
                nodo_origen: nodoOrigen.Id_Nodo,
                nodo_destino: nodoDestino.Id_Nodo,
                distancia,
                velocidad_media: velocidadMedia,
                slope_porcentaje: 0,
                slope_angulo: 0,
                zona_zez: zonasZEZIntersecadas,
                zona_rez: zonasREZIntersecadas
              };

              tramosGenerados.push(nuevoTramo);
              tramosRuta.push(nuevoTramo.Id_Tramo);
            }
          }

          // Creamos la ruta con su secuencia de tramos
          const nuevaRuta = {
            Id_Ruta: uuidv4(),
            secuencia_tramos: tramosRuta
          };

          rutasGeneradas.push(nuevaRuta);
        } else {
          alert(`Could not calculate route between points ${i + 1} and ${i + 2}`);
        }
      } catch (error) {
        console.error(`❌ Error al calcular la ruta entre ${i + 1} y ${i + 2}:`, error);
        alert(`Error calculating route between points ${i + 1} and ${i + 2}`);
      }
    }

    setNodos(nodosOrdenados);
    setRuta(nodosOrdenados.map(nodo => [nodo.coordenada.lat, nodo.coordenada.lng]));
    setRutaCalculada(true);
    setRutas(rutasGeneradas);
    setTramos(tramosGenerados);

    setTimeout(() => setMensajeFlotante(null));

  };

  // Función para almacenar la ruta en MongoDB
  const almacenarRuta = async () => {
    if (!rutaCalculada) {
      alert("Calculate the route before storing it.");
      return;
    }

    const nombre = prompt("Enter a name for the complete route:");
    if (!nombre) {
      alert("The route name is required.");
      return;
    }

    setMensajeFlotante({ texto: "💾 Storing route...", tipo: "almacenamiento" });

    // Calculamos las alturas para todos los nodos
    const nodosConAltura = await Promise.all(
      nodos.map(async (nodo) => {
        const altura = await obtenerAltura(nodo.coordenada.lat, nodo.coordenada.lng);
        return { ...nodo, altura };
      })
    );

    // Calculamos pendiente y ángulo para todos los tramos
    const tramosConCalculos = tramos.map((tramo) => {
      const nodoOrigen = nodosConAltura.find((nodo) => nodo.Id_Nodo === tramo.nodo_origen);
      const nodoDestino = nodosConAltura.find((nodo) => nodo.Id_Nodo === tramo.nodo_destino);

      // Validamos que los nodos existen
      if (!nodoOrigen || !nodoDestino) {
        console.error("Nodo no encontrado para el tramo:", tramo);
        return {
          ...tramo,
          slope_porcentaje: 0,
          slope_angulo: 0
        };
      }

      // Calculamos pendiente y ángulo
      const slope_porcentaje = calcularPendiente(nodoOrigen.altura, nodoDestino.altura, tramo.distancia);
      const slope_angulo = calcularAngulo(nodoOrigen.altura, nodoDestino.altura, tramo.distancia);

      return {
        ...tramo,
        slope_porcentaje,
        slope_angulo
      };
    });

    // Creamos la ruta completa
    const nuevaRutaCompleta = {
      Id_RutaCompleta: uuidv4(),
      Nombre: nombre,
      secuencia_rutas: rutas.map((ruta) => ruta.Id_Ruta)
    };

    try {
      // Guardamos nodos, tramos, rutas y ruta completa en la base de datos
      await axios.post(`${BACKEND_API_URL}/nodos`, nodosConAltura);
      await axios.post(`${BACKEND_API_URL}/tramos`, tramosConCalculos);
      await axios.post(`${BACKEND_API_URL}/rutas`, rutas);
      await axios.post(`${BACKEND_API_URL}/rutas_completas`, nuevaRutaCompleta);

      setRutasAlmacenadas(prev => [
        ...prev,
        {
          Id_RutaCompleta: nuevaRutaCompleta.Id_RutaCompleta,
          Nombre: nuevaRutaCompleta.Nombre
        }
      ]);

      alert("Route stored successfully in the database.");
    } catch (error) {
      console.error("Error al almacenar la ruta:", error.response?.data || error.message);
      alert("There was an error storing the route.");
    }

    setTimeout(() => setMensajeFlotante(null));

  };

  // Función para calcular la distancia entre dos puntos geográficos
  const calcularDistancia = (coord1, coord2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const lat1 = coord1.lat * (Math.PI / 180);
    const lat2 = coord2.lat * (Math.PI / 180);
    const deltaLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
    const deltaLng = (coord2.lng - coord1.lng) * (Math.PI / 180);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
  };

  const guardarZEZ = async () => {
    const nuevaZEZ = {
      Id_ZEZ: uuidv4(),
      Coordenadas: puntosZEZ,
    };

    try {
      const response = await axios.post(`${BACKEND_API_URL}/zez`, nuevaZEZ);
      alert("ZEZ Zone saved successfully.");
      setZezPoligonos(prev => [...prev, nuevaZEZ]); // Añadimos al estado local
      setPuntosZEZ([]);
      setModoZEZ(false);
    } catch (error) {
      console.error("Error al guardar la ZEZ:", error);
      alert("Error saving the ZEZ.");
    }
  };

  const guardarREZ = async () => {
    const nuevaREZ = {
      Id_REZ: uuidv4(),
      Coordenadas: puntosREZ,
    };

    try {
      const response = await axios.post(`${BACKEND_API_URL}/rez`, nuevaREZ);
      alert("REZ Zone saved successfully.");
      setRezPoligonos(prev => [...prev, nuevaREZ]); // Añadimos al estado local
      setPuntosREZ([]);
      setModoREZ(false);
    } catch (error) {
      console.error("Error al guardar la REZ:", error);
      alert("Error saving the REZ.");
    }
  };

  // Función para actualizar si un nodo es parada o punto de recarga
  const actualizarNodo = (index, campo) => {
    setNodos(prevNodos =>
      prevNodos.map((nodo, i) =>
        i === index ? { ...nodo, [campo]: !nodo[campo] } : nodo
      )
    );
  };

  // Mostramos la ruta almacenada
  const mostrarRutaAlmacenada = async (idRutaCompleta) => {
    try {
      // Hacemos la solicitud correcta solo para la ruta específica
      const response = await axios.get(`${BACKEND_API_URL}/rutas_completas/${idRutaCompleta}`);
      const data = response.data;

      if (!data || !data.ruta_completa) {
        alert("Route not found.");
        return;
      }

      // Limpiamos los estados antes de cargar la nueva ruta
      setRuta([]);
      setNodos([]);
      setTramos([]);

      const nodosCargados = data.nodos;

      setNodos(nodosCargados);
      setRuta(nodosCargados.map(nodo => [nodo.coordenada.lat, nodo.coordenada.lng]));

    } catch (error) {
      console.error("Error al obtener la ruta completa:", error);
    }
  };

  //Eliminar Ruta Completa
  const eliminarRutaCompleta = async (idRutaCompleta) => {
    const confirmar = window.confirm("Are you sure you want to delete this complete route?");
    if (!confirmar) return;

    try {
      await axios.delete(`${BACKEND_API_URL}/rutas_completas/${idRutaCompleta}`);
      alert("Route deleted successfully.");
      setRutasAlmacenadas(prev => prev.filter(r => r.Id_RutaCompleta !== idRutaCompleta));
    } catch (error) {
      console.error("❌ Error eliminando la ruta:", error.response?.data || error.message);
      alert("There was an error deleting the route: " + (error.response?.data?.detail || "Internal error"));
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <div className="mb-3">
          <button className="btn btn-success" onClick={calcularRuta} disabled={puntos.length < 2}>
            Calculate Route
          </button>

          {rutaCalculada && (
            <button className="btn btn-primary ms-2" onClick={almacenarRuta}>
              Store Route
            </button>
          )}

          <button className="btn btn-info ms-2" onClick={() => setShowModal(true)}>
            Stored Routes
          </button>

          <button className="btn btn-secondary ms-2" onClick={() => { setPuntos([]); setRuta([]); setRutaCalculada(false); setNodos([]); }}>
            Clear Points
          </button>

          <button
            className={`btn btn-warning ms-2 ${modoZEZ ? 'active' : ''}`}
            onClick={() => {
              setModoZEZ(!modoZEZ);
              setPuntosZEZ([]); // Reiniciamos puntos cada vez que activamos
              setModoREZ(false);
            }}
          >
            {modoZEZ ? 'Cancel ZEZ' : 'Define ZEZ'}
          </button>
          {modoZEZ && puntosZEZ.length === 4 && (
            <button className="btn btn-success ms-2" onClick={guardarZEZ}>
              Save ZEZ
            </button>
          )}

          <button
            className={`btn btn-purple ms-2 ${modoREZ ? 'active' : ''}`}
            style={{ backgroundColor: 'purple', borderColor: 'purple', color: 'white' }}
            onClick={() => {
              setModoREZ(!modoREZ);
              setPuntosREZ([]); // Reiniciamos puntos cada vez que activamos
              setModoZEZ(false); // Por si estaba activo el modo ZEZ
            }}
          >
            {modoREZ ? 'Cancel REZ' : 'Define REZ'}
          </button>
          {modoREZ && puntosREZ.length === 4 && (
            <button className="btn btn-success ms-2" onClick={guardarREZ}>
              Save REZ
            </button>
          )}

          <button
            className={`btn btn-danger ms-2 ${modoEliminarZona ? 'active' : ''}`}
            onClick={() => {
              setModoEliminarZona(!modoEliminarZona);
              setModoZEZ(false);
              setModoREZ(false);
            }}
          >
            {modoEliminarZona ? 'Cancel Delete Zone' : 'Delete Zone'}
          </button>

        </div>

        {/* Modal de Rutas Almacenadas */}
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>📍 Stored Routes</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Search route by name..."
                value={busquedaRuta}
                onChange={(e) => {
                  setBusquedaRuta(e.target.value);
                  setPaginaActual(1); // Reinicia a la primera página al buscar
                }}
              />
            </div>

            {rutasPaginadas.length === 0 ? (
              <p>No routes match the search.</p>
            ) : (
              <ul className="list-group">
                {rutasPaginadas.map((ruta) => (
                  <li key={ruta.Id_RutaCompleta} className="list-group-item d-flex justify-content-between align-items-center">
                    {ruta.Nombre}
                    <div>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => mostrarRutaAlmacenada(ruta.Id_RutaCompleta)}
                      >
                        Show
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => eliminarRutaCompleta(ruta.Id_RutaCompleta)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="d-flex justify-content-center align-items-center mt-3">
                <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1}>
                  ◀
                </button>
                <span>Page {paginaActual} of {totalPaginas}</span>
                <button className="btn btn-outline-secondary btn-sm ms-2" onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>
                  ▶
                </button>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {modoEliminarZona && (
          <div
            className="alert alert-danger text-center"
            style={{
              position: "absolute",
              top: "80px",
              right: "30px",
              zIndex: 1000,
              width: "250px",
              boxShadow: "0 0 10px rgba(0,0,0,0.3)"
            }}
          >
            🗑️ Click on a zone to delete it
          </div>
        )}

        {mensajeFlotante && (
          <div
            className={`alert text-center ${mensajeFlotante.tipo === 'calculo'
              ? 'alert-success'
              : mensajeFlotante.tipo === 'almacenamiento'
                ? 'alert-primary'
                : 'alert-info'
              }`}
            style={{
              position: 'absolute',
              top: '80px',
              right: '30px',
              zIndex: 1000,
              width: '250px',
              boxShadow: '0 0 10px rgba(0,0,0,0.3)'
            }}
          >
            {mensajeFlotante.texto}
          </div>
        )}

        <MapContainer center={[36.5297, -6.2929]} zoom={7} style={{ height: '600px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

          <ManualInputControl
            manualLat={manualLat}
            manualLng={manualLng}
            setManualLat={setManualLat}
            setManualLng={setManualLng}
            añadirPuntoManual={añadirPuntoManual}
          />

          {modoZEZ && (
            <ZonaManualControl tipo="zez" puntos={puntosZEZ} setPuntos={setPuntosZEZ} />
          )}

          {modoREZ && (
            <ZonaManualControl tipo="rez" puntos={puntosREZ} setPuntos={setPuntosREZ} />
          )}


          <ClickHandler />

          {/* Mostramos los puntos seleccionados como marcadores antes de calcular la ruta */}
          {puntos.map((punto, index) => (
            <Marker
              key={index}
              position={[punto.lat, punto.lng]}
              draggable={!rutaCalculada} // Solo permite arrastrar antes de calcular la ruta
              eventHandlers={{
                dragend: (e) => handleDragEnd(index, e)
              }}
            >
              <Popup>
                <div style={{ textAlign: "center" }}>
                  <strong>Point {index + 1}</strong>
                  <p>Lat: {punto.lat.toFixed(6)}</p>
                  <p>Lng: {punto.lng.toFixed(6)}</p>
                  {!rutaCalculada && <p>Drag to move this point</p>}
                  {!rutaCalculada && (
                    <button
                      className="btn btn-sm btn-danger mt-2"
                      onClick={(e) => {
                        e.stopPropagation(); // 🚫 Evita que el mapa reciba el clic
                        eliminarPunto(index);
                      }}
                    >
                      ❌ Delete point
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Marcadores de nodos con opciones interactivas después de calcular la ruta */}
          {nodos.map((nodo, index) => (
            <Marker
              key={index}
              position={[nodo.coordenada.lat, nodo.coordenada.lng]}
              icon={obtenerIcono(nodo)} // Usamos el ícono correspondiente
              draggable={false} // No permitir arrastrar los nodos generados
            >
              <Popup>
                <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "bold" }}>
                  <p style={{ marginBottom: "5px", color: "#007BFF" }}>📍 Node {index + 1}</p>
                  <p style={{ fontSize: "12px", margin: "2px 0" }}>Lat: {nodo.coordenada.lat.toFixed(6)}</p>
                  <p style={{ fontSize: "12px", margin: "2px 0" }}>Lng: {nodo.coordenada.lng.toFixed(6)}</p>
                  <p style={{ fontSize: "12px", margin: "2px 0", color: "#28A745" }}>
                    Height: {nodo.altura !== null ? `${nodo.altura.toFixed(2)}m` : "Unknown"}
                  </p>
                  <label style={{ display: "block", marginTop: "5px" }}>
                    <input
                      type="checkbox"
                      checked={nodo.es_parada}
                      onChange={() => actualizarNodo(index, "es_parada")}
                      style={{ marginRight: "5px" }}
                    />
                    🚏 Is Stop
                  </label>
                  <label style={{ display: "block", marginTop: "5px" }}>
                    <input
                      type="checkbox"
                      checked={nodo.es_punto_recarga}
                      onChange={() => actualizarNodo(index, "es_punto_recarga")}
                      style={{ marginRight: "5px" }}
                    />
                    ⚡ Is Charging Point
                  </label>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Mostrar los puntos ZEZ como marcadores */}
          {puntosZEZ.filter(p => !isNaN(p.lat) && !isNaN(p.lng)).map((p, index) => (
            <Marker
              key={`zez-punto-${index}`}
              position={[p.lat, p.lng]}
              icon={L.divIcon({
                className: 'zez-marker',
                html: `<div style="background: orange; border-radius: 50%; width: 12px; height: 12px;"></div>`,
              })}
            />
          ))}

          {/* Dibujar el polígono si hay 4 puntos */}
          {puntosZEZ.length === 4 &&
            puntosZEZ.every(p =>
              !isNaN(p.lat) && !isNaN(p.lng) &&
              p.lat !== 0 && p.lng !== 0
            ) && (
              <Polygon
                positions={ordenarPuntosHorario(puntosZEZ)}
                pathOptions={{ color: 'orange', fillOpacity: 0.4 }}
              />
            )}

          {/* Mostrar los puntos REZ como marcadores */}
          {puntosREZ.filter(p => !isNaN(p.lat) && !isNaN(p.lng)).map((p, index) => (
            <Marker
              key={`rez-punto-${index}`}
              position={[p.lat, p.lng]}
              icon={L.divIcon({
                className: 'rez-marker',
                html: `<div style="background: purple; border-radius: 50%; width: 12px; height: 12px;"></div>`,
              })}
            />
          ))}

          {/* Dibujar el polígono REZ */}
          {puntosREZ.length === 4 &&
            puntosREZ.every(p =>
              !isNaN(p.lat) && !isNaN(p.lng) &&
              p.lat !== 0 && p.lng !== 0
            ) && (
              <Polygon
                positions={ordenarPuntosHorario(puntosREZ)}
                pathOptions={{ color: 'purple', fillOpacity: 0.4 }}
              />
            )}

          {/* Zonas ZEZ guardadas */}
          {zezPoligonos.map((zez, index) => (
            <Polygon
              key={`zez-${index}`}
              positions={ordenarPuntosHorario(zez.Coordenadas)}
              pathOptions={{ color: 'orange', fillOpacity: 0.3 }}
              eventHandlers={{
                click: (e) => {
                  if (modoEliminarZona) {
                    e.originalEvent?.stopPropagation(); // 🛑 Detiene propagación al mapa
                    eliminarZona("zez", zez.Id_ZEZ);
                  }
                }
              }}
            />
          ))}

          {/* Zonas REZ guardadas */}
          {rezPoligonos.map((rez, index) => (
            <Polygon
              key={`rez-${index}`}
              positions={ordenarPuntosHorario(rez.Coordenadas)}
              pathOptions={{ color: 'purple', fillOpacity: 0.3 }}
              eventHandlers={{
                click: (e) => {
                  if (modoEliminarZona) {
                    e.originalEvent?.stopPropagation(); // 🛑 Detiene propagación al mapa
                    eliminarZona("rez", rez.Id_REZ);
                  }
                }
              }}
            />
          ))}

          {ruta.length > 0 && <Polyline positions={ruta} color="blue" />}
        </MapContainer>
      </div>
    </>
  );
};

const ordenarPuntosHorario = (puntos) => {
  if (puntos.length !== 4) return puntos;

  // Calculamos el centroide
  const centro = {
    lat: puntos.reduce((sum, p) => sum + p.lat, 0) / 4,
    lng: puntos.reduce((sum, p) => sum + p.lng, 0) / 4
  };

  // Calculamos el ángulo de cada punto respecto al centro
  const puntosConAngulo = puntos.map(p => {
    const dx = p.lng - centro.lng;
    const dy = p.lat - centro.lat;
    return {
      ...p,
      angle: Math.atan2(dy, dx) * 180 / Math.PI
    };
  });

  // Ordenamos por ángulo (sentido horario)
  return [...puntosConAngulo]
    .sort((a, b) => a.angle - b.angle)
    .map(({ angle, ...p }) => p); // Eliminamos el ángulo del resultado
};

const ManualInputControl = ({ manualLat, manualLng, setManualLat, setManualLng, añadirPuntoManual }) => {
  const map = useMap(); // Esto te da acceso al mapa real de Leaflet

  useEffect(() => {
    const container = L.DomUtil.create("div");
    L.DomEvent.disableClickPropagation(container);

    const control = L.control({ position: "topleft" });

    control.onAdd = () => {
      container.innerHTML = `
        <div class="leaflet-control leaflet-bar p-2 bg-white shadow" style="min-width: 250px;">
          <h6 style="margin-bottom: 10px;">➕ Add point</h6>
          <input id="lat" class="form-control mb-2" placeholder="Latitude" type="number" step="any"/>
          <input id="lng" class="form-control mb-2" placeholder="Longitude" type="number" step="any"/>
          <button id="addPoint" class="btn btn-sm btn-outline-primary w-100">Add point</button>
        </div>
      `;
      return container;
    };

    control.addTo(map); // ¡Aquí está el cambio importante!

    setTimeout(() => {
      const latInput = container.querySelector("#lat");
      const lngInput = container.querySelector("#lng");
      const button = container.querySelector("#addPoint");

      latInput.value = manualLat;
      lngInput.value = manualLng;

      latInput.oninput = (e) => setManualLat(e.target.value);
      lngInput.oninput = (e) => setManualLng(e.target.value);
      button.onclick = añadirPuntoManual;
    }, 100);

    return () => {
      control.remove();
    };
  }, [map, manualLat, manualLng, setManualLat, setManualLng, añadirPuntoManual]);

  return null; // Ya no necesitamos renderizar ningún div
};

const ZonaManualControl = ({ tipo, puntos, setPuntos }) => {
  const map = useMap();

  useEffect(() => {
    const container = L.DomUtil.create("div");
    L.DomEvent.disableClickPropagation(container);

    const control = L.control({ position: "topleft" });

    control.onAdd = () => {
      container.innerHTML = `
        <div class="leaflet-control leaflet-bar p-3 bg-white shadow" style="min-width: 270px; max-width: 320px;">
          <h6 style="margin-bottom: 10px;">🧭 Zona ${tipo.toUpperCase()}</h6>
          <div id="zonas-form"></div>
          <button id="add-point" class="btn btn-sm btn-outline-primary w-100 mt-2">➕ Add point</button>
        </div>
      `;
      return container;
    };

    control.addTo(map);

    // Renderiza dinámicamente el formulario cuando cambia `puntos`
    const renderizarFormulario = () => {
      const formDiv = container.querySelector("#zonas-form");
      formDiv.innerHTML = "";
      puntos.forEach((p, index) => {
        const row = document.createElement("div");
        row.className = "row mb-2";

        row.innerHTML = `
        <div class="col">
          <input type="number" step="any" class="form-control" value="${p.lat}" placeholder="Lat" data-lat />
        </div>
        <div class="col">
          <input type="number" step="any" class="form-control" value="${p.lng}" placeholder="Lng" data-lng />
        </div>
        <div class="col-auto">
          <button class="btn btn-sm btn-danger" data-delete>🗑️</button>
        </div>
        `;

        formDiv.appendChild(row);

        // Listeners
        row.querySelector("[data-lat]").addEventListener("input", (e) => {
          const nuevos = [...puntos];
          nuevos[index].lat = parseFloat(e.target.value);
          setPuntos(nuevos);
        });

        row.querySelector("[data-lng]").addEventListener("input", (e) => {
          const nuevos = [...puntos];
          nuevos[index].lng = parseFloat(e.target.value);
          setPuntos(nuevos);
        });

        row.querySelector("[data-delete]").addEventListener("click", () => {
          const nuevos = puntos.filter((_, i) => i !== index);
          setPuntos(nuevos);
        });
      });
    };

    renderizarFormulario();

    container.querySelector("#add-point").onclick = () => {
      if (puntos.length < 4) {
        setPuntos([...puntos, { lat: 0, lng: 0 }]);
      }
    };

    return () => {
      control.remove();
    };
  }, [map, puntos, setPuntos, tipo]);

  return null;
};


export default MapaInteractivo;