from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from api.models import VehicleLocation, Alerts, User, AlertTypes, VehicleAssignment
from api.views import optimize_route, assign_alerts_to_vehicles
from config import FRONTEND_ROUTE_UPDATE_INTERVAL, FRONTEND_LOCATION_UPDATE_INTERVAL
import random
import json
import time

# Bangalore area boundaries
BANGALORE_BOUNDS = {
    'min_lat': 12.8500,  # South
    'max_lat': 13.0835,  # North
    'min_lng': 77.4800,  # West
    'max_lng': 77.7500   # East
}

def alert_map(request):
    """Render the alert map page with configuration values"""
    context = {
        'FRONTEND_ROUTE_UPDATE_INTERVAL': FRONTEND_ROUTE_UPDATE_INTERVAL,
        'FRONTEND_LOCATION_UPDATE_INTERVAL': FRONTEND_LOCATION_UPDATE_INTERVAL,
    }
    return render(request, 'app/alert_map.html', context)

@csrf_exempt
def generate_test_alerts(request):
    """Generate random test alerts across Bangalore"""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        # Get or create a test user
        test_user, created = User.objects.get_or_create(
            phone_num='9999999999',
            defaults={'user_name': 'Test User'}
        )
        
        # Generate 20 random alerts
        new_alerts = []
        for _ in range(20):
            # Random location within Bangalore bounds
            lat = random.uniform(BANGALORE_BOUNDS['min_lat'], BANGALORE_BOUNDS['max_lat'])
            lng = random.uniform(BANGALORE_BOUNDS['min_lng'], BANGALORE_BOUNDS['max_lng'])
            
            # Random alert type
            alert_type = random.choice(list(AlertTypes.choices))[0]
            
            alert = Alerts.objects.create(
                user=test_user,
                alert_type=alert_type,
                latitude=lat,
                longitude=lng
            )
            new_alerts.append({
                'id': alert.id,
                'type': alert.get_alert_type_display(),
                'lat': float(alert.latitude),
                'lng': float(alert.longitude)
            })
        
        # Trigger clustering after creating all alerts
        print("[DEBUG] Triggering alert clustering after test alert generation")
        assign_alerts_to_vehicles()
        
        return JsonResponse({
            "success": True,
            "message": "Generated 20 test alerts",
            "alerts": new_alerts
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

def get_vehicle_route(request, vehicle_id):
    """Get optimized route for a specific vehicle"""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        print(f"[DEBUG] Starting route calculation for vehicle {vehicle_id}")
        start_time = time.time()
        
        # Get only alerts assigned to this vehicle
        vehicle_assignments = VehicleAssignment.objects.filter(
            vehicle_id=vehicle_id,
            is_completed=False
        ).select_related('alert').order_by('sequence_number')
        
        if not vehicle_assignments:
            print(f"[DEBUG] No alerts assigned to vehicle {vehicle_id}")
            return JsonResponse({"route": []})
            
        assigned_alerts = [va.alert for va in vehicle_assignments]
        print(f"[DEBUG] Found {len(assigned_alerts)} alerts assigned to vehicle {vehicle_id}")
        
        # Get vehicle's route for its assigned alerts
        vehicle_route = optimize_route(vehicle_id, [alert.id for alert in assigned_alerts])
        
        end_time = time.time()
        print(f"[DEBUG] Route calculation completed in {end_time - start_time:.2f} seconds")
        
        return JsonResponse({
            "route": vehicle_route
        })
        
    except Exception as e:
        print(f"[ERROR] Failed to get vehicle route: {str(e)}")
        return JsonResponse({
            "error": str(e)
        }, status=500)