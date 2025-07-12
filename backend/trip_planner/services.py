# trip_planner/services.py
import requests
import datetime
from django.conf import settings

# --- HOS Rules Constants ---
# All times in minutes
MAX_DRIVING_TIME_PER_DAY = 11 * 60
MAX_ON_DUTY_TIME_PER_SHIFT = 14 * 60
REQUIRED_BREAK_AFTER_DRIVING = 30 # 30-min break after 8 hours of driving
DRIVING_HOURS_BEFORE_BREAK = 8 * 60
REQUIRED_OFF_DUTY_PER_DAY = 10 * 60 # 10-hour reset
PICKUP_DROPPOFF_TIME = 30 # 1 hour total for both
FUELING_TIME = 30 # 30 minutes
PRE_TRIP_INSPECTION_TIME = 15
POST_TRIP_INSPECTION_TIME = 15
MAX_DISTANCE_BEFORE_FUEL_STOP = 1000 * 1.60934 # 1000 miles in km

# Duty Statuses
OFF_DUTY = "Off Duty"
SLEEPER_BERTH = "Sleeper Berth"
DRIVING = "Driving"
ON_DUTY_NOT_DRIVING = "On Duty (Not Driving)"

class TripSimulator:
    def __init__(self, start_location, pickup_location, dropoff_location, cycle_used_hours):
        self.locations = {
            "start": start_location,
            "pickup": pickup_location,
            "dropoff": dropoff_location,
        }
        self.cycle_time_remaining = (70 * 60) - (cycle_used_hours * 60) # in minutes
        
        self.events = []
        self.current_coords = None
        self.stop_markers = []
        self.current_time = datetime.datetime.now().replace(second=0, microsecond=0)
        self.daily_driving_time = 0
        self.daily_on_duty_time = 0
        self.drive_time_since_break = 0
        self.distance_since_fuel_stop_km = 0
        
        
        self.route_details = {}


    def _add_event(self, status, duration_minutes, remarks=""):
        start_time = self.current_time
        end_time = start_time + datetime.timedelta(minutes=duration_minutes)
        
        self.events.append({
            "status": status,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration_minutes,
            "remarks": remarks
        })




         
        # If this event is a stop (not driving) and has a location, add a marker.
        if status != DRIVING and self.current_coords:
            # We identify stops by keywords in their remarks.
            stop_keywords = ["Break", "Reset", "Fuel Stop", "Inspection", "Pickup", "Dropoff"]
            if any(keyword in remarks for keyword in stop_keywords):
                self.stop_markers.append({
                    "coords": self.current_coords,
                    "remark": remarks,
                    "time": self.current_time.isoformat()
                })
        


        self.current_time = end_time

        # Update cycle time for on-duty statuses
        if status in [DRIVING, ON_DUTY_NOT_DRIVING]:
            self.cycle_time_remaining -= duration_minutes
            self.daily_on_duty_time += duration_minutes
        
        # Update driving timers
        if status == DRIVING:
            self.daily_driving_time += duration_minutes
            self.drive_time_since_break += duration_minutes
        
        # Reset break timer if a valid break is taken
        if status in [OFF_DUTY, SLEEPER_BERTH] and duration_minutes >= REQUIRED_BREAK_AFTER_DRIVING:
            self.drive_time_since_break = 0

        # Check for 10-hour reset
        if status in [OFF_DUTY, SLEEPER_BERTH] and duration_minutes >= REQUIRED_OFF_DUTY_PER_DAY:
            self.daily_driving_time = 0
            self.daily_on_duty_time = 0

    def _get_route_info(self, start_coords, end_coords):
        headers = { 'Authorization': settings.ORS_API_KEY }
        params = {
            'start': f"{start_coords[0]},{start_coords[1]}",
            'end': f"{end_coords[0]},{end_coords[1]}"
        }
        # Using car profile as a proxy for truck speed
        response = requests.get(f"https://api.openrouteservice.org/v2/directions/driving-car", headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        summary = data['features'][0]['properties']['summary']
        geometry = data['features'][0]['geometry']['coordinates']
        
        return {
            "duration_minutes": round(summary['duration'] / 60),
            "distance_km": summary['distance'] / 1000,
            "geometry": geometry # For map drawing
        }

    def _get_coords(self, location_name):
        headers = { 'Authorization': settings.ORS_API_KEY }
        params = { 'text': location_name, 'size': 1 }
        response = requests.get("https://api.openrouteservice.org/geocode/search", headers=headers, params=params)
        response.raise_for_status()
        coords = response.json()['features'][0]['geometry']['coordinates']
        return coords # [longitude, latitude]

    def _simulate_drive(self, drive_duration_minutes, drive_distance_km, leg_name, leg_geometry):
        remaining_drive_time = drive_duration_minutes
        time_driven_this_leg = 0
        
        while remaining_drive_time > 0:
            # Check if cycle time is exhausted
            if self.cycle_time_remaining <= 0:
                raise Exception("Trip not possible. 70-hour cycle limit reached.")

            # Calculate max possible drive time in this chunk
            drive_chunk = min(
                remaining_drive_time,
                MAX_DRIVING_TIME_PER_DAY - self.daily_driving_time,
                MAX_ON_DUTY_TIME_PER_SHIFT - self.daily_on_duty_time,
                DRIVING_HOURS_BEFORE_BREAK - self.drive_time_since_break,
                self.cycle_time_remaining
            )

            if drive_chunk <= 0:
                 # Must take a break.
                 # 1. Is it a 14-hour or 11-hour limit? Need a 10-hour reset.
                if self.daily_on_duty_time >= MAX_ON_DUTY_TIME_PER_SHIFT or self.daily_driving_time >= MAX_DRIVING_TIME_PER_DAY:
                    self._add_event(SLEEPER_BERTH, REQUIRED_OFF_DUTY_PER_DAY, "Daily Limit Reset")
                # 2. Is it the 8-hour driving limit? Need a 30-min break.
                elif self.drive_time_since_break >= DRIVING_HOURS_BEFORE_BREAK:
                    self._add_event(OFF_DUTY, REQUIRED_BREAK_AFTER_DRIVING, "30-Min Break")
                continue

            # Add the driving event
            self._add_event(DRIVING, drive_chunk, f"Driving to {leg_name}")

           
            time_driven_this_leg += drive_chunk
            # Calculate progress percentage along this leg's geometry
            progress_percentage = min(time_driven_this_leg / drive_duration_minutes, 1.0)
            # Find the corresponding point in the geometry array
            geometry_index = int((len(leg_geometry) - 1) * progress_percentage)
            self.current_coords = leg_geometry[geometry_index]
           
            
            # Update distance and check for fuel stop
            distance_this_chunk = (drive_chunk / drive_duration_minutes) * drive_distance_km
            self.distance_since_fuel_stop_km += distance_this_chunk
            if self.distance_since_fuel_stop_km >= MAX_DISTANCE_BEFORE_FUEL_STOP:
                self._add_event(ON_DUTY_NOT_DRIVING, FUELING_TIME, "Fuel Stop")
                self.distance_since_fuel_stop_km = 0
            
            remaining_drive_time -= drive_chunk
            

    def run_simulation(self):
        try:
            # 1. Geocode all locations
            start_coords = self._get_coords(self.locations['start'])
            self.current_coords = start_coords # Set initial position
            pickup_coords = self._get_coords(self.locations['pickup'])
            dropoff_coords = self._get_coords(self.locations['dropoff'])
            
            # 2. Get route info for both legs
            leg1_info = self._get_route_info(start_coords, pickup_coords)
            leg2_info = self._get_route_info(pickup_coords, dropoff_coords)
            
         

            # 3. Start Simulation
            self._add_event(ON_DUTY_NOT_DRIVING, PRE_TRIP_INSPECTION_TIME, "Pre-Trip Inspection")
            
            # 4. Drive to Pickup
            self._simulate_drive(leg1_info['duration_minutes'], leg1_info['distance_km'], self.locations['pickup'], leg1_info['geometry'])
            
            # 5. At Pickup
            self._add_event(ON_DUTY_NOT_DRIVING, PICKUP_DROPPOFF_TIME, f"Pickup at {self.locations['pickup']}")

            # 6. Drive to Dropoff
            self._simulate_drive(leg2_info['duration_minutes'], leg2_info['distance_km'], self.locations['dropoff'], leg2_info['geometry'])

            # 7. At Dropoff
            self._add_event(ON_DUTY_NOT_DRIVING, PICKUP_DROPPOFF_TIME, f"Dropoff at {self.locations['dropoff']}")

            # 8. Post-trip inspection
            self._add_event(ON_DUTY_NOT_DRIVING, POST_TRIP_INSPECTION_TIME, "Post-Trip Inspection")
            
            # 9. Final Off-duty period to end the log cleanly
            self._add_event(OFF_DUTY, 60, "End of Trip")


            self.route_details = {
                "start_coords": start_coords,
                "pickup_coords": pickup_coords,
                "dropoff_coords": dropoff_coords,
                "leg1_geometry": leg1_info['geometry'],
                "leg2_geometry": leg2_info['geometry'],
                "stops": self.stop_markers 
            }


            return self._format_output()

        except requests.exceptions.RequestException as e:
            return {"error": f"API Error: Could not get route information. {e}"}
        except Exception as e:
            return {"error": str(e)}

    def _format_output(self):
        # Group events by day
        logs_by_day = {}
        for event in self.events:
            day_key = event['start_time'].date()
            if day_key not in logs_by_day:
                logs_by_day[day_key] = {
                    "date": day_key.strftime("%m-%d-%Y"),
                    "events": [],
                    "totals": { OFF_DUTY: 0, SLEEPER_BERTH: 0, DRIVING: 0, ON_DUTY_NOT_DRIVING: 0 }
                }

            # Calculate how much of the event falls on this day
            event_start_midnight = datetime.datetime.combine(day_key, datetime.time.min)
            start_offset_minutes = (event['start_time'] - event_start_midnight).total_seconds() / 60
            
            logs_by_day[day_key]['events'].append({
                "status": event['status'],
                "start_minutes": start_offset_minutes, # minutes from midnight
                "duration_minutes": event['duration'],
                "remarks": event['remarks'],
            })
            logs_by_day[day_key]['totals'][event['status']] += event['duration']

        # Convert totals to hours
        formatted_days = []
        for day, data in logs_by_day.items():
            for status, minutes in data['totals'].items():
                data['totals'][status] = round(minutes / 60, 2)
            formatted_days.append(data)
            
        return {
            "daily_logs": formatted_days,
            "route_info": self.route_details
        }