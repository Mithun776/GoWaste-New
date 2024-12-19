from django.urls import path
from django.views.generic import RedirectView
from .views import alert_map, generate_test_alerts, get_vehicle_route

urlpatterns = [
    path('alert-map/', alert_map, name='alert-map'),
    path('generate-test-alerts/', generate_test_alerts, name='generate-test-alerts'),
    path('get-vehicle-route/<int:vehicle_id>/', get_vehicle_route, name='get-vehicle-route'),
    path('', RedirectView.as_view(url='/alert-map/', permanent=True)),  # Redirect root to alert-map
]