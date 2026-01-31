class Section:
    def __init__(self, identity, speed, slope, slope_percent, distance, seconds, acceleration, stop_start):
        """
        Class representing a section of the bus route

        :param identity: identifies the section
        :param speed: average speed of the section in km/h
        :param slope: terrain grade of inclination
        :param distance: distance in kms of the section
        :param seconds: seconds needed to complete the section
        :param acceleration: acceleration of the section in m/s²
        :param bus_stop: determine if the sections starts on a bus stop
        :param green_zone: determine if the section pass through a green area
        """
        self.identity = identity
        self.speed = speed
        self.slope = slope
        self.slope_percent = slope_percent
        self.distance = distance
        self.seconds = seconds
        self.acceleration = acceleration
        self.stop_start = stop_start
