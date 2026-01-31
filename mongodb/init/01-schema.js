// 01-schema.js
db = db.getSiblingDB("rutas");

const collections = [
  "Nodo",
  "REZ",
  "Ruta",
  "Ruta_Completa",
  "Solucion",
  "Tramo",
  "Tramo_Solucion",
  "Vehiculo",
  "ZEZ",
];

collections.forEach((name) => {
  const exists = db.getCollectionNames().includes(name);
  if (!exists) {
    db.createCollection(name);
    print(`[init] Creada colección: ${name}`);
  } else {
    print(`[init] Ya existe: ${name}`);
  }
});
