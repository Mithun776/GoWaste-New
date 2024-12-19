from django.urls import path
from .views import root, register_vehicle, register_user, update_vehicle, user_alert
from .views import get_alert_types, get_status, get_image_of_alert, get_optimized_routes

urlpatterns = [
    path('', root, name="api-root"),
    path('<type>', root, name="api-root"),
    path('register-vehicle/', register_vehicle, name="register-vehicle"),
    path('register-user/', register_user, name="register-user"),
    path('update-location/', update_vehicle, name="update-location"),
    path('user-alert/', user_alert, name="user-alert"),
    path('get-alert-types/', get_alert_types, name="get-alert-types"),
    path('get-status/', get_status, name="get-status"),
    path('get-image-of-alert/<int:alert_id>/', get_image_of_alert, name="get-image-of-alert"),
    path('get-optimized-routes/', get_optimized_routes, name="get-optimized-routes"),
]