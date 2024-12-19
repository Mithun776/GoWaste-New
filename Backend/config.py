# Time intervals in seconds
ROUTE_OPTIMIZATION_INTERVAL = 60   # How often to run route optimization
LOCATION_UPDATE_INTERVAL = 5      # How often to update vehicle locations
ALERT_CLEANUP_INTERVAL = 60*60     # How often to clean up completed alerts (1 hour)

# Frontend intervals in milliseconds (same as backend but in ms)
FRONTEND_ROUTE_UPDATE_INTERVAL = 5000  # 5 seconds
FRONTEND_LOCATION_UPDATE_INTERVAL = LOCATION_UPDATE_INTERVAL * 1000
