import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000'; // URL base de la API

//------------------------------------VEHICULOS------------------------------------
// Obtenemos todos los vehículos
export const getVehiculos = async () => {
  const response = await axios.get(`${API_URL}/vehiculos`);
  return response.data;
};

// Creamos un nuevo vehículo
export const createVehiculo = async (vehiculo) => {
  try {
    const response = await axios.post(`${API_URL}/vehiculos`, vehiculo, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error("Error al crear el vehículo:", error);
    alert('Hubo un problema al crear el vehículo');
  }
};

// Actualizamos un vehículo existente
export const updateVehiculo = async (idVehiculo, vehiculoActualizado) => {
  try {
    const response = await axios.put(
      `${API_URL}/vehiculos/${idVehiculo}`,
      vehiculoActualizado,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error al actualizar el vehículo:", error);
    alert('Hubo un problema al actualizar el vehículo');
  }
};

// Eliminamos un vehículo
export const deleteVehiculo = async (idVehiculo) => {
  try {
    const response = await axios.delete(`${API_URL}/vehiculos/${idVehiculo}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar el vehículo:", error);
    alert('Hubo un problema al eliminar el vehículo');
  }
};
