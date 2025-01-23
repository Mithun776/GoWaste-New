import tkinter as tk
import requests
import tkintermapview
import os
from dotenv import load_dotenv, set_key
# pip3 install gpsd-py3    #### To install the gpsd library for output only
import gpsd

# Load environment variables from .env file
load_dotenv(dotenv_path='1.env')

ADDRESS = os.getenv("ADDRESS")
gpsd.connect()

def get_road_path(lat1: float, lon1: float, lat2: float, lon2: float):
        """Get road path between two points using OSRM"""
        cache_key = f"{lat1},{lon1}-{lat2},{lon2}"
        
        # Check if path is already cached
        if hasattr(get_road_path, 'cache') and cache_key in get_road_path.cache:
            return get_road_path.cache[cache_key]
        
        try:
            # Initialize cache if not exists
            if not hasattr(get_road_path, 'cache'):
                get_road_path.cache = {}
            
            url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&annotations=true&geometries=geojson"
            response = requests.get(url)
            data = response.json()
            
            if data["code"] != "Ok":
                return [], 0, []
                
            route = data["routes"][0]
            path = route["geometry"]["coordinates"]
            # Convert [lon, lat] to {lat, lng} objects for leaflet
            path = [(float(p[1]), float(p[0])) for p in path]
            
            distance = route["distance"] / 1000  # Convert to km
            
            # Get turn-by-turn instructions
            steps = route["legs"][0]["steps"]
            instructions = [step.get("maneuver", {}).get("instruction", "") for step in steps]
            
            # Cache the result
            result = (path, distance, instructions)
            get_road_path.cache[cache_key] = result
            
            return result
        except Exception as e:
            print(f"Error getting road path: {str(e)}")
            return [], 0, []

class VehicleTrackerApp:
    def __init__(self, master):
        self.master = master
        master.title("Vehicle Tracker")
        # Make window fullscreen
        master.attributes('-fullscreen', True)

        self.vehicle_token = os.getenv('VEHICLE_TOKEN')
        if not self.vehicle_token:
            self.show_registration_gui()  # Show registration GUI if token not found
        else:
            self.show_main_gui()  # Show main GUI if token is found

    def show_registration_gui(self):
        # Registration fields
        self.label = tk.Label(self.master, text="Vehicle Registration")
        self.label.pack()

        self.registration_entry = tk.Entry(self.master)
        self.registration_entry.pack()

        #self.latitude_entry = tk.Entry(self.master)
        #self.latitude_entry.pack()
        #self.latitude_entry.insert(0, "Latitude")

        #self.longitude_entry = tk.Entry(self.master)
        #self.longitude_entry.pack()
        #self.longitude_entry.insert(0, "Longitude")

        self.register_button = tk.Button(self.master, text="Register Vehicle", command=self.register_vehicle)
        self.register_button.pack()

        self.route_label = tk.Label(self.master)
        self.route_label.pack()
    
    def show_main_gui(self):
        # Create a map widget that fills the screen
        screen_width = self.master.winfo_screenwidth()
        screen_height = self.master.winfo_screenheight()
        
        self.map_widget = tkintermapview.TkinterMapView(self.master, width=screen_width, height=screen_height-50, corner_radius=0)
        self.map_widget.pack(pady=5)

        # Create a frame for buttons at the bottom
        button_frame = tk.Frame(self.master)
        button_frame.pack(side=tk.BOTTOM, pady=5)

        # Add buttons to the frame
        self.refresh_button = tk.Button(button_frame, text="Refresh Map", command=self.update_location)
        self.refresh_button.pack(side=tk.LEFT, padx=5)
        
        self.center_button = tk.Button(button_frame, text="Center Map", command=self.center_map)
        self.center_button.pack(side=tk.LEFT, padx=5)

        # Add exit fullscreen button
        self.exit_button = tk.Button(button_frame, text="Exit Fullscreen", command=lambda: self.master.attributes('-fullscreen', False))
        self.exit_button.pack(side=tk.LEFT, padx=5)

        # Center the map on the initial coordinates
        latitude, longitude = gpsd.get_current().position()
        print(latitude)
        self.map_widget.set_position(float(latitude), float(longitude))
        self.map_widget.set_zoom(13)

        # Start updating location
        self.update_location()

    def register_vehicle(self):
        registration = self.registration_entry.get()
        latitude, longitude = gpsd.get_current().position()
        
        # Send a POST request to register the vehicle
        response = requests.post(f'http://{ADDRESS}/register-vehicle//', json={
            'registration': registration,
            'latitude': latitude,
            'longitude': longitude
        })
        
        if response.status_code == 200:
            data = response.json()
            self.vehicle_token = data.get('data').get('token')
            set_key('.env', 'VEHICLE_TOKEN', self.vehicle_token)
            
            # Clear registration GUI elements
            self.label.destroy()
            self.registration_entry.destroy()
            #self.latitude_entry.destroy()
            #self.longitude_entry.destroy()
            self.register_button.destroy()
            self.route_label.destroy()
            
            # Show main GUI
            self.show_main_gui()
        else:
            self.route_label.config(text='Registration failed! Please try again.');
    
    def center_map(self):
        # Center the map on the first coordinate
        latitude, longitude = gpsd.get_current().position()
        self.map_widget.set_position(float(latitude), float(longitude), zoom=13)

    def update_location(self):
        # Retrieve the token and current location
        token = self.vehicle_token  # Assuming vehicle_token is stored after registration
        latitude, longitude = gpsd.get_current().position()
        
        # Send a PUT request to update the vehicle's location
        response = requests.put(f'http://{ADDRESS}/update-location//', json={
            'token': token,
            'latitude': latitude,
            'longitude': longitude
        })

        if response.status_code == 200:
            route_data = response.json()
            # Extract coordinates for the route
            route_coordinates = [(point['lat'], point['lng']) for point in route_data.get("route", [])]
            
            # Clear previous markers and lines
            self.map_widget.delete_all_marker()  # Clear previous markers if needed
            self.map_widget.delete_all_path()  # Clear previous polygons if needed

            # Update the map with the route
            if route_coordinates:
                # Set markers for each route point
                for coord in route_coordinates[1:]:
                    self.map_widget.set_marker(coord[0], coord[1], text="Route Point")
                    previous_coord = route_coordinates[route_coordinates.index(coord) - 1]
                    path = get_road_path(previous_coord[0], previous_coord[1], coord[0], coord[1])
                    self.map_widget.set_path(path[0])  # Set the path for the current point

            # Set a marker for the current location
            self.map_widget.set_marker(float(latitude), float(longitude), text="Current Location")

            print('Location updated successfully!')
        else:
            print('Failed to update location!')
        
        # Call this method again after 3 seconds
        self.master.after(3000, self.update_location)  # Schedule the next update

    def display_map_image(self, image_path):
        # Load the image using PIL
        img = Image.open(image_path)
        img = img.resize((600, 400), Image.ANTIALIAS)  # Resize image to fit in the window

        # Convert to PhotoImage
        self.map_image = ImageTk.PhotoImage(img)

        # Create a label to display the image
        if hasattr(self, 'map_label'):
            self.map_label.config(image=self.map_image)  # Update existing label
        else:
            self.map_label = tk.Label(self.master, image=self.map_image)
            self.map_label.pack()

if __name__ == "__main__":
    root = tk.Tk()
    app = VehicleTrackerApp(root)
    root.mainloop()
