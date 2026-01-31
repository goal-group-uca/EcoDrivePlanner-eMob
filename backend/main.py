#-----------------------------------------IMPORTS------------------------------------
from fastapi import FastAPI, HTTPException, Body
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import time
import pandas as pd
import os
import subprocess
import ast
import math

#-----------------------------------------Conexion con MongoDB------------------------------------
client = MongoClient("mongodb://mongo:27017")
db = client["rutas"]

vehiculos_collection = db["Vehiculo"]
rutas_completas_collection = db["Ruta_Completa"]
rutas_collection = db["Ruta"]
tramos_collection = db["Tramo"]
nodos_collection = db["Nodo"]
zez_collection = db["ZEZ"]
rez_collection = db["REZ"]
soluciones_collection = db["Solucion"]
tramos_solucion_collection = db["Tramo_Solucion"]

# Iniciamos la aplicación FastAPI
app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#-----------------------------------------Modelos de datos------------------------------------
class Vehiculo(BaseModel):
    Id_Vehiculo: str
    tipo: str
    bateria: float
    peso: float
    seccion_frontal: float
    eficiencia_ice: float
    eficiencia_ev: float
    potencia_max_ice: float
    potencia_max_ev: float
    lista_soluciones: List[str] = []
    caracteristicas_adicionales: Dict[str, str] = {}

class Ruta_Completa(BaseModel):
    Id_RutaCompleta: str
    Nombre: str
    secuencia_rutas: List[str]  # Lista de IDs de rutas

class Ruta(BaseModel):
    Id_Ruta: str
    secuencia_tramos: List[str]  # Lista de IDs de tramos

class Tramo(BaseModel):
    Id_Tramo: str
    nodo_origen: str
    nodo_destino: str
    zona_zez: List[str] = []
    zona_rez: List[str] = []
    distancia: float
    velocidad_media: float
    slope_porcentaje: float
    slope_angulo: float

class Nodo(BaseModel):
    Id_Nodo: str
    coordenada: Dict[str, float]  # {"lat": float, "lng": float}
    es_parada: bool
    es_punto_recarga: bool
    altura: float

class ZEZ(BaseModel):
    Id_ZEZ: str
    Coordenadas: List[Dict[str, float]]  # Lista de 4 coordenadas {lat, lng}

class REZ(BaseModel):
    Id_REZ: str
    Coordenadas: List[Dict[str, float]]  # Lista de 4 coordenadas {lat, lng}

class Solucion(BaseModel):
    Id_Solucion: str
    secuencia_tramos_solucion: List[str]  # Lista de IDs de tramos de solución
    ruta_completa: str  # ID de la ruta completa asociada
    vehiculo: str       # ID del vehículo asociado

class TramoSolucion(BaseModel):
    Id_TramoSolucion: str
    modo_conduccion: str  # "eléctrico" o "combustión"
    soc: float            # State of Charge 
    recarga: float        # Recarga de batería realizada en el tramo, si aplica
    emisiones: float
    energia_consumida: float

#-----------------------------------------API para Obtener Altura desde OpenTopoData------------------------------------
""" @app.get("/obtener_altura/{lat}/{lng}")
async def obtener_altura(lat: float, lng: float):
    try:
        url = f"https://api.opentopodata.org/v1/srtm30m?locations={lat},{lng}"
        response = requests.get(url, timeout=10)
        data = response.json()

        if "results" in data and len(data["results"]) > 0 and "elevation" in data["results"][0]:
            altura = data["results"][0]["elevation"]
            time.sleep(1)  #
            return {"altura": altura}
        else:
            print(f"⚠️ No se pudo obtener altura para ({lat}, {lng}). Respuesta de API:", data)
            return {"error": "No se pudo obtener la altura", "altura": None}

    except requests.exceptions.RequestException as e:
        print("❌ Error al conectar con OpenTopoData:", str(e))
        return {"error": "No se pudo conectar con OpenTopoData", "altura": None} """

@app.get("/obtener_altura/{lat}/{lng}")
async def obtener_altura(lat: float, lng: float):
    try:
        url = "https://api.open-elevation.com/api/v1/lookup"
        payload = {
            "locations": [{"latitude": lat, "longitude": lng}]
        }
        response = requests.post(url, json=payload, timeout=10)
        data = response.json()

        if "results" in data and len(data["results"]) > 0 and "elevation" in data["results"][0]:
            altura = data["results"][0]["elevation"]
            print(f"✅ Altura obtenida para ({lat}, {lng}): {altura} metros")
            return {"altura": altura}
        else:
            print(f"⚠️ No se pudo obtener altura para ({lat}, {lng}). Respuesta de API:", data)
            return {"error": "No se pudo obtener la altura", "altura": None}

    except requests.exceptions.RequestException as e:
        print("❌ Error al conectar con Open-Elevation:", str(e))
        return {"error": "No se pudo conectar con Open-Elevation", "altura": None}
    
""" @app.get("/obtener_altura/{lat}/{lng}")
async def obtener_altura(lat: float, lng: float):
    # Primero intentamos con OpenTopoData
    try:
        url = f"https://api.opentopodata.org/v1/srtm30m?locations={lat},{lng}"
        response = requests.get(url, timeout=5)
        data = response.json()

        if "results" in data and len(data["results"]) > 0 and "elevation" in data["results"][0]:
            return {"altura": data["results"][0]["elevation"]}
        
    except Exception:
        pass  # Silenciosamente pasamos al fallback

    # Fallback a Open-Elevation
    try:
        url = "https://api.open-elevation.com/api/v1/lookup"
        payload = {"locations": [{"latitude": lat, "longitude": lng}]}
        response = requests.post(url, json=payload, timeout=10)
        data = response.json()

        if "results" in data and len(data["results"]) > 0 and "elevation" in data["results"][0]:
            return {"altura": data["results"][0]["elevation"]}
            
    except Exception as e:
        print(f"❌ Error obteniendo altura: {str(e)}")

    return {"error": "No se pudo obtener la altura"} """

#-----------------------------------------CRUD Vehículos------------------------------------
@app.post("/vehiculos", response_model=dict)
async def crear_vehiculo(vehiculo: Vehiculo):
    # Verificar si el vehículo ya existe
    if vehiculos_collection.find_one({"Id_Vehiculo": vehiculo.Id_Vehiculo}):
        raise HTTPException(status_code=400, detail="El vehículo ya existe")
    
    vehiculos_collection.insert_one(vehiculo.dict())
    return {"mensaje": "Vehículo añadido exitosamente"}

@app.get("/vehiculos", response_model=List[dict])
async def obtener_vehiculos():
    return list(vehiculos_collection.find({}, {"_id": 0}))

@app.delete("/vehiculos/{id_vehiculo}", response_model=dict)
async def eliminar_vehiculo(id_vehiculo: str):
    result = vehiculos_collection.delete_one({"Id_Vehiculo": id_vehiculo})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return {"mensaje": "Vehículo eliminado exitosamente"}

@app.put("/vehiculos/{id_vehiculo}", response_model=dict)
async def actualizar_vehiculo(id_vehiculo: str, vehiculo_actualizado: Vehiculo):
    # Verificar que el ID en el cuerpo coincida con el de la URL
    if vehiculo_actualizado.Id_Vehiculo != id_vehiculo:
        raise HTTPException(status_code=400, detail="El ID del vehículo no coincide")
    
    result = vehiculos_collection.update_one(
        {"Id_Vehiculo": id_vehiculo},
        {"$set": vehiculo_actualizado.dict()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    return {"mensaje": "Vehículo actualizado exitosamente"}

@app.get("/soluciones_por_vehiculo/{id_vehiculo}")
async def obtener_soluciones_por_vehiculo(id_vehiculo: str):
    try:
        # Obtener todas las soluciones para este vehículo
        soluciones = list(soluciones_collection.find(
            {"vehiculo": id_vehiculo}, 
            {"_id": 0}
        ))
        
        # Para cada solución, obtener sus tramos de solución
        for solucion in soluciones:
            tramos_solucion = list(tramos_solucion_collection.find(
                {"Id_TramoSolucion": {"$in": solucion["secuencia_tramos_solucion"]}},
                {"_id": 0}
            ))
            solucion["tramos"] = tramos_solucion
        
        return soluciones
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

#-----------------------------------------CRUD Nodos------------------------------------
@app.post("/nodos", response_model=dict)
async def crear_nodos(nodos: List[Nodo]):
    try:
        nodos_guardados = []

        for nodo in nodos:
            # Verificar si el nodo ya existe en la BD
            nodo_existente = nodos_collection.find_one({"coordenada": nodo.coordenada})
            if not nodo_existente:
                # Insertamos el nodo si no existe
                nodos_collection.insert_one(nodo.dict())
                nodos_guardados.append(nodo.Id_Nodo)

        return {"mensaje": "Nodos almacenados correctamente", "nodos": nodos_guardados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/nodos", response_model=List[dict])
async def obtener_nodos():
    return list(nodos_collection.find({}, {"_id": 0}))

#-----------------------------------------CRUD Tramos------------------------------------
@app.post("/tramos", response_model=dict)
async def crear_tramos(tramos: List[Tramo]):
    try:
        tramos_collection.insert_many([tramo.dict() for tramo in tramos])
        return {"mensaje": "Tramos almacenados correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tramos", response_model=List[dict])
async def obtener_tramos():
    return list(tramos_collection.find({}, {"_id": 0}))

#-----------------------------------------CRUD Rutas------------------------------------
@app.post("/rutas")
async def crear_rutas(rutas: List[Ruta]):
    rutas_collection.insert_many([ruta.dict() for ruta in rutas])
    return {"mensaje": "Rutas almacenadas correctamente"}

@app.get("/rutas")
async def obtener_rutas():
    return list(rutas_collection.find({}, {"_id": 0}))

#-----------------------------------------CRUD Rutas Completas------------------------------------
@app.post("/rutas_completas", response_model=dict)
async def crear_ruta_completa(ruta_completa: Ruta_Completa):
    try:
        rutas_completas_collection.insert_one(ruta_completa.dict())
        return {"mensaje": "Ruta completa añadida exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/rutas_completas", response_model=List[dict])
async def obtener_rutas_completas():
    try:
        rutas = list(rutas_completas_collection.find({}, {"_id": 0, "Id_RutaCompleta": 1, "Nombre": 1}))
        return rutas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rutas_completas/{id_ruta_completa}")
async def obtener_ruta_completa(id_ruta_completa: str):
    try:
        # Buscamos la ruta completa en la BD
        ruta_completa = rutas_completas_collection.find_one({"Id_RutaCompleta": id_ruta_completa}, {"_id": 0})

        if not ruta_completa:
            raise HTTPException(status_code=404, detail="Ruta completa no encontrada")

        # Obtenemos todas las rutas que forman la Ruta Completa
        rutas_ids = ruta_completa["secuencia_rutas"]
        rutas = list(rutas_collection.find({"Id_Ruta": {"$in": rutas_ids}}, {"_id": 0}))

        # Obtenemos todos los tramos asociados a esas rutas
        tramos_ids = [tramo_id for ruta in rutas for tramo_id in ruta["secuencia_tramos"]]
        tramos = list(tramos_collection.find({"Id_Tramo": {"$in": tramos_ids}}, {"_id": 0}))

        # Obtenemos los nodos involucrados en los tramos
        nodos_ids = set([tramo["nodo_origen"] for tramo in tramos] + [tramo["nodo_destino"] for tramo in tramos])
        nodos = list(nodos_collection.find({"Id_Nodo": {"$in": list(nodos_ids)}}, {"_id": 0}))

        # Devolvemos toda la información
        return {
            "ruta_completa": ruta_completa,
            "rutas": rutas,
            "tramos": tramos,
            "nodos": nodos
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/rutas_completas/{id_ruta_completa}", response_model=dict)
async def eliminar_ruta_completa(id_ruta_completa: str):
    try:
        # 1. Buscar la ruta completa
        ruta_completa = rutas_completas_collection.find_one({"Id_RutaCompleta": id_ruta_completa})
        if not ruta_completa:
            raise HTTPException(status_code=404, detail="Ruta completa no encontrada")

        # 2. Obtener todas las rutas asociadas
        rutas_ids = ruta_completa["secuencia_rutas"]
        rutas = list(rutas_collection.find({"Id_Ruta": {"$in": rutas_ids}}))

        # 3. Obtener todos los tramos asociados
        tramos_ids = [tramo_id for ruta in rutas for tramo_id in ruta["secuencia_tramos"]]
        
        # 4. Obtener todos los nodos únicos que están solo en estos tramos
        tramos = list(tramos_collection.find({"Id_Tramo": {"$in": tramos_ids}}))
        nodos_ids = list(set([tramo["nodo_origen"] for tramo in tramos] + [tramo["nodo_destino"] for tramo in tramos]))
        
        # 5. Verificar si estos nodos son usados en otros tramos no relacionados
        otros_tramos_cursor = tramos_collection.find({
            "Id_Tramo": {"$nin": tramos_ids},
            "$or": [
                {"nodo_origen": {"$in": nodos_ids}},
                {"nodo_destino": {"$in": nodos_ids}}
            ]
        })

        otros_tramos_list = list(otros_tramos_cursor)

        # 6. Filtrar nodos que solo pertenecen a esta ruta
        nodos_a_eliminar = []
        if len(otros_tramos_list) == 0:
            nodos_a_eliminar = nodos_ids
        else:
            nodos_en_otros_tramos = set()
            for tramo in otros_tramos_list:
                nodos_en_otros_tramos.add(tramo["nodo_origen"])
                nodos_en_otros_tramos.add(tramo["nodo_destino"])

            nodos_a_eliminar = [nodo_id for nodo_id in nodos_ids if nodo_id not in nodos_en_otros_tramos]

        # 7. Eliminar en orden inverso para mantener la integridad referencial
        # Primero la ruta completa
        rutas_completas_collection.delete_one({"Id_RutaCompleta": id_ruta_completa})
        
        # Luego las rutas
        rutas_collection.delete_many({"Id_Ruta": {"$in": rutas_ids}})
        
        # Luego los tramos
        tramos_collection.delete_many({"Id_Tramo": {"$in": tramos_ids}})
        
        # Finalmente los nodos (solo los que no están en otros tramos)
        if nodos_a_eliminar:
            nodos_collection.delete_many({"Id_Nodo": {"$in": nodos_a_eliminar}})

        return {"mensaje": "Ruta completa y todos sus componentes asociados eliminados correctamente"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ------------------------- CRUD ZEZ -------------------------
@app.post("/zez", response_model=dict)
async def crear_zez(zez: ZEZ):
    try:
        # Validar que tiene exactamente 4 coordenadas
        if len(zez.Coordenadas) != 4:
            raise HTTPException(status_code=400, detail="Una ZEZ debe tener exactamente 4 coordenadas")
        
        zez_collection.insert_one(zez.dict())
        return {"mensaje": "ZEZ creada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/zez", response_model=List[dict])
async def obtener_zez():
    return list(zez_collection.find({}, {"_id": 0}))

@app.delete("/zez/{id_zez}", response_model=dict)
async def eliminar_zez(id_zez: str):
    result = zez_collection.delete_one({"Id_ZEZ": id_zez})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="ZEZ no encontrada")
    return {"mensaje": "ZEZ eliminada correctamente"}

# ------------------------- CRUD REZ -------------------------
@app.post("/rez", response_model=dict)
async def crear_rez(rez: REZ):
    try:
        # Validar que tiene exactamente 4 coordenadas
        if len(rez.Coordenadas) != 4:
            raise HTTPException(status_code=400, detail="Una REZ debe tener exactamente 4 coordenadas")
        
        rez_collection.insert_one(rez.dict())
        return {"mensaje": "REZ creada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rez", response_model=List[dict])
async def obtener_rez():
    return list(rez_collection.find({}, {"_id": 0}))

@app.delete("/rez/{id_rez}", response_model=dict)
async def eliminar_rez(id_rez: str):
    result = rez_collection.delete_one({"Id_REZ": id_rez})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="REZ no encontrada")
    return {"mensaje": "REZ eliminada correctamente"}

# ------------------------- GENERAR CSV PARA GENERAR LUEGO SOLUCIONES -------------------------
@app.post("/generar_csv_ruta/{id_ruta_completa}")
def generar_csv_para_algoritmo(id_ruta_completa: str):
    try:
        print("🟡 ID recibido:", id_ruta_completa)

        # Aseguramos que la carpeta existe
        output_dir = "./model/output_csv"
        os.makedirs(output_dir, exist_ok=True)

        # 1. Obtener la ruta completa
        ruta_completa = rutas_completas_collection.find_one({"Id_RutaCompleta": id_ruta_completa})
        print("🔵 Ruta encontrada:", ruta_completa)
        if not ruta_completa:
            raise HTTPException(status_code=404, detail="Ruta completa no encontrada")

        # 2. Obtener todas las rutas asociadas
        rutas_ids = ruta_completa["secuencia_rutas"]
        rutas = list(rutas_collection.find({"Id_Ruta": {"$in": rutas_ids}}))

        # 3. Obtener todos los tramos asociados
        tramos_ids = [tramo_id for ruta in rutas for tramo_id in ruta["secuencia_tramos"]]
        tramos = list(tramos_collection.find({"Id_Tramo": {"$in": tramos_ids}}))

        # 4. Obtener todos los nodos
        nodos_ids = list(set([tramo["nodo_origen"] for tramo in tramos] + [tramo["nodo_destino"] for tramo in tramos]))
        nodos = list(nodos_collection.find({"Id_Nodo": {"$in": nodos_ids}}))
        nodos_dict = {n["Id_Nodo"]: n for n in nodos}

        # 🔍 DEBUG: Verifica si hay nodos huérfanos
        todos_los_nodos_usados = set()
        for tramo in tramos:
            todos_los_nodos_usados.add(tramo["nodo_origen"])
            todos_los_nodos_usados.add(tramo["nodo_destino"])

        nodos_ids_encontrados = set(nodos_dict.keys())

        faltan_nodos = todos_los_nodos_usados - nodos_ids_encontrados

        if faltan_nodos:
            print("❌ NODOS NO ENCONTRADOS EN LA BD:", faltan_nodos)
        else:
            print("✅ Todos los nodos de los tramos están correctamente en la base de datos.")

        # 5. Crear DataFrame
        rows = []
        for i, tramo in enumerate(tramos):
            nodo_from = nodos_dict[tramo["nodo_origen"]]
            nodo_to = nodos_dict[tramo["nodo_destino"]]

            if not nodo_from or not nodo_to:
                print(f"⚠️ Tramo con nodo faltante: {tramo['Id_Tramo']}")
                continue  # Saltamos este tramo

            rows.append({
                "Global Index": i,
                "From": tramo["nodo_origen"],
                "To": tramo["nodo_destino"],
                "Time": round(tramo["distancia"] / tramo["velocidad_media"], 2) if tramo["velocidad_media"] > 0 else 0,
                "Distance": tramo["distancia"],
                "Avg Speed": tramo["velocidad_media"] / 3.6,
                "Altitude From": nodo_from.get("altura", 0),
                "Altitude To": nodo_to.get("altura", 0),
                "Slope": round(nodo_to.get("altura", 0) - nodo_from.get("altura", 0), 2),
                "Slope %": round(tramo["slope_porcentaje"], 2),
                "Slope Angle": round(math.radians(tramo["slope_angulo"]), 6),
                "Bus Stop": nodo_from.get("es_parada", False),
                "Final Stop": nodo_to.get("es_parada", False)
            })

        df = pd.DataFrame(rows)

        # 6. Guardar CSV
        output_path = os.path.join(output_dir, f"SEG_{id_ruta_completa}.csv")
        df.to_csv(output_path, index=False)

        return {"mensaje": f"Archivo CSV generado correctamente en {output_path}"}

    except Exception as e:
        print("❌ Error generando CSV:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ejecutar_algoritmo")
def ejecutar_algoritmo(config: dict = Body(...)):
    try:
        id_ruta = config["ruta_id"]
        print(f"🟡 Ejecutando algoritmo para ruta: {id_ruta}")
        print("📦 Parámetros recibidos:", config)

        # 1. Generar el CSV primero
        print("📄 Generando CSV...")
        csv_result = generar_csv_para_algoritmo(id_ruta)
        print("✅ CSV generado con mensaje:", csv_result["mensaje"])

        # 2. Preparar comando para ejecutar el script
        script_path = "./model/000_main_algoritmo.py"
        command = [
            "python", script_path,
            str(config["maxEvaluations"]),
            str(config["populationSize"]),
            str(config["offspringSize"]),
            str(config["crossoverProbability"]),
            str(config["neighborhoodSize"]),
            str(config["takeStops"]),
            str(config["processId"]),
            config["dResults"],
            id_ruta,
            config["vehiculo_id"]
        ]

        print("🚀 Ejecutando script:", " ".join(command))

        # 3. Ejecutar el script y capturar salida
        result = subprocess.run(command, capture_output=True, text=True)

        print("📤 STDOUT:")
        print(result.stdout)
        print("📥 STDERR:")
        print(result.stderr)

        if result.returncode != 0:
            print("❌ Error en la ejecución del script")
            return {
                "error": "Fallo al ejecutar el algoritmo",
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        
        # ⬇️ AQUÍ VA LO NUEVO
        stdout = result.stdout
        print("📦 Procesando resultados del algoritmo...")
        print(stdout)

        
        return {
            "mensaje": "Algoritmo ejecutado correctamente",
            "stdout": result.stdout
        }

    except Exception as e:
        print("❌ Error inesperado en el backend:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    


@app.get("/csv_existe/{id_ruta_completa}")
def csv_existe(id_ruta_completa: str):
    path = f"./model/output_csv/SEG_{id_ruta_completa}.csv"
    return {"existe": os.path.exists(path)}


# ------------------------- Rutas con Soluciones Creadas -------------------------
@app.get("/rutas_con_soluciones")
async def obtener_rutas_con_soluciones():
    try:
        # Buscar todas las soluciones existentes
        soluciones = list(soluciones_collection.find({}, {"_id": 0, "ruta_completa": 1}))
        
        # Obtener IDs únicos de rutas completas que tienen soluciones
        rutas_con_soluciones_ids = list(set([sol["ruta_completa"] for sol in soluciones]))
        
        # Obtener los detalles de estas rutas completas
        rutas_con_soluciones = list(rutas_completas_collection.find(
            {"Id_RutaCompleta": {"$in": rutas_con_soluciones_ids}},
            {"_id": 0, "Id_RutaCompleta": 1, "Nombre": 1}
        ))
        
        return rutas_con_soluciones
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ------------------------- Mostrar Soluciones -------------------------
@app.get("/soluciones_por_ruta/{id_ruta_completa}")
async def obtener_soluciones_por_ruta(id_ruta_completa: str):
    try:
        # Obtener todas las soluciones para esta ruta
        soluciones = list(soluciones_collection.find(
            {"ruta_completa": id_ruta_completa}, 
            {"_id": 0}
        ))
        
        # Para cada solución, obtener sus tramos de solución
        for solucion in soluciones:
            tramos_solucion = list(tramos_solucion_collection.find(
                {"Id_TramoSolucion": {"$in": solucion["secuencia_tramos_solucion"]}},
                {"_id": 0}
            ))
            solucion["tramos"] = tramos_solucion
        
        return soluciones
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/detalle_ruta_completa/{id_ruta_completa}")
async def obtener_detalle_ruta_completa(id_ruta_completa: str):
    try:
        # Obtener la ruta completa con todos sus componentes
        ruta_completa = rutas_completas_collection.find_one(
            {"Id_RutaCompleta": id_ruta_completa}, 
            {"_id": 0}
        )
        
        if not ruta_completa:
            raise HTTPException(status_code=404, detail="Ruta no encontrada")
        
        # Obtener rutas, tramos y nodos como en tu endpoint existente
        rutas = list(rutas_collection.find(
            {"Id_Ruta": {"$in": ruta_completa["secuencia_rutas"]}},
            {"_id": 0}
        ))
        
        tramos_ids = [tramo_id for ruta in rutas for tramo_id in ruta["secuencia_tramos"]]
        tramos = list(tramos_collection.find(
            {"Id_Tramo": {"$in": tramos_ids}},
            {"_id": 0}
        ))
        
        nodos_ids = list(set([tramo["nodo_origen"] for tramo in tramos] + [tramo["nodo_destino"] for tramo in tramos]))
        nodos = list(nodos_collection.find(
            {"Id_Nodo": {"$in": nodos_ids}},
            {"_id": 0}
        ))
        
        return {
            "ruta_completa": ruta_completa,
            "rutas": rutas,
            "tramos": tramos,
            "nodos": nodos
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))