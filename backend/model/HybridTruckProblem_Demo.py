from jmetal.core.problem import Problem
from jmetal.core.solution import FloatSolution, BinarySolution
from Route import Route
from Truck import Truck

import random
import math
import time
import numpy as np
import copy

# l_known_sections = []

def vehicle_specific_power(v: float, slope: float, acc: float, m: float = 27000, A: float = 8):
    # print("No conocida")
    g = 9.80665 # Gravity
    Cr=0.006 # Rolling resistance coefficient
    Cd=0.63 # Drag coefficient
    ro_air=1.225 # Air density
    # alpha = math.atan(slope) #Elevation angle in radians
    alpha = slope #Elevation angle in radians
    aux_energy = 2 #Auxiliar energy consumption in kW - 3kW with AC off or 12kW with AC on
    # print("alpha: {}".format(alpha))
    #Vehicle efficiencies
    n_dc = 0.90
    n_m = 0.95
    n_t = 0.96
    n_b = 0.97
    n_g = 0.90

    Frff = g * Cr * m * math.cos(alpha) # Rolling friction force
    Fadf = ro_air * A * Cd * math.pow(v, 2) / 2 # Aerodynamic drag force
    Fhcf = g * m * math.sin(alpha) # Hill climbing force
    Farf = m * acc # Acceleration resistance force
    Fttf = Frff + Fadf + Fhcf + Farf # Total force in Newtons
    # print("Fuerzas: acc:{} Frff: {}, Fadf: {}, Fhcf: {}, Farf: {}".format(acc, Frff, Fadf, Fhcf, Farf))
    power = (Fttf * v) / 1000 # Total energy in kW

    #Drivetrain model (efficiency)
    rbf = 1-math.exp(-v*0.36) #Regenerative braking factor
    if power<0:
        # print("Power: {}".format(power))
        total_n = n_dc*n_g*n_t*n_b #Total drivetrain efficiency
        total_power = aux_energy/n_b + rbf*power*total_n
    else:
        total_n = n_dc*n_m*n_t*n_b; #Total drivetrain efficiency
        total_power = aux_energy/n_b + power/total_n

    #print("Frff: {}, Fadf: {}, Fhcf: {}".format(Frff, Fadf, Fhcf))
    # Total power [kW]
    return  total_power

def decrease_battery_charge(remaining_charge, section_charge, truck_charge):
    if (remaining_charge - section_charge) > truck_charge:
        return truck_charge
    else:
        return remaining_charge - section_charge

dict_sections = {}
key_set = set()

def section_power(vo: float, vf: float, acc: float, slope: float, section_distance: float, max_engine_power, index, m: float = 27000, A: float = 8):
    acc_decay = 0.05    # m/s^2
    v_decay = 0.1
    instant_speed = vo   

    total_power = 0

    section_distance *= 1000

    # print(f"Seccion {index} - {section_distance} m - {slope} % - {acc} m/s^2 - {vo} m/s - {vf} m/s")
    # green_distance = green_percent * section_distance 

    # Primero ver si se puede alcanzar la velocidad en la seccion actual
    kW = vehicle_specific_power(vf, slope, acc, m, A)      # kWs
    # print(f"Hace falta {kW} kW")
    #Si no, hay querecalcular el maximo de velocidad que se puede alcanzar en dicho punto
    neg = False
    vf_original = vf
    if kW > max_engine_power:  
        while kW > max_engine_power:
            vf -= v_decay 
            neg = True
            
            kW = vehicle_specific_power(vf, slope, 0, m, A)      # kWs
    # if neg:
    #     print(f"Se ha tenido que reducir a {vf}")
    # Si se puede incrementar o igualar la velocidad
    acc_distance = (math.pow(vf, 2) - math.pow(vo, 2)) / (2 * acc)
    # acc_duration = round((vf - vo) / acc)
    # 
    remaining_distance = section_distance

    tot_secs = 0
    bat_regen = 0

    l_speeds = []
    l_kw = []

    # print(f"{section_distance:4.1f} | acc={acc:2.1f} | vo= {vo:2.3f} | vf_orig= {vf_original:2.3f} | slope= {slope:2.4f}")
    if vf >= vo:    # Si hay un incremento o es igual
        if vf-0.1 <= vo:
            acc = 0
        # Mientras quede distancia o no se haya llegado a la velocidad final o maxima aceleracion
        while remaining_distance > 0 and instant_speed <= vf and acc > 0.05:
            # if kW > max_engine_power:   # Si lo supera, se produce una des-aceleracion hasta alcanzar una aceleración que sea factible
            kW = vehicle_specific_power(instant_speed, slope, acc, m, A)      # kWs
            while kW > max_engine_power:
                # if index >= 9:
                #     input("")
                acc -= acc_decay
                kW = vehicle_specific_power(instant_speed, slope, acc, m, A)      # kWs

            while kW < max_engine_power and vf < vf_original-0.1:
                vf = min(vf + v_decay*0.5,vf_original)
                kW = vehicle_specific_power(instant_speed, slope, acc, m, A)      # kWs

            # print("bucleee")
            # print(f"speed={instant_speed}, acc={acc}, rem_dist={remaining_distance}")
            acc_distance = (math.pow(instant_speed+acc, 2) - math.pow(instant_speed, 2)) / (2 * acc)

            remaining_distance -= acc_distance
            instant_speed += acc
            total_power += kW

            l_speeds.append(instant_speed)
            l_kw.append(kW)
    else:
        if vf < instant_speed -0.1:
            acc = -acc
        else: 
            acc = 0

        while remaining_distance > 0 and instant_speed >= vf and acc < 0:
            kW = vehicle_specific_power(instant_speed, slope, acc, m, A)      # kWs

            while kW > max_engine_power:
                acc -= acc_decay
                kW = vehicle_specific_power(instant_speed, slope, acc, m, A)      # kWs


            acc_distance = (math.pow(instant_speed+acc, 2) - math.pow(instant_speed, 2)) / (2 * acc)

            remaining_distance -= acc_distance
            instant_speed += acc
            total_power += kW

            tot_secs += 1

            l_speeds.append(instant_speed)
            l_kw.append(kW)
        #Si la vo > vf_original y ha habido deaceleración, comprobamos
        if vo > vf  and len(l_kw) > 1 and l_kw[0] - l_kw[-1] < 0:
            bat_regen = (l_kw[0] - l_kw[-1]) * tot_secs / 3600
            # print(f"La diferencia es de: {l_kw[0] - l_kw[-1]}")
        
    # Una vez ha terminado el proceso de aceleracion vemos simplemente si queda espacio por recorrer
    if remaining_distance > 0:
        t_remaining = remaining_distance / instant_speed
        kW = vehicle_specific_power(instant_speed, slope, 0, m, A)      # kWs
        total_power += t_remaining * kW
        tot_secs += t_remaining
        l_speeds += [instant_speed] * round(t_remaining)
        l_kw += [kW] * round(t_remaining)

    # bat_regen = bat_regen * tot_secs / 3600

    # dict_sections[(vo, vf, acc, index)] = [instant_speed, total_power/3600, l_kw, l_speeds, bat_regen]

    # key_set = set(dict_sections)

    return instant_speed, total_power/3600, l_kw, l_speeds, bat_regen



class HybridTruckProblem(Problem):

    """
    Hybrid Truck Problem representation
    """

    def __init__(self, route: Route, truck: Truck, slope_percent_limit : float = -800, population_size: int = 100000, process_id: int = 0, take_stops : bool  = True):
        super(HybridTruckProblem, self).__init__()
        self.process_id = process_id
        self.route = route
        self.truck = truck
        self.population_size = population_size

        self.number_of_sections = len(self.route.sections)
        
        self.slope_percent_limit = slope_percent_limit

        count = 0
        for section in self.route.sections:
            if section.slope_percent <= self.slope_percent_limit:
                count += 1

        self.l_segments_kwh = []

        self.number_of_objectives = 2

        count = 0
        evaluation_array = []

        # print(f"{len(self.route.sections)} - {len(solution.variables)}")
        for section in self.route.sections:
            # print(f"{section} ({section.slope_percent}) - {count}")
            if section.slope_percent > self.slope_percent_limit:
                count += 1
        self.number_of_constraints = 0

        self.number_of_variables = count
        # self.lower_bound = [0.0] * self.number_of_variables  # El mínimo porcentaje es 0%
        # self.upper_bound = [1.0] * self.number_of_variables  # El máximo porcentaje es 100%


        self.initial_solution = True
        self.epochs = 1
        self.evaluations = 0

        self.take_stops = take_stops

        self.obj_directions = [self.MINIMIZE, self.MINIMIZE]
        self.obj_labels = ["Green Kms Travelled", "Emitted Gases"]

    
    def evaluate(self, solution: BinarySolution) -> BinarySolution:

        if self.evaluations == self.population_size:
            self.epochs += 1
            self.evaluations = 0
        
        self.evaluations += 1
        count = 0
        evaluation_array = []

        print(self.evaluations)
        # print(f"{len(self.route.sections)} - {len(solution.variables)}")
        for section in self.route.sections:
            # print(f"{section} ({section.slope_percent}) - {count}")
            if section.slope_percent > self.slope_percent_limit:
                evaluation_array.append(solution.variables[count])
                count += 1
             # Si tiene una inclinación menor a -2% se hace siempre en eléctrico
            else:
                evaluation_array.append(1.0)
        """ VSP Model application in order to obtain the objectives"""
        total_emissions = 0
        green_kms = 0
        remaining_charge = self.truck.charge
        remaining_charges = []
        # green_zone_emissions = [0.0, 0.0, 0.0, 0.0]
        recharge = 0
        invalid = False

        l_emisiones = []
        l_greenKm = []
        l_kWh = []
        l_SOC = []
        l_recarga = []

        current_speed = 0

        for index,green_percent  in enumerate(evaluation_array):
            kW_h = 0
            section_emissions = 0
            section_distance = self.route.sections[index].distance
            
            # Si es una parada parte de 0 la velocidad
            if self.route.sections[index].stop_start == 1 and (self.take_stops or index == 0):
                current_speed = 0

            max_power = self.truck.EV_power if evaluation_array[index] else self.truck.ICE_power
            
            current_speed, kWh, _, _, bat_regen = section_power(current_speed, self.route.sections[index].speed, self.truck.acc, 
                                                                           self.route.sections[index].slope, self.route.sections[index].distance, 
                                                                           max_power, index, self.truck.weight, self.truck.frontal_section)
            
            l_kWh.append(kWh)


            if kWh < 0:
                gasoline_gallon_equivalent = 0
                remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
            else:
                remaining_charge = decrease_battery_charge(remaining_charge, bat_regen / self.truck.electric_engine_efficiency, self.truck.charge)
                if evaluation_array[index]:
                    remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
                else:
                    gasoline_gallon_equivalent = kWh / self.truck.fuel_engine_efficiency * 0.02635046113 # Conversion factor
                    section_emissions += gasoline_gallon_equivalent * 10.180 # Kgs of CO2 emissions
                    total_emissions += section_emissions
            
            l_recarga.append(bat_regen)
            l_SOC.append(remaining_charge)
            remaining_charges.append(remaining_charge)
            if evaluation_array[index]:
                green_kms += self.route.sections[index].distance
                l_emisiones.append(0)
                l_greenKm.append(self.route.sections[index].distance)
            else:
                l_emisiones.append(section_emissions)
                l_greenKm.append(0)

            if remaining_charge < 0:
                invalid = True

            # Si hay una parada, recargar la batería
            if (index + 1) >= len(self.route.sections) or (self.route.sections[index + 1].stop_start == 1 and self.take_stops):
                remaining_charge = self.truck.charge
        
        # Penalizing invalid solutions

        HybridTruckProblem.total_eval += 1
        if invalid:
            init = time.time()
            solution, green_kms, total_emissions, l_emisiones, l_greenKm, l_kWh, l_SOC, l_recarga = self.easy_repair_solution(solution, remaining_charges)
            # solution, green_kms, total_emissions = self.repair_solution(solution, remaining_charges)
            end = time.time()
            print(f"Tardo {end-init} s" )
        else:
            green_kms *= -1
            
                
        solution.objectives[0] = green_kms
        solution.objectives[1] = total_emissions

        solution.objectives[2] = l_emisiones
        solution.objectives[3] = l_greenKm  
        solution.objectives[4] = l_kWh
        solution.objectives[5] = l_SOC
        solution.objectives[6] = l_recarga

        # solution = self.__evaluate_constraints(solution)
        print(f"Se le asigna {green_kms} Km {total_emissions} KgCO2")
        return solution
    
    def evaluate_single(self, solution: BinarySolution) -> BinarySolution:

        # if self.evaluations == self.population_size:
        #     self.epochs += 1
        #     self.evaluations = 0
        
        # self.evaluations += 1
        count = 0
        evaluation_array = []

        # print(self.evaluations)
        # print(f"{len(self.route.sections)} - {len(solution.variables)}")
        for section in self.route.sections:
            # print(f"{section} ({section.slope_percent}) - {count}")
            if section.slope_percent > self.slope_percent_limit:
                evaluation_array.append(solution.variables[count])
                count += 1
             # Si tiene una inclinación menor a -2% se hace siempre en eléctrico
            else:
                evaluation_array.append(1.0)
        """ VSP Model application in order to obtain the objectives"""
        total_emissions = 0
        green_kms = 0
        remaining_charge = self.truck.charge
        remaining_charges = []
        # green_zone_emissions = [0.0, 0.0, 0.0, 0.0]
        recharge = 0
        invalid = False

        current_speed = 0
        l_emissions = []
        for index,green_percent  in enumerate(evaluation_array):
            kW_h = 0
            section_emissions = 0
            section_distance = self.route.sections[index].distance
            
            # Si es una parada parte de 0 la velocidad
            if self.route.sections[index].stop_start == 1 and (self.take_stops or index == 0):
                current_speed = 0

            max_power = self.truck.EV_power if evaluation_array[index] else self.truck.ICE_power

            current_speed, kWh, _, _, bat_regen = section_power(current_speed, self.route.sections[index].speed, self.truck.acc, 
                                                                           self.route.sections[index].slope, self.route.sections[index].distance, 
                                                                           max_power, index, self.truck.weight, self.truck.frontal_section)
                
            if kWh < 0:
                gasoline_gallon_equivalent = 0
                remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
            else:
                remaining_charge = decrease_battery_charge(remaining_charge, bat_regen / self.truck.electric_engine_efficiency, self.truck.charge)
                if evaluation_array[index]:
                    remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
                else:
                    gasoline_gallon_equivalent = kWh / self.truck.fuel_engine_efficiency * 0.02635046113 # Conversion factor
                    section_emissions += gasoline_gallon_equivalent * 10.180 # Kgs of CO2 emissions
                    total_emissions += section_emissions
            l_emissions.append(section_emissions)
            remaining_charges.append(remaining_charge)

            if evaluation_array[index]:
                green_kms += self.route.sections[index].distance

            if remaining_charge < 0:
                invalid = True

            # Si hay una parada, recargar la batería
            if (index + 1) >= len(self.route.sections) or (self.route.sections[index + 1].stop_start == 1 and self.take_stops):
                remaining_charge = self.truck.charge
        
        # Penalizing invalid solutions

        
        return solution, remaining_charges, l_emissions
        
    # def old_evaluate(self, solution: FloatSolution) -> FloatSolution:
    def manual_evaluate(self, solution: BinarySolution) -> BinarySolution:
        # if self.evaluations == self.population_size:
        #     self.epochs += 1
        #     self.evaluations = 0
        
        # self.evaluations += 1
        count = 0
        evaluation_array = []

        print(self.evaluations)
        # print(f"{len(self.route.sections)} - {len(solution.variables)}")
        for section in self.route.sections:
            # print(f"{section} ({section.slope_percent}) - {count}")
            if section.slope_percent > self.slope_percent_limit:
                evaluation_array.append(solution.variables[count])
                count += 1
             # Si tiene una inclinación menor a -2% se hace siempre en eléctrico
            else:
                evaluation_array.append(1.0)
        """ VSP Model application in order to obtain the objectives"""
        total_emissions = 0
        green_kms = 0
        remaining_charge = self.truck.charge
        remaining_charges = []
        # green_zone_emissions = [0.0, 0.0, 0.0, 0.0]
        recharge = 0
        invalid = False


        current_speed = 0
        l_emissions = []

        print(len(evaluation_array))
        for index,green_percent  in enumerate(evaluation_array):
            print(index)
            kW_h = 0
            section_emissions = 0
            section_distance = self.route.sections[index].distance
            
            # Si es una parada parte de 0 la velocidad
            if self.route.sections[index].stop_start == 1 and (self.take_stops or index == 0):
                current_speed = 0

            max_power = self.truck.EV_power if evaluation_array[index] else self.truck.ICE_power

            print(f"Variables: {solution.variables[index]} - {self.route.sections[index].speed} - {self.truck.acc} - {self.route.sections[index].slope} - {self.route.sections[index].distance} - {max_power} - {index} - {self.truck.weight} - {self.truck.frontal_section}")
            current_speed, kWh, _, _, bat_regen = section_power(current_speed, self.route.sections[index].speed, self.truck.acc, 
                                                                           self.route.sections[index].slope, self.route.sections[index].distance, 
                                                                           max_power, index, self.truck.weight, self.truck.frontal_section)
            
            print(f"Se ha calculado {kWh} kWh")
            if kWh < 0:
                gasoline_gallon_equivalent = 0
                remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
            else:
                remaining_charge = decrease_battery_charge(remaining_charge, bat_regen / self.truck.electric_engine_efficiency, self.truck.charge)
                if evaluation_array[index]:
                    remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
                else:
                    gasoline_gallon_equivalent = kWh / self.truck.fuel_engine_efficiency * 0.02635046113 # Conversion factor
                    section_emissions += gasoline_gallon_equivalent * 10.180 # Kgs of CO2 emissions
                    total_emissions += section_emissions
            l_emissions.append(section_emissions)
            remaining_charges.append(remaining_charge)

            if evaluation_array[index]:
                green_kms += self.route.sections[index].distance

            if remaining_charge < 0:
                invalid = True

            # Si hay una parada, recargar la batería
            if (index + 1) >= len(self.route.sections) or (self.route.sections[index + 1].stop_start == 1 and self.take_stops):
                remaining_charge = self.truck.charge

        # print(f"Tengo {green_kms} Km {total_emissions} KCO2")
        solution.objectives[0] = -green_kms
        solution.objectives[1] = total_emissions
        # print(remaining_charge)
        # solution = self.__evaluate_constraints(solution)
        
        negativo = False
        for v in remaining_charges:
            if v < 0:
                negativo = True

        if negativo:
            print("Manual-evaluate -> Ha consumido de mas")
        else:
            print("Manual-evaluate -> Bien consumo")

        return solution, remaining_charge, l_emissions
    
    index_g = 0
    total_eval = 0


    def easy_repair_solution(self, solution, remaining_charges):
        full_solution = []
        count = 0

        for section in self.route.sections:
                # Si tiene una inclinación menor a -1.5% se hace siempre en eléctrico
            if section.slope_percent > self.slope_percent_limit:
                full_solution.append(solution.variables[count])
                count += 1
            else:
                full_solution.append(True)
        
        indices = [i for i, value in enumerate(full_solution) if value]

        indices_kwh = np.argsort(self.l_segments_kwh)

        indices_kwh = [index for index in indices_kwh if index in indices]

        # print([self.l_segments_kwh[index] for index in indices_kwh])
                # Miro si remaining charge es negativo -> deshago el cambio
        curr_eliminar = len(indices_kwh) - 1
        negativo = True
        while negativo and curr_eliminar >= 0:
            # random_segment = random.choice(indices)  # Tomar un elemento aleatorio
            # indices.remove(random_segment)  # Eliminar el elemento del vector

            full_solution[indices_kwh[curr_eliminar]] = False
            total_emissions, green_kms, remaining_charges, l_emisiones_aux, l_greenKm_aux, l_kWh_aux, l_regen = self.simple_evaluate(full_solution)
            curr_eliminar -= 1
            negativo = False
            for v in remaining_charges:
                if v < 0:
                    negativo = True

        l_emisiones = []
        l_greenKm = []
        l_kWh = []
        l_SOC = remaining_charges
        l_recarga = l_regen
        
        count = 0
        for i, section in enumerate(self.route.sections):
            if section.slope_percent > self.slope_percent_limit:
                solution.variables[count] = full_solution[i]
                l_emisiones.append(l_emisiones_aux[i])
                l_greenKm.append(l_greenKm_aux[i])
                l_kWh.append(l_kWh_aux[i])
                count += 1


        print(f"El repair devuelve {-1*green_kms}")
        return solution, -1 * green_kms, total_emissions,  l_emisiones, l_greenKm, l_kWh, l_SOC, l_recarga

    def repair_solution(self, solution, remaining_charges):
        print(f"Hay que reparar {HybridTruckProblem.index_g}/{HybridTruckProblem.total_eval}")
        HybridTruckProblem.index_g += 1
        full_solution = []
        count = 0


        for section in self.route.sections:
                # Si tiene una inclinación menor a -2% se hace siempre en eléctrico
            if section.slope_percent > self.slope_percent_limit:
                full_solution.append(solution.variables[count])
                count += 1
            else:
                full_solution.append(True)

        a = [section.slope_percent for section in self.route.sections]
        indexes = np.argsort(a)[::-1]
        for index in indexes:
            if a[index]>self.slope_percent_limit and full_solution[index] > 0:
                if remaining_charges[index] < 0:
                    full_solution[index] = False
                    total_emissions, green_kms, remaining_charges= self.simple_evaluate(full_solution)
        total_emissions, green_kms, remaining_charges= self.simple_evaluate(full_solution)

        #print("{}:{}".format(green_kms, total_emissions))       
        slopes = [section.slope_percent for section in self.route.sections]
        indexes = np.argsort(slopes)
        for index in indexes:
            if self.route.sections[index].slope_percent > self.slope_percent_limit:
                full_solution[index] = True
                prev_emissions = copy.copy(total_emissions) 
                prev_green_kms = copy.copy(green_kms) 
                prev_remaining_charges = copy.copy(remaining_charges) 

                total_emissions, green_kms, remaining_charges = self.simple_evaluate(full_solution)
                # Miro si remaining charge es negativo -> deshago el cambio
                negativo = False
                for v in remaining_charges:
                    if v < 0:
                        negativo = True
                tries = 0
                if negativo :
                    full_solution[index] = False
                    total_emissions = prev_emissions
                    green_kms = prev_green_kms
                    remaining_charges = prev_remaining_charges
                    
        count = 0
        for i, section in enumerate(self.route.sections):
            if section.slope_percent > self.slope_percent_limit:
                solution.variables[count] = full_solution[i]
                count += 1

        print(f"El repair devuelve {-1*green_kms}")
        return solution, -1 * green_kms, total_emissions
    
    
    def simple_evaluate(self, sol : list):
        count = 0
        evaluation_array = []

        for section in self.route.sections:
            evaluation_array.append(sol[count])
            count += 1

        """ VSP Model application in order to obtain the objectives"""
        total_emissions = 0
        green_kms = 0
        remaining_charge = self.truck.charge
        remaining_charges = []
        current_speed = 0

        l_emisiones = []
        l_greenKm = []
        l_kWh = []
        l_regen = []
        print(evaluation_array)
        for index,green_percent  in enumerate(evaluation_array):
            kW_h = 0
            section_emissions = 0
            section_distance = self.route.sections[index].distance
            
            # Si es una parada parte de 0 la velocidad
            if self.route.sections[index].stop_start == 1 and (self.take_stops or index == 0):
                current_speed = 0

            max_power = self.truck.EV_power if evaluation_array[index] else self.truck.ICE_power
            # print(f"Hola {index} - {current_speed} {self.route.sections[index].speed} - {self.truck.acc} - {self.route.sections[index].slope} - {self.route.sections[index].distance} - {max_power} - {index} - {self.truck.weight} - {self.truck.frontal_section}")
            current_speed, kWh, _, _, bat_regen = section_power(current_speed, self.route.sections[index].speed, self.truck.acc, 
                                                                           self.route.sections[index].slope, self.route.sections[index].distance, 
                                                                           max_power,index, self.truck.weight, self.truck.frontal_section)
            l_regen.append(bat_regen)
            # print("Aja")
            l_kWh.append(kWh)
            if kWh < 0:
                gasoline_gallon_equivalent = 0
                remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
            else:
                remaining_charge = decrease_battery_charge(remaining_charge, bat_regen / self.truck.electric_engine_efficiency, self.truck.charge)
                if evaluation_array[index]:
                    remaining_charge = decrease_battery_charge(remaining_charge, kWh / self.truck.electric_engine_efficiency, self.truck.charge)
                else:
                    gasoline_gallon_equivalent = kWh / self.truck.fuel_engine_efficiency * 0.02635046113 # Conversion factor
                    section_emissions += gasoline_gallon_equivalent * 10.180 # Kgs of CO2 emissions
                    total_emissions += section_emissions
            
            
            if evaluation_array[index]:
                l_greenKm.append(self.route.sections[index].distance)
                l_emisiones.append(0)
                green_kms += self.route.sections[index].distance
            else:
                l_emisiones.append(section_emissions)
                l_greenKm.append(0)

            if remaining_charge < 0:
                invalid = True
            
            remaining_charges.append(remaining_charge)

            # Si hay una parada, recargar la batería
            if (index + 1) >= len(self.route.sections) or (self.route.sections[index + 1].stop_start == 1 and self.take_stops):
                remaining_charge = self.truck.charge
        
        return total_emissions, green_kms, remaining_charges,  l_emisiones, l_greenKm, l_kWh, l_regen


    def heuristic_individual(self,  modo_kgCO2_distancia : bool = 1):
        n_variables = 0
        for i, section in enumerate(self.route.sections):
            if section.slope_percent > self.slope_percent_limit:
                n_variables += 1

        reference_solution = BinarySolution(number_of_variables=n_variables, number_of_objectives=self.number_of_objectives)
        reference_solution.objectives.append([])
        reference_solution.objectives.append([])
        reference_solution.objectives.append([])
        reference_solution.objectives.append([])
        reference_solution.objectives.append([])

        sections = self.route.sections

        a = [section.slope_percent for section in sections]
        indexes = np.argsort(a)
        emissions = 10000
        green_kms = 0
        valid_solution = True
        # heurística
        # 0 - Inicializamos las zonas ZE obligatorias
        sol = [0] * len(sections)
        evaluation_array = []


        self.l_segments_kwh = []
        # 1.- Todos los tramos que tienen potencia negativa se hacne obligatoriamente en eléctrico
        for index in indexes:
            total_energy = vehicle_specific_power(
                    sections[index].speed, sections[index].slope,
                    0, self.truck.weight, self.truck.frontal_section)
            print(f"Variables: {sections[index].speed}, {sections[index].slope}, {0}, {self.truck.weight}, {self.truck.frontal_section}\n Total: {total_energy}")
            self.l_segments_kwh.append(total_energy)
            if total_energy < 0:
                sol[index] = True
                print("Hace el simple evaluate")
                emissions, green_kms, remainingCharge, l_emisiones_aux, l_greenKm_aux, l_kWh_aux, l_regen = self.simple_evaluate(sol)

                # Miro si remaining charge es negativo -> deshago el cambio
                negativo = False
                for v in remainingCharge:
                    if v < 0:
                        negativo = True
                if negativo:
                    sol[index] = False

        # print("Solución inicial tras fase 1:", sol)
        
        # 2.- todas las cuestas abajo por debajo de un umbral se hacen en eléctrico 
        for index in indexes:
            # print(a[index])
            if a[index] < self.slope_percent_limit and not sol[index]:
                sol[index] = True
                # print(config_slope_electric)
                emissions, green_kms, remainingCharge, l_emisiones_aux, l_greenKm_aux, l_kWh_aux, l_regen = self.simple_evaluate(sol)

                # Miro si remaining charge es negativo -> deshago el cambio
                negativo = False
                for v in remainingCharge:
                    if v < 0:
                        negativo = True
                        valid_solution = False
                        print("Pero es falso")
                if negativo:
                    sol[index] = False
        final_sol_array = []

        

        remainingCharge = []
        if valid_solution:
            # 3.- Dependiendo 
            #     1 -> Por valor KGCO2/Distancia
            #     2 -> Por orden ascendiente de pendiente
            #     3 -> De mayor a menor emisiones
            l_emissions_distance_section = []
            print("Empieza fase 3: activación por kgCO2/km")
            if modo_kgCO2_distancia == 1:
                print("Por aca :D")
                
                for index, section in enumerate(sections):
                    total_energy = vehicle_specific_power(
                            section.speed, section.slope,
                            0, self.truck.weight, self.truck.frontal_section) * section.seconds / 3600
                    gasoline_gallon_equivalent = total_energy / self.truck.fuel_engine_efficiency * 0.02635046113
                    total_emissions = gasoline_gallon_equivalent * 10.180
                    l_emissions_distance_section.append(total_emissions/section.distance)
                
                indexes_emissions = np.argsort(l_emissions_distance_section)

                reference_solution.variables = sol
                
                print("Se llama a manual inicialmente")
                self.manual_evaluate(reference_solution)
                print("Prueba con manual")

                for index in indexes_emissions:
                    if not sol[index]:
                        sol[index] = True
                        emissions, green_kms, remainingCharge, l_emisiones_aux, l_greenKm_aux, l_kWh_aux, l_regen = self.simple_evaluate(sol)

                        # Miro si remaining charge es negativo -> deshago el cambio
                        negativo = False
                        for v in remainingCharge:
                            if v < 0:
                                negativo = True
                        if negativo:
                            sol[index] = False
                            # print("Revierto")
                reference_solution.variables = sol
            elif modo_kgCO2_distancia == 2: # Por orden de pendientes
                # print("Por aca")
                for index in indexes:
                    if a[index]> self.slope_percent_limit and not sol[index] :
                        # Lo meto
                        sol[index] = True
                        emissions, green_kms, remainingCharge, l_emisiones_aux, l_greenKm_aux, l_kWh_aux, l_regen = self.simple_evaluate(sol)

                        # Miro si remaining charge es negativo -> deshago el cambio
                        negativo = False
                        for v in remainingCharge:
                            if v < 0:
                                negativo = True
                        if negativo:
                            sol[index] = False
                            # emissions, green_kms, remainingCharge, _ = self.simple_evaluate(sol)
            else: # Por numero de emisiones
                # print("Emisiones")
                l_emissions = []
                for index, section in enumerate(sections):

                    total_energy = vehicle_specific_power(
                            section.speed, section.slope,
                            0, self.truck.weight, self.truck.frontal_section) * section.seconds / 3600
                    gasoline_gallon_equivalent = total_energy / self.truck.fuel_engine_efficiency * 0.02635046113
                    total_emissions = gasoline_gallon_equivalent * 10.180
                    l_emissions.append(-total_emissions)
                
                indexes_emissions = np.argsort(l_emissions)

                for index in indexes_emissions:
                    if not sol[index]:
                        sol[index] = True
                        emissions, green_kms, remainingCharge, l_emisiones_aux, l_greenKm_aux, l_kWh_aux, l_regen = self.simple_evaluate(sol)

                        # Miro si remaining charge es negativo -> deshago el cambio
                        negativo = False
                        for v in remainingCharge:
                            if v < 0:
                                negativo = True
                        if negativo:
                            sol[index] = False
                            # print("Revierto")
            # emissions, green_kms, remainingCharge, _ = self.simple_evaluate(sol)

            final_sol_array = []
            for index, section in enumerate(sections):
                if section.slope_percent >= self.slope_percent_limit:
                    final_sol_array.append(sol[index])
            
            emissions, green_kms, remainingCharge, l_emisiones_aux, l_greenKm_aux, l_kWh_aux, l_regen = self.simple_evaluate(sol)

            negativo = False
            for v in remainingCharge:
                if v < 0:
                    negativo = True
            # print(final_sol_array)
            reference_solution.variables = final_sol_array

            print("Se llama a manual finalmente")
            self.manual_evaluate(reference_solution)
            print("Prueba con manual")
        # input("")
        return valid_solution, final_sol_array, emissions, green_kms, remainingCharge
    
    i_aux = 0
    def create_solution(self) -> BinarySolution:
        print("Se está creando una nueva solución")
        n_variables = 0
        for i, section in enumerate(self.route.sections):
            if section.slope_percent > self.slope_percent_limit:
                n_variables += 1

        new_solution = BinarySolution(number_of_variables= n_variables, number_of_objectives=self.number_of_objectives)
        new_solution.objectives.append([])
        new_solution.objectives.append([])
        new_solution.objectives.append([])
        new_solution.objectives.append([])
        new_solution.objectives.append([])
        count = 0
        if self.initial_solution:
            print("Con {} variables".format(n_variables))
            _, sample_solution, emissions, green_kms, _ = self.heuristic_individual()
            print("No termina")
            new_solution.variables = sample_solution
            self.initial_solution = False
        else:
            new_solution.variables = [bool(random.randint(0, 1)) for _ in range(self.number_of_sections)]

        # print(f"Creo {new_solution}")
        return new_solution
    
    def calculate_total_greenK(self):
        emissions = 0
        green_kms = 0
        for problem in self.problems:
            _, sample_solution, aux_emissions, aux_green_kms, _ = problem.heuristic_individual()
            emissions += aux_emissions
            green_kms += aux_green_kms
            print(sample_solution)
        
        print(f"{green_kms}, {emissions}")
        input()
    
    def get_name(self) -> str:
      return 'Hybrid Truck'
    
