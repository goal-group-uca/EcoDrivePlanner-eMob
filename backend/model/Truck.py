class Truck:
    def __init__(self, identity, route, ICE_power = 190, EV_power = 115, acc = 0.5, charge = 90, weight = 27000, frontal_section = 7 , fuel_engine_efficiency = 0.5, electric_engine_efficiency = 0.9):
        """

        :param identity: identifies the truck
        :param route: the route assigned to the truck
        :param charge: the total available charge
        :param weight: the total weight of the truck
        :param fuel_engine_efficiency: efficiency of the fuel engine
        :param electric_engine_efficiency: efficiency of the electric engine
        """

        self.identity = identity
        self.route = route
        self.charge = charge
        self.weight = weight
        self.frontal_section = frontal_section
        self.fuel_engine_efficiency = fuel_engine_efficiency
        self.electric_engine_efficiency = electric_engine_efficiency
        self.ICE_power = ICE_power
        self.EV_power = EV_power
        self.acc = acc