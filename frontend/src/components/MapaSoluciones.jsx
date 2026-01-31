import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Íconos personalizados
const iconoParada = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/5193/5193890.png',
  iconSize: [30, 30],
});

const iconoRecarga = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/5140/5140092.png',
  iconSize: [30, 30],
});

const iconoPredeterminado = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
});

const obtenerIcono = (nodo) => {
  if (nodo.es_parada) return iconoParada;
  if (nodo.es_punto_recarga) return iconoRecarga;
  return iconoPredeterminado;
};

const MapaSoluciones = ({ rutaCompleta, tramos, nodos, solucion }) => {
  const mapRef = useRef();

  // Encontrar la solución seleccionada
  //const solucion = solucion;

  // Obtener los tramos de solución con sus modos de conducción
  const tramosConModo = tramos?.map(tramo => {
    // Buscar el tramo de solución que corresponde al tramo original
    const tramoSolucion = solucion?.tramos?.find(t => t.Id_TramoOriginal === tramo.Id_Tramo);

    return {
      ...tramo,
      modo_conduccion: tramoSolucion?.modo_conduccion || 'combustión',
      color: tramoSolucion?.modo_conduccion === 'eléctrico' ? '#2ecc71' : '#b01202'
    };
  });

  // Centrar el mapa en la ruta
  useEffect(() => {
    if (nodos?.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(nodos.map(nodo => [nodo.coordenada.lat, nodo.coordenada.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [nodos]);

  return (
    <MapContainer
      center={[36.5297, -6.2929]}
      zoom={7}
      style={{ height: '600px', width: '100%' }}
      whenCreated={map => {
        mapRef.current = map;
        setTimeout(() => {
          map.invalidateSize(); // <-- esto fuerza el redibujo
        }, 200);
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {/* Mostramos nodos */}
      {nodos?.map((nodo, index) => (
        <Marker
          key={`nodo-${index}`}
          position={[nodo.coordenada.lat, nodo.coordenada.lng]}
          icon={obtenerIcono(nodo)}
        >
          <Popup>
            <div>
              <strong>Node {index + 1}</strong>
              <p>Lat: {nodo.coordenada.lat.toFixed(6)}</p>
              <p>Lng: {nodo.coordenada.lng.toFixed(6)}</p>
              {nodo.es_parada && <p>🚏 Stop</p>}
              {nodo.es_punto_recarga && <p>⚡ Charging point</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Mostramos tramos con colores según modo de conducción */}
      {tramosConModo?.map((tramo, index) => {
        const nodoOrigen = nodos?.find(n => n.Id_Nodo === tramo.nodo_origen);
        const nodoDestino = nodos?.find(n => n.Id_Nodo === tramo.nodo_destino);

        if (!nodoOrigen || !nodoDestino) return null;

        const positions = [
          [nodoOrigen.coordenada.lat, nodoOrigen.coordenada.lng],
          [nodoDestino.coordenada.lat, nodoDestino.coordenada.lng]
        ];

        return (
          <Polyline
            key={`tramo-${index}`}
            positions={positions}
            color={tramo.color}
            weight={6}
            opacity={0.8}
          >
            <Popup>
              <div>
                <strong>Segment {index + 1}</strong>
                <p>Distance: {tramo.distancia.toFixed(2)} m</p>
                <p>Mode:
                  <span style={{
                    color: tramo.modo_conduccion === 'eléctrico' ? '#2ecc71' : '#b01202',
                    fontWeight: 'bold'
                  }}>
                    {tramo.modo_conduccion}
                  </span>
                </p>
                <p>Average speed: {tramo.velocidad_media.toFixed(2)} km/h</p>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* Añadimos leyenda */}
      <MapLegend />
    </MapContainer>
  );
};

// Componente para la leyenda del mapa
const MapLegend = () => {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.borderRadius = '5px';
      div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';

      div.innerHTML = `
        <h4 style="margin-top:0; margin-bottom:10px;">Legend</h4>
        <div style="display:flex; align-items:center; margin-bottom:5px;">
          <div style="width:20px; height:20px; background-color:#2ecc71; margin-right:8px;"></div>
          <span>Electric mode</span>
        </div>
        <div style="display:flex; align-items:center; margin-bottom:5px;">
          <div style="width:20px; height:20px; background-color:#e74c3c; margin-right:8px;"></div>
          <span>Combustion mode</span>
        </div>
        <div style="display:flex; align-items:center; margin-bottom:5px;">
          <img src="https://cdn-icons-png.flaticon.com/512/5193/5193890.png" width="20" height="20" style="margin-right:8px;">
          <span>Stop</span>
        </div>
        <div style="display:flex; align-items:center;">
          <img src="https://cdn-icons-png.flaticon.com/512/5140/5140092.png" width="20" height="20" style="margin-right:8px;">
          <span>Charging point</span>
        </div>
      `;
      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map]);

  return null;
};

export default MapaSoluciones;