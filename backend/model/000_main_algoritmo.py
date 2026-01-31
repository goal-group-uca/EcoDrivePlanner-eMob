import ast
import datetime
from Route import Route
from Truck import Truck
from ReadRoute import read_route
from HybridTruckProblem_Demo import HybridTruckProblem

from jmetal.algorithm.multiobjective.mocell import MOCell
from jmetal.util.solution import get_non_dominated_solutions
from jmetal.util.termination_criterion import StoppingByEvaluations
from jmetal.operator.selection import BinaryTournamentSelection
from jmetal.operator.crossover import SBXCrossover, TPXCrossover
from jmetal.operator.mutation import PolynomialMutation, UniformMutation, BitFlipMutation
from jmetal.util.archive import CrowdingDistanceArchive
from jmetal.util.evaluator import MultiprocessEvaluator
from jmetal.lab.visualization import Plot
from jmetal.util.neighborhood import C9
from jmetal.util.observer import ProgressBarObserver, WriteFrontToFileObserver
from jmetal.util.constraint_handling import feasibility_ratio
from CustomObservers import NonDomWriteFrontToFileObserver

from random import randint
from tqdm import tqdm
from time import time
import pandas as pd
import os
import copy
import sys
import logging
import json
import uuid
import os
import re

from multiprocessing import Process, Manager, Barrier
from multiprocessing.shared_memory import ShareableList
from uuid import uuid4

LOGGER = logging.getLogger("jmetal")
LOGGER.disabled = True

def run_problem(process_id, problem, config_population_size, config_neighborhood,
                config_archive, config_mutation_operator, config_crossover_operator,
                config_max_evaluations, barrier, representatives,  
                config_offspring_population_size):
    # Create algorithm
    algorithm = MOCell(problem = problem,
                population_size = config_population_size,
                neighborhood = config_neighborhood,
                archive = config_archive,
                mutation = config_mutation_operator(1.0 / len(problem.route.sections)),
                crossover= config_crossover_operator,
                termination_criterion = StoppingByEvaluations(max_evaluations=config_max_evaluations))
    print("Algoritmo MOCell creado")
    algorithm.observable.register(WriteFrontToFileObserver(f"./generation_front_files_process_{process_id}"))
    #algorithm.observable.register(NonDomWriteFrontToFileObserver(f"./nondom_generation_front_files_process_{process_id}"))
    
    # Initialize population
    algorithm.solutions = algorithm.create_initial_solutions()
    
    #################
    #SYNCHRONIZATION
    #################
    
    repre = algorithm.solutions[randint(0, config_population_size - 1)]
    for index,_ in enumerate(representatives[process_id]):
        representatives[process_id][index] = repre.variables[0][index]

    barrier.wait()
    algorithm.init_step()
    barrier.wait()

    evaluations = config_population_size
    epochs = 1
    print(f"Process {process_id}: EPOCH {epochs}")
    
    while evaluations < config_max_evaluations:
        # Iteration i (t=1)
        algorithm.run_step()
        
        evaluations += config_offspring_population_size
        
        if algorithm.current_individual == 0:
            epochs += 1
            #################
            #SYNCHRONIZATION
            #################
            barrier.wait()

            actual_front = algorithm.get_result()
            repre = actual_front[randint(0, len(actual_front) - 1)]
            for index,_ in enumerate(representatives[process_id]):
                representatives[process_id][index] = repre.variables[0][index]                                                    

            repres = actual_front

            print(f"Process {process_id}: EPOCH {epochs}")
            

if __name__ == '__main__':
    # # # ------------------------------------------------------------------------------------------ # # #
    # # # --------------------Los siguientes parámetros son los configurables----------------------- # # #
    # # # ------------------------------------------------------------------------------------------ # # #

    try:
        config_max_evaluations = int(sys.argv[1])
        config_population_size = int(sys.argv[2])
        config_offspring_population_size = int(sys.argv[3])
        config_probability_crossover = float(sys.argv[4])
        config_neighborhood_size = int(sys.argv[5])
        config_take_stops = sys.argv[6].lower() == 'true'
        config_process_id = int(sys.argv[7])
        config_d_results = sys.argv[8]
        config_ruta = sys.argv[9]
        config_vehiculo_id = sys.argv[10]
    except IndexError:
        print("Faltan argumentos al ejecutar el script.")
        print("Uso: python 000_main_algoritmo.py max_eval pop_size offspring_size crossover_prob neighborhood_size take_stops process_id output_dir nombre_ruta id_vehiculo")
        sys.exit(1)

    # # # ------------------------------------------------------------------------------------------ # # #
    # # # ------------------------------------------------------------------------------------------ # # #
    # # # ------------------------------------------------------------------------------------------ # # #

    # AQUI LEO EL CSV DE LA RUTA. ESTO DEBES PARSEARLO
    script_dir = os.path.dirname(os.path.abspath(__file__))
    route_path = os.path.join(script_dir, "output_csv", f"SEG_{config_ruta}.csv")
    route, _ = read_route(route_path)





    config_neighborhood = C9(config_neighborhood_size, config_neighborhood_size)
    config_crossover_operator = TPXCrossover(config_probability_crossover)
    config_mutation_operator = BitFlipMutation
    config_selection_operator = BinaryTournamentSelection()
    extra = "_stops" if config_take_stops else ""
    d_name = f"{config_ruta}{extra}"
    config_archive = CrowdingDistanceArchive(config_population_size)

    # 🔵 Leer el ID de vehículo
    config_vehiculo_id = sys.argv[10]

    # 🔵 Conectar a MongoDB
    from pymongo import MongoClient
    client = MongoClient("mongodb://mongo:27017")
    db = client["rutas"]
    vehiculos_collection = db["Vehiculo"]

    # 🔵 Buscar el vehículo
    vehiculo_data = vehiculos_collection.find_one({"Id_Vehiculo": config_vehiculo_id})

    if not vehiculo_data:
        print(f"❌ Vehículo con ID {config_vehiculo_id} no encontrado.")
        sys.exit(1)

    # 🔵 Crear Truck con los datos del vehículo
    truck = Truck(
        identity=1,
        route=route,
        ICE_power=vehiculo_data["potencia_max_ice"],
        EV_power=vehiculo_data["potencia_max_ev"],
        acc=0.5,  # Puedes mantener esto fijo o permitir que el usuario lo configure
        charge=vehiculo_data["bateria"],
        weight=vehiculo_data["peso"],
        frontal_section=vehiculo_data["seccion_frontal"],
        fuel_engine_efficiency=vehiculo_data["eficiencia_ice"],
        electric_engine_efficiency=vehiculo_data["eficiencia_ev"]
    )

    problem = HybridTruckProblem(route=route, truck=truck, process_id=config_process_id, take_stops=config_take_stops)
    
    # Create algorithm
    algorithm = MOCell(problem = problem,
                population_size = config_population_size,
                neighborhood = config_neighborhood,
                archive = config_archive,
                mutation = config_mutation_operator(2.0 / len(problem.route.sections)),
                crossover= config_crossover_operator,
                termination_criterion = StoppingByEvaluations(max_evaluations=config_max_evaluations))
    algorithm.observable.register(WriteFrontToFileObserver(f"{config_d_results}/output_results_{d_name}/generation_front_files_process_{config_process_id}"))
    begin = time()
    # Initialize population

    print("Ejecutando .run()")
    algorithm.run()
    solutions = algorithm.get_result()

    # Ruta al archivo FUN con las métricas por solución
    fun_path = f"{config_d_results}/output_results_{d_name}/generation_front_files_process_{config_process_id}/FUN.1"

    if not os.path.exists(fun_path):
        print("Archivo FUN no encontrado:", fun_path)
        sys.exit(1)

    with open(fun_path, "r") as f:
        fun_lines = [line.strip() for line in f.readlines() if line.strip()]

    from pymongo import MongoClient
    client = MongoClient("mongodb://mongo:27017")
    db = client["rutas"]
    tramos_solucion_collection = db["Tramo_Solucion"]
    soluciones_collection = db["Solucion"]
    #Posible Quitar
    # Obtener la ruta completa desde la base de datos para mapear los tramos en orden
    ruta_completa = db["Ruta_Completa"].find_one({"Id_RutaCompleta": config_ruta})
    print(f"[DEBUG] Buscando ruta completa con ID: {config_ruta}")
    print(f"[DEBUG] Resultado ruta_completa: {ruta_completa}")
    if not ruta_completa:
        print(f"No se encontró la ruta completa con ID {config_ruta}")
        sys.exit(1)

    # Obtener las rutas asociadas desde la colección
    rutas_ids = ruta_completa.get("secuencia_rutas", [])
    rutas = list(db["Ruta"].find({"Id_Ruta": {"$in": rutas_ids}}))

    # Obtener todos los tramos asociados a esas rutas
    tramos_ids = [tramo_id for ruta in rutas for tramo_id in ruta.get("secuencia_tramos", [])]
    print(f"[DEBUG] Tramos obtenidos: {tramos_ids}")
    #Posible Quitar

    soluciones_almacenadas = 0

    for i in range(min(len(solutions), len(fun_lines))):
        sol = solutions[i]
        print(f"Solución {i}:")
        print(sol.variables)  # Accedemos a la lista interna de variables

        fun_line = fun_lines[i].strip()
        
        try:
            # Extraer listas con regex
            listas = re.findall(r"\[[^\]]*\]", fun_line)
            
            # El formato real parece tener 3 listas: [kgCO2], [kWh], [otros valores]
            if len(listas) < 3:
                print(f"Línea {i} no contiene suficientes listas: {listas}")
                continue

            # Parsear las listas relevantes (índices ajustados al formato real)
            lista_emisiones = ast.literal_eval(listas[0])  # Primera lista: emisiones
            lista_kwh = ast.literal_eval(listas[1])       # Segunda lista: kWh
            lista_soc = ast.literal_eval(listas[2])           # SOC (State of Charge)
            lista_regenerados = ast.literal_eval(listas[3])   # kWh regenerados (negativos)
            
            # Verificar consistencia de longitudes
            if len(sol.variables) != len(lista_emisiones) or len(sol.variables) != len(lista_kwh):
                print(f"Discrepancia en longitudes - Solución {i}: Variables={len(sol.variables)}, Emisiones={len(lista_emisiones)}, KWh={len(lista_kwh)}")
                continue

            id_solucion = str(uuid4())
            tramos_solucion_ids = []
                
            # Procesar cada tramo de la solución
            for index, activado in enumerate(sol.variables):

                id_tramo_sol = str(uuid4())

                print(f"[DEBUG] Len variables: {len(sol.variables)}, Len tramos_ids: {len(tramos_ids)}")

                tramo_sol = {
                    "Id_TramoSolucion": id_tramo_sol,
                    "Id_TramoOriginal": tramos_ids[index], 
                    "modo_conduccion": "eléctrico" if activado else "combustión",
                    "soc": float(lista_regenerados[index]),  
                    "recarga": float(lista_soc[index]) * -1, 
                    "emisiones": float(lista_emisiones[index]),
                    "energia_consumida": float(lista_kwh[index])
                }

                tramos_solucion_collection.insert_one(tramo_sol)
                tramos_solucion_ids.append(id_tramo_sol)

            # Crear documento de solución
            solucion = {
                "Id_Solucion": id_solucion,
                "secuencia_tramos_solucion": tramos_solucion_ids,
                "ruta_completa": config_ruta,
                "vehiculo": config_vehiculo_id,
                "fecha_creacion": datetime.datetime.now()
            }

            soluciones_collection.insert_one(solucion)
            soluciones_almacenadas += 1
            print(f"Solución {i} almacenada correctamente")

        except Exception as e:
            print(f"Error al procesar solución {i}: {str(e)}")
            continue

    print(f"Se han almacenado {soluciones_almacenadas} soluciones válidas de {len(solutions)} posibles en la base de datos.")
