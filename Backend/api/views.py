from django.shortcuts import render, HttpResponse, redirect
from django.http.response import HttpResponseNotAllowed, HttpResponseNotFound
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import time
import json
import requests
from typing import Dict, List, Tuple

from .models import *
from .utils import encrypt, decrypt
from config import ROUTE_OPTIMIZATION_INTERVAL
import numpy as np
from math import radians, sin, cos, sqrt, atan2

def root(request, type = None):
    if request.method != 'GET':
        return HttpResponseNotAllowed(permitted_methods=["GET"])
    data = {
        '': {
            'method': 'GET',
            'params': 'type',
            'response': 'Details of APIs',
        },
        'register-vehicle': {
            'method': 'POST',
            'body': {
                'registration': 'string',
                'latitude': 'decimal/float',
                'longitude': 'decimal/float'
            },
            'response': 'Unique token for vehicle',
        },
        'register-user': {
            'method': 'POST',
            'body': {
                'phone': 'string',
                'user_name': 'string/null'
            },
            'response': 'Unique token for user',
        },
        'update-location': {
            'method': 'PUT',
            'body': {
                'token': 'string',
                'latitude': 'decimal/float',
                'longitude': 'decimal/float'
            },
            'response': 'Status OK',
        },
        'user-alert': {
            'method': 'POST',
            'body': {
                'token': 'string',
                'latitude': 'decimal/float',
                'longitude': 'decimal/float'
            },
            'response': 'Status OK',
        },
        'delete-user-alert': {
            'method': 'POST',
            'body': {
                'token': 'string',
                'alert_id': 'int'
            },
            'response': 'Alert Deleted',
        },
        'get-alert-types': {
            'method': 'GET',
            'params': 'none',
            'response': 'JSON of all alert types',
        },
        'get-status': {
            'method': 'GET',
            'params': 'none',
            'response': 'JSON of all vehicles and alerts',
        },
        'get-image-of-alert': {
            'method': 'GET',
            'params': 'alert_id',
            'response': 'Uploaded image of alert if exists',
        },
        'get-optimized-routes': {
            'method': 'GET',
            'params': 'none',
            'response': 'Optimized routes for all vehicles',
        },
    }
    if type == "json":
        return json_response("API details",data)
    elif type:
        return HttpResponseNotFound()
    return render(request,"root.html",{'data':data})


# Hardcoded collection points (latitude, longitude)
COLLECTION_POINTS = [
    {"lat": 12.9716, "lng": 77.5946},  # Bangalore city
    {"lat": 13.0273, "lng": 77.6224},  # Koramangala
    {"lat": 12.9344, "lng": 77.6394},  # BTM
    {"lat": 12.9854, "lng": 77.7044},  # Marathahalli
    {"lat": 13.0457, "lng": 77.6514},  # Indiranagar
]

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the Haversine distance between two points on the earth.
    """
    R = 6371  # Earth's radius in kilometers

    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c

    return distance

def find_nearest_collection_point(lat: float, lng: float) -> Dict:
    """Find the nearest collection point to a given location"""
    min_distance = float('inf')
    nearest_point = None
    
    for point in COLLECTION_POINTS:
        dist = calculate_distance(lat, lng, point["lat"], point["lng"])
        if dist < min_distance:
            min_distance = dist
            nearest_point = point
            
    return nearest_point

def assign_alerts_to_vehicles() -> Dict[int, List[int]]:
    """
    Assign alerts to vehicles using k-means clustering with constraints
    """
    # Check if optimization is already running
    route_opt = RouteOptimization.get_instance()
    if route_opt.is_optimizing:
        print("[DEBUG] Route optimization already running")
        return {}
    
    try:
        # Mark optimization as running
        route_opt.is_optimizing = True
        route_opt.save()
        
        print("[DEBUG] Starting route calculation")
        start_time = time.time()
        
        # Get active vehicles and unassigned alerts
        vehicles = list(VehicleLocation.objects.filter(is_active=True))
        if not vehicles:
            print("[DEBUG] No active vehicles found")
            route_opt.is_optimizing = False
            route_opt.save()
            return {}
            
        # Get all unassigned active alerts
        alerts = list(Alerts.objects.filter(
            is_active=True,
            is_completed=False,
            vehicleassignment__isnull=True  # Only get alerts not assigned to any vehicle
        ))
        
        if not alerts:
            print("[DEBUG] No unassigned alerts found")
            route_opt.is_optimizing = False
            route_opt.save()
            return {}
            
        print(f"[DEBUG] Found {len(alerts)} unassigned alerts and {len(vehicles)} vehicles")
        
        # Convert coordinates to numpy arrays for vectorized operations
        vehicle_coords = np.array([[float(v.latitude), float(v.longitude)] for v in vehicles])
        alert_coords = np.array([[float(a.latitude), float(a.longitude)] for a in alerts])
        
        # Get current vehicle loads
        vehicle_loads = np.array([
            VehicleAssignment.objects.filter(vehicle=v, is_completed=False).count()
            for v in vehicles
        ])
        
        # Initialize centroids with vehicle positions
        centroids = vehicle_coords.copy()
        old_centroids = None
        max_iterations = 100
        iteration = 0
        
        # K-means clustering with constraints
        while iteration < max_iterations:
            # Calculate distances between all alerts and centroids
            distances = np.zeros((len(alerts), len(vehicles)))
            for i in range(len(alerts)):
                alert_point = alert_coords[i]
                for j in range(len(vehicles)):
                    centroid = centroids[j]
                    # Use Haversine distance
                    lat1, lon1 = np.radians(alert_point[0]), np.radians(alert_point[1])
                    lat2, lon2 = np.radians(centroid[0]), np.radians(centroid[1])
                    dlat = lat2 - lat1
                    dlon = lon2 - lon1
                    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
                    c = 2 * np.arcsin(np.sqrt(a))
                    distances[i, j] = 6371 * c  # Earth radius in km
            
            # Add load balancing factor
            load_factor = 0.5  # Adjust this to control balance vs. distance
            for j in range(len(vehicles)):
                distances[:, j] += vehicle_loads[j] * load_factor
            
            # Assign points to nearest centroid
            assignments = np.argmin(distances, axis=1)
            
            # Update centroids
            old_centroids = centroids.copy()
            for j in range(len(vehicles)):
                cluster_points = alert_coords[assignments == j]
                if len(cluster_points) > 0:
                    # Calculate weighted centroid
                    weights = 1 / (distances[assignments == j, j] + 1e-6)  # Avoid division by zero
                    weights = weights / np.sum(weights)
                    new_centroid = np.average(cluster_points, axis=0, weights=weights)
                    
                    # Limit centroid movement to maintain geographical cohesion
                    max_move = 0.02  # Maximum movement in degrees
                    move_vector = new_centroid - centroids[j]
                    move_dist = np.linalg.norm(move_vector)
                    if move_dist > max_move:
                        move_vector *= (max_move / move_dist)
                    centroids[j] = centroids[j] + move_vector
            
            # Check convergence
            if old_centroids is not None:
                diff = np.max(np.abs(centroids - old_centroids))
                if diff < 1e-6:
                    break
            
            iteration += 1
        
        print(f"[DEBUG] K-means converged after {iteration} iterations")
        
        # Convert assignments to dictionary format and save to database
        assignments_dict = {v.id: [] for v in vehicles}
        for i, vehicle_idx in enumerate(assignments):
            vehicle = vehicles[vehicle_idx]
            alert = alerts[i]
            
            # Get next sequence number for this vehicle
            next_seq = VehicleAssignment.objects.filter(
                vehicle=vehicle,
                is_completed=False
            ).count()
            
            # Create new assignment
            VehicleAssignment.objects.create(
                vehicle=vehicle,
                alert=alert,
                sequence_number=next_seq
            )
            
            assignments_dict[vehicle.id].append(alert.id)
            vehicle_loads[vehicle_idx] += 1
        
        print("[DEBUG] Alert distribution:")
        for vehicle_id, alert_ids in assignments_dict.items():
            print(f"Vehicle {vehicle_id}: {len(alert_ids)} alerts")
        
        # Update optimization timestamp
        route_opt.last_optimized = timezone.now()
        route_opt.is_optimizing = False
        route_opt.save()
        
        end_time = time.time()
        print(f"[DEBUG] Route calculation completed in {end_time - start_time:.2f} seconds")
        
        return assignments_dict
        
    except Exception as e:
        print(f"[ERROR] Route calculation failed: {str(e)}")
        route_opt.is_optimizing = False
        route_opt.save()
        return {}

def optimize_route(vehicle_id: int, alert_ids: List[int] = None) -> List[Dict]:
    """
    Get optimized route for a vehicle from database
    If alert_ids not provided, gets all active assignments
    """
    try:
        vehicle = VehicleLocation.objects.get(id=vehicle_id)
        
        # Get assignments from database if alert_ids not provided
        if alert_ids is None:
            assignments = VehicleAssignment.objects.filter(
                vehicle=vehicle,
                alert__is_active=True,
                is_completed=False
            ).order_by('sequence_number')
            alert_ids = [a.alert.id for a in assignments]
        
        if not alert_ids:
            return []
        
        alerts = list(Alerts.objects.filter(id__in=alert_ids))
        
        # Start with vehicle location
        current_lat = float(vehicle.latitude)
        current_lng = float(vehicle.longitude)
        
        # Get route in assignment sequence
        planned_route = [
            {
                "type": "vehicle_start",
                "lat": current_lat,
                "lng": current_lng,
            }
        ]
        
        for alert_id in alert_ids:
            alert = next(a for a in alerts if a.id == alert_id)
            planned_route.append({
                "type": "alert",
                "id": alert.id,
                "alert_type": AlertTypes(alert.alert_type).label,  # Use label from AlertTypes choices
                "lat": float(alert.latitude),
                "lng": float(alert.longitude),
            })
        
        # Add nearest collection point
        if planned_route:
            nearest_point = find_nearest_collection_point(
                float(planned_route[-1]["lat"]),
                float(planned_route[-1]["lng"])
            )
            planned_route.append({
                "type": "collection_point",
                "lat": nearest_point["lat"],
                "lng": nearest_point["lng"],
            })
        
        # Get actual road paths
        final_route = []
        for i in range(len(planned_route)):
            point = planned_route[i]
            final_point = point.copy()
            
            if i > 0:
                prev_point = planned_route[i-1]
                path, distance, instructions = get_road_path(
                    prev_point["lat"], prev_point["lng"],
                    point["lat"], point["lng"]
                )
                final_point["path"] = path
                final_point["instructions"] = instructions
            else:
                final_point["path"] = []
                final_point["instructions"] = []
                
            final_route.append(final_point)
        
        return final_route
        
    except Exception as e:
        print(f"Error optimizing route: {str(e)}")
        return []

def get_road_path(lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[List[List[float]], float, List[str]]:
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
        path = [{"lat": p[1], "lng": p[0]} for p in path]
        
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

def optimize_route_from_assignments(vehicle: VehicleLocation, assignments: List[VehicleAssignment]) -> List[Dict]:
    """
    Create a route from existing vehicle assignments
    This doesn't do any assignment calculation, just creates a route from assignments
    """
    try:
        # Start with vehicle location
        current_lat = float(vehicle.latitude)
        current_lng = float(vehicle.longitude)
        
        # Create route from assignments
        planned_route = [
            {
                "type": "vehicle_start",
                "lat": current_lat,
                "lng": current_lng,
            }
        ]
        
        # Add each assigned alert in sequence
        for assignment in assignments:
            alert = assignment.alert
            planned_route.append({
                "type": "alert",
                "id": alert.id,
                "alert_type": AlertTypes(alert.alert_type).label,
                "lat": float(alert.latitude),
                "lng": float(alert.longitude),
            })
        
        # Add nearest collection point
        if planned_route:
            nearest_point = find_nearest_collection_point(
                float(planned_route[-1]["lat"]),
                float(planned_route[-1]["lng"])
            )
            planned_route.append({
                "type": "collection_point",
                "lat": nearest_point["lat"],
                "lng": nearest_point["lng"],
            })
        
        # Get actual road paths - now with caching
        final_route = []
        for i in range(len(planned_route)):
            point = planned_route[i]
            final_point = point.copy()
            
            if i > 0:
                prev_point = planned_route[i-1]
                path, distance, instructions = get_road_path(
                    prev_point["lat"], prev_point["lng"],
                    point["lat"], point["lng"]
                )
                final_point["path"] = path
                final_point["instructions"] = instructions
            else:
                final_point["path"] = []
                final_point["instructions"] = []
                
            final_route.append(final_point)
        
        return final_route
        
    except Exception as e:
        print(f"Error creating route from assignments: {str(e)}")
        return []

def get_optimized_routes(request):
    """API endpoint to get optimized routes for all vehicles"""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        # Get vehicle_id from query params if provided
        vehicle_id = request.GET.get('vehicle_id')
        
        # First check if we need to recalculate routes
        route_opt = RouteOptimization.get_instance()
        time_since_last = timezone.now() - route_opt.last_optimized
        
        # Only recalculate if enough time has passed
        if time_since_last.total_seconds() >= ROUTE_OPTIMIZATION_INTERVAL and not route_opt.is_optimizing:
            # Calculate routes for all vehicles at once
            assign_alerts_to_vehicles()
        
        # If specific vehicle requested, return only its route
        if vehicle_id:
            try:
                vehicle = VehicleLocation.objects.get(id=vehicle_id)
                assignments = VehicleAssignment.objects.filter(
                    vehicle=vehicle,
                    alert__is_active=True,
                    is_completed=False
                ).order_by('sequence_number')
                
                if not assignments:
                    return JsonResponse({"success": True, "route": []})
                
                route = optimize_route_from_assignments(vehicle, assignments)
                return JsonResponse({"success": True, "route": route})
                
            except VehicleLocation.DoesNotExist:
                return JsonResponse({"error": "Vehicle not found"}, status=404)
        
        # Otherwise return routes for all vehicles
        routes = {}
        vehicles = VehicleLocation.objects.filter(is_active=True)
        for vehicle in vehicles:
            assignments = VehicleAssignment.objects.filter(
                vehicle=vehicle,
                alert__is_active=True,
                is_completed=False
            ).order_by('sequence_number')
            if assignments:
                routes[vehicle.id] = optimize_route_from_assignments(vehicle, assignments)
        
        return JsonResponse({
            "success": True,
            "routes": routes,
            "collection_points": COLLECTION_POINTS
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

def get_vehicle_route(request, vehicle_id):
    """Get the optimized route for a specific vehicle"""
    if request.method != 'GET':
        return HttpResponseNotAllowed(permitted_methods=["GET"])
    try:
        # Get vehicle and its current assignments
        vehicle = VehicleLocation.objects.get(id=vehicle_id)
        assignments = VehicleAssignment.objects.filter(
            vehicle=vehicle,
            alert__is_active=True,
            is_completed=False
        ).order_by('sequence_number')
        
        # Return empty route if no assignments
        if not assignments:
            return JsonResponse({"route": []})
            
        # Get optimized route for this vehicle's assignments
        route = optimize_route_from_assignments(vehicle, assignments)
        return JsonResponse({"route": route})
        
    except VehicleLocation.DoesNotExist:
        return JsonResponse({"error": "Vehicle not found"}, status=404)
    except Exception as e:
        print(f"[ERROR] Failed to get vehicle route: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

def get_collection_points(request):
    if request.method != 'GET':
        return HttpResponseNotAllowed(permitted_methods=["GET"])
    return JsonResponse(data={'collection_points': COLLECTION_POINTS}, safe=False)

def methodNotAllowed():
    return HttpResponse("Nothing")

def json_response(message: str, data: any, optional: any = None) -> str:
    response = {
        'message': message,
        'data': data
    }
    print(response)
    if optional:
        print(optional)
    return JsonResponse(response)


@csrf_exempt
def register_vehicle(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(permitted_methods=["POST"])
    
    body = json.loads(request.body)
    vehicle = VehicleLocation.objects.get(vehicle_registration = body.get("registration"))
    if not vehicle:
        vehicle = VehicleLocation()
    vehicle.vehicle_registration = body.get("registration")
    vehicle.latitude = body.get("latitude")
    vehicle.longitude = body.get("longitude")
    vehicle.save()
    vehicle.refresh_from_db()
    data = json.dumps({
        'id': vehicle.id,
        'reg_no': vehicle.vehicle_registration
    })
    print(data)
    enc_data = encrypt(data)
    return json_response("New vehicle is registered.", {'token':enc_data} )

@csrf_exempt
def register_user(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(permitted_methods=["POST"])
    body = json.loads(request.body)
    phone = body.get("phone_num")
    user_detail = User.objects.filter(phone_num = phone)
    if user_detail:
        user = user_detail[0]
    else:
        user = User()
        user.phone_num = str(phone)
        user_name = body.get('user_name')
        if user_name:
            user.user_name = user_name
        user.save()
        user.refresh_from_db()
    data = json.dumps({
        'id': user.id,
        'phone_num': user.phone_num
    })
    print(data)
    enc_data = encrypt(data)
    return json_response("User is registered.", {'token':enc_data} )

@csrf_exempt
def update_vehicle(request):
    if request.method != 'PUT':
        return HttpResponseNotAllowed(permitted_methods=["PUT"])
    body = json.loads(request.body)

    token = body.get("token")
    try:
        dec_data = json.loads(decrypt(token))
    except Exception as e:
        print("ERROR:",e)
        return json_response("Error occured",'Invalid token')
    
    if 'id' not in dec_data or 'reg_no' not in dec_data:
        return json_response("Error occured",'Invalid token')
    
    vehicle = VehicleLocation.objects.get(id = dec_data['id'])
    if dec_data['reg_no'] != vehicle.vehicle_registration:
        print(dec_data['reg_no'],vehicle.vehicle_registration, sep="\n")
        return json_response("Error occured",'Vehicle registration do not match')

    record = RecordedData(item=vehicle)         #  To save the instance of the data for future use.
    vehicle.latitude = body.get("latitude")
    vehicle.longitude = body.get("longitude")
    vehicle.save()
    record.save()
    return redirect("get-vehicle-route", vehicle.id)

def get_alert_types(request):
    if request.method != 'GET':
        return HttpResponseNotAllowed(permitted_methods=["GET"])
    
    # Get the choices from the AlertTypes class
    alert_types = AlertTypes.choices  # This will give you the choices defined in IntegerChoices
    data = [
        {
            'id': alert_type[0],  # The value of the choice
            'name': alert_type[1],  # The display name of the choice
        } for alert_type in alert_types
    ]
    return JsonResponse(data={'alert_types': data}, safe=False)

@csrf_exempt
def user_alert(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(permitted_methods=["POST"])
    body = request.POST

    token = body.get("token")
    try:
        dec_data = json.loads(decrypt(token))
    except Exception as e:
        print("ERROR:",e)
        return json_response("Error occured",'Invalid token')
    
    if 'id' not in dec_data or 'phone_num' not in dec_data:
        return json_response("Error occured",'Invalid token')
    
    user = User.objects.get(id = dec_data['id'])
    if dec_data['phone_num'] != user.phone_num:
        print(dec_data['phone_num'], user.phone_num, sep="\n")
        return json_response("Error occured",'User data mismatch')

    alert = Alerts()
    alert.user = user
    alert.alert_type = int(body.get("alert_type"))
    alert.latitude = body.get("latitude")
    alert.longitude = body.get("longitude")
    print(alert.__repr__())
    if 'image' in request.FILES:
        alert.image = request.FILES['image']

    alert.save()
    record = RecordedData(item=alert)         #  To save the instance of the data for future use.
    record.save()

    # Trigger clustering after creating a new alert
    print("[DEBUG] Triggering alert clustering after new alert creation")
    assign_alerts_to_vehicles()

    return json_response("Location Updated.", "OK", [alert.id, alert.get_alert_type_display(), alert.latitude, alert.longitude])

@csrf_exempt
def delete_user_alert(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(permitted_methods=["POST"])
    body = json.loads(request.body)
    print(body)

    token = body.get("token")
    alert_id = body.get("alert_id")

    # Validate input
    if not token or not alert_id:
        return json_response("Error occurred", 'Missing token or alert_id')

    try:
        dec_data = json.loads(decrypt(token))
    except Exception as e:
        print("ERROR:", e)
        return json_response("Error occurred", 'Invalid token')
    
    if 'id' not in dec_data or 'phone_num' not in dec_data:
        return json_response("Error occurred", 'Invalid token')
    
    try:
        user = User.objects.get(id=dec_data['id'])
        if dec_data['phone_num'] != user.phone_num:
            print(dec_data['phone_num'], user.phone_num, sep="\n")
            return json_response("Error occurred", 'User data mismatch')

        # Find the alert
        try:
            alert = Alerts.objects.get(id=alert_id, user=user)
        except Alerts.DoesNotExist:
            return json_response("Error occurred", 'Alert not found or not owned by user')

        # Delete the alert
        alert.delete()

        return json_response("Success", "Alert Deleted Successfully.", [alert_id])

    except User.DoesNotExist:
        return json_response("Error occurred", 'User not found')
    except Exception as e:
        print("ERROR:", e)
        return json_response("Error occurred", 'Deletion failed')

def get_status(request):
    if request.method != 'GET':
        return HttpResponseNotAllowed(permitted_methods=["GET"])
    
    # Create a test vehicle if none exist
    vehicles = VehicleLocation.objects.filter(is_active=True)
    if not vehicles:
        test_vehicle = VehicleLocation.objects.create(
            vehicle_registration="KA01HH1234",
            latitude=12.9716,  # Bangalore city center
            longitude=77.5946
        )
        vehicles = [test_vehicle]
    
    vehicle_data = [
        {
            'id': vehicle.id,
            'vehicle_registration': vehicle.vehicle_registration,
            'latitude': vehicle.latitude,
            'longitude': vehicle.longitude,
        } for vehicle in vehicles
    ]
    
    alerts = Alerts.objects.all()
    alert_data = [
        {
            'id': alert.id,
            'user_name': alert.user.user_name if alert.user.user_name else None,
            'alert_type': alert.get_alert_type_display(),  # Get display name instead of code
            'latitude': alert.latitude,
            'longitude': alert.longitude,
        } for alert in alerts
    ]
    
    return JsonResponse(data={'vehicles': vehicle_data, 'alerts': alert_data }, safe=False)

def get_image_of_alert(request, alert_id):
    if request.method != 'GET':
        return HttpResponseNotAllowed(permitted_methods=["GET"])
    try:
        alert = Alerts.objects.get(id=alert_id)
        if alert.image:
            return HttpResponse(alert.image, content_type="image/jpeg")
        else:
            return HttpResponseNotFound()
    except Alerts.DoesNotExist:
        return HttpResponseNotFound()
