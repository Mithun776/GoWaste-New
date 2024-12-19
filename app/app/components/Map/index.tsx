import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { API_URL } from '@/constants';

const BENGALURU_COORDINATES = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const ROUTE_UPDATE_INTERVAL = 30000; // 30 seconds
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds

export const Map = () => {
  const [markers, setMarkers] = useState([]);
  const [routes, setRoutes] = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`${API_URL}/locations/`);
        const data = await response.json();
        setMarkers(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
    const locationInterval = setInterval(fetchLocations, LOCATION_UPDATE_INTERVAL);

    return () => clearInterval(locationInterval);
  }, []);

  const fetchVehicleRoute = async (vehicleId) => {
    try {
      const response = await fetch(`${API_URL}/get-vehicle-route/${vehicleId}/`);
      const data = await response.json();
      setRoutes(prev => ({
        ...prev,
        [vehicleId]: data
      }));
      setSelectedVehicle(vehicleId);
    } catch (error) {
      console.error('Error fetching vehicle route:', error);
    }
  };

  const getMarkerImage = (type) => {
    switch (type) {
      case 'vehicle':
        return require('@/assets/images/green-marker.png');
      case 'alert':
        return require('@/assets/images/red-marker.png');
      case 'collection':
        return require('@/assets/images/blue-marker.png');
      default:
        return require('@/assets/images/blue-marker.png');
    }
  };

  const getRouteColor = (type) => {
    switch (type) {
      case 'completed':
        return '#4CAF50';
      case 'current':
        return '#2196F3';
      case 'planned':
        return '#FFC107';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={BENGALURU_COORDINATES}
      >
        {markers.map((marker, index) => (
          <Marker
            key={`${marker.type}-${index}`}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude
            }}
            image={getMarkerImage(marker.type)}
            onPress={() => marker.type === 'vehicle' && fetchVehicleRoute(marker.id)}
          />
        ))}

        {selectedVehicle && routes[selectedVehicle]?.map((route, index) => (
          <Polyline
            key={`route-${index}`}
            coordinates={route.path}
            strokeColor={getRouteColor(route.type)}
            strokeWidth={3}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default Map;
