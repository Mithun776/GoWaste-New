import { View, Text, StyleSheet, Dimensions, Image, Alert, Platform, Linking, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import React, { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import * as Location from 'expo-location';
import Modal from "react-native-modal";
import SearchBar from './SearchBar';
import { BACKEND_URL } from '../utils/Constants';
import { getToken } from '../utils/TokenManager';
import Colors from '../utils/Colors';
import { Ionicons } from '@expo/vector-icons';

// Default region (Bengaluru)
const DEFAULT_REGION = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const AppMapView = forwardRef((props, ref) => {
  const { 
    onAlertSelect,  // New prop to pass selected alert to parent
    ...otherProps 
  } = props;

  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [collectionPoints, setCollectionPoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const mapRef = useRef(null);

  const fetchStatusData = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = await getToken();
      
      const response = await fetch(`${BACKEND_URL}/api/get-status/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform vehicle and alert data to match marker requirements
      const formattedVehicles = (data.vehicles || []).map(vehicle => {
        const lat = parseFloat(vehicle.latitude);
        const lon = parseFloat(vehicle.longitude);
        
        if (isNaN(lat) || isNaN(lon)) {
          return null;
        }
        
        return {
          id: vehicle.id,
          type: 'vehicle',
          latitude: lat,
          longitude: lon,
          vehicle_registration: vehicle.vehicle_registration,
          details: vehicle
        };
      }).filter(vehicle => vehicle !== null);

      const formattedAlerts = (data.alerts || []).map(alert => {
        const lat = parseFloat(alert.latitude);
        const lon = parseFloat(alert.longitude);
        
        if (isNaN(lat) || isNaN(lon)) {
          return null;
        }
        
        return {
          id: alert.id,
          type: 'alert',
          latitude: lat,
          longitude: lon,
          alert_type: alert.alert_type,
          user_name: alert.user_name,
          details: alert
        };
      }).filter(alert => alert !== null);

      const formattedCollectionPoints = (data.collectionPoints || []).map(point => ({
        id: point.id,
        type: 'collection',
        latitude: parseFloat(point.latitude),
        longitude: parseFloat(point.longitude),
        name: point.name,
        description: 'Waste Collection Center',
        details: point
      }));

      setVehicles(formattedVehicles);
      setAlerts(formattedAlerts);
      setCollectionPoints(formattedCollectionPoints);
    } catch (error) {
      console.error('Error fetching status data:', error);
      Alert.alert('Error', 'Failed to fetch map data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatusData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchStatusData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchStatusData]);

  // Marker selection handler
  const handleMarkerPress = (marker) => {
    setSelectedMarker(marker);

    // If the marker is an alert and onAlertSelect is provided
    if (marker.type === 'alert' && onAlertSelect) {
      onAlertSelect(marker);
    }
  };

  // Function to delete an alert
  const handleDeleteAlert = async (alert) => {
    try {
      // Confirm deletion
      const confirmDelete = await new Promise((resolve) => {
        Alert.alert(
          'Confirm Deletion',
          'Are you sure you want to delete this alert?',
          [
            {
              text: 'Cancel',
              onPress: () => resolve(false),
              style: 'cancel'
            },
            {
              text: 'Delete',
              onPress: () => resolve(true),
              style: 'destructive'
            }
          ]
        );
      });

      // Exit if not confirmed
      if (!confirmDelete) return;

      // Retrieve the token from secure store
      const token = await getToken();

      // Prepare delete request
      const response = await fetch(`${BACKEND_URL}/api/delete-user-alert/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          alert_id: alert.id
        })
      });

      // Parse response
      const data = await response.json();

      // Check if response was successful
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete alert');
      }

      // Show success message from response
      Alert.alert(
        data.message || 'Success', 
        data.data || 'Alert deleted successfully!', 
        [{ text: 'OK' }]
      );

      // Close the modal
      setSelectedMarker(null);

      // Optionally, refresh the status data to remove the deleted alert
      fetchStatusData();

      console.log('Alert deleted successfully:', data);
    } catch (error) {
      console.error('Error deleting alert:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to delete alert. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Render marker details modal
  const renderMarkerDetailsModal = () => {
    if (!selectedMarker) return null;

    return (
      <Modal
        isVisible={!!selectedMarker}
        onBackdropPress={() => setSelectedMarker(null)}
        style={styles.modalContainer}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={() => setSelectedMarker(null)}
          >
            <Ionicons name="close" size={24} color={Colors.BLACK} />
          </TouchableOpacity>

          <ScrollView 
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Vehicle Details */}
            {selectedMarker.type === 'vehicle' && (
              <View>
                <Text style={styles.modalTitle}>Vehicle Details</Text>
                <Text>Registration: {selectedMarker.vehicle_registration}</Text>
                <Text>Latitude: {selectedMarker.latitude}</Text>
                <Text>Longitude: {selectedMarker.longitude}</Text>
              </View>
            )}

            {/* Alert Details */}
            {selectedMarker.type === 'alert' && (
              <View>
                <Text style={styles.modalTitle}>Alert Details</Text>
                <Text>Type: {selectedMarker.alert_type}</Text>
                <Text>Reported By: {selectedMarker.user_name}</Text>
                <Text>Latitude: {selectedMarker.latitude}</Text>
                <Text>Longitude: {selectedMarker.longitude}</Text>
                
                {/* Delete Button for Alerts */}
                <TouchableOpacity 
                  style={styles.deleteAlertButton}
                  onPress={() => handleDeleteAlert(selectedMarker)}
                >
                  <Ionicons 
                    name="trash-outline" 
                    size={20} 
                    color="#FFFFFF" 
                    style={styles.deleteAlertButtonIcon}
                  />
                  <Text style={styles.deleteAlertButtonText}>Delete Alert</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Collection Point Details */}
            {selectedMarker.type === 'collection' && (
              <View>
                <Text style={styles.modalTitle}>Collection Point</Text>
                <Text>Name: {selectedMarker.name}</Text>
                <Text>Latitude: {selectedMarker.latitude}</Text>
                <Text>Longitude: {selectedMarker.longitude}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const getMarkerImage = (type) => {
    switch (type) {
      case 'vehicle':
        return require('../../assets/images/green-marker.png');
      case 'alert':
        return require('../../assets/images/red-marker.png');
      case 'collection':
        return require('../../assets/images/red-marker.png');
      case 'user':
        return require('../../assets/images/blue-marker.png');
      default:
        return require('../../assets/images/red-marker.png');
    }
  };

  const renderVehicleMarker = (vehicle) => (
    <Marker
      key={`vehicle-${vehicle.id}`}
      coordinate={{
        latitude: vehicle.latitude,
        longitude: vehicle.longitude
      }}
      title=""
      description=""
      onPress={() => handleMarkerPress(vehicle)}
    >
      <Image
        source={getMarkerImage('vehicle')}
        style={styles.markerImage}
      />
    </Marker>
  );

  const renderAlertMarker = (alert) => (
    <Marker
      key={`alert-${alert.id}`}
      coordinate={{
        latitude: alert.latitude,
        longitude: alert.longitude
      }}
      title=""
      description=""
      onPress={() => handleMarkerPress(alert)}
    >
      <Image
        source={getMarkerImage('alert')}
        style={styles.markerImage}
      />
    </Marker>
  );

  const renderCollectionPointMarker = (point) => (
    <Marker
      key={`collection-${point.id}`}
      coordinate={{
        latitude: point.latitude,
        longitude: point.longitude
      }}
      title=""
      description=""
      onPress={() => handleMarkerPress(point)}
    >
      <Image
        source={getMarkerImage('collection')}
        style={styles.markerImage}
      />
    </Marker>
  );

  // Imperative handle for parent components to call methods
  useImperativeHandle(ref, () => ({
    centerToCurrentLocation: async () => {
      try {
        // Set a timeout for location retrieval
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 5000,  // 5 seconds timeout
          maximumAge: 1000  // Accept cached location within 1 second
        });

        // Wrap with a promise that rejects after 7 seconds
        const location = await Promise.race([
          locationPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location retrieval timed out')), 7000)
          )
        ]);

        const { latitude, longitude } = location.coords;

        // Update user location state
        setUserLocation({ latitude, longitude });

        // Animate map to the current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }, 1000);
        }

        return { latitude, longitude };
      } catch (error) {
        console.error('Error centering to current location:', error);
        
        // Detailed error handling
        if (error.message.includes('permission')) {
          Alert.alert(
            'Location Permission', 
            'Please enable location permissions in your device settings.',
            [{ text: 'OK' }]
          );
        } else if (error.message.includes('timeout')) {
          Alert.alert(
            'Location Timeout', 
            'Unable to retrieve location. Please check your GPS and try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Location Error', 
            'Failed to get current location. Please try again.',
            [{ text: 'OK' }]
          );
        }

        // Fallback to default region
        if (mapRef.current) {
          mapRef.current.animateToRegion(DEFAULT_REGION, 1000);
        }

        throw error;
      }
    }
  }));

  // Location permission and fetching
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return false;
      }
      
      // Additional check for background permission (optional)
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.warn('Background location permission not granted');
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Get current location on component mount with more robust handling
  useEffect(() => {
    let isMounted = true;
    let locationSubscription = null;

    const fetchCurrentLocation = async () => {
      try {
        // Ensure permissions are granted
        const hasPermission = await requestLocationPermission();
        if (!hasPermission || !isMounted) return;

        // Use watchPositionAsync for continuous updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,  // Update every 5 seconds
            distanceInterval: 10  // Or every 10 meters
          },
          (location) => {
            if (isMounted) {
              const { latitude, longitude } = location.coords;
              setUserLocation({ latitude, longitude });
            }
          }
        );
      } catch (error) {
        console.error('Error setting up location tracking:', error);
        
        // Fallback to one-time location fetch
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });
          
          if (isMounted) {
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });
          }
        } catch (fallbackError) {
          console.error('Fallback location fetch failed:', fallbackError);
        }
      }
    };

    fetchCurrentLocation();

    // Cleanup function
    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        provider={PROVIDER_GOOGLE}
      >
        {/* Render vehicle markers */}
        {vehicles.map(renderVehicleMarker)}

        {/* Render alert markers */}
        {alerts.map(renderAlertMarker)}

        {/* Render collection point markers */}
        {collectionPoints.map(renderCollectionPointMarker)}
      </MapView>

      {renderMarkerDetailsModal()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerImage: {
    width: 35,
    height: 35,
  },
  modalContainer: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 40,
    maxHeight: Dimensions.get('window').height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.BLACK,
    textAlign: 'center',
  },
  deleteAlertButton: {
    backgroundColor: Colors.RED, 
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteAlertButtonIcon: {
    marginRight: 10,
    color: Colors.WHITE,
  },
  deleteAlertButtonText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AppMapView;