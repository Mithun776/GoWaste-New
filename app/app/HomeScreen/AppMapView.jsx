import { View, StyleSheet, Dimensions, Image, Alert, Text, Platform, Linking } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout, Circle } from 'react-native-maps';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import SearchBar from './SearchBar'; // Assuming SearchBar component is in the same directory

// Default region (Bengaluru)
const DEFAULT_REGION = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Collection points in Bengaluru
const COLLECTION_POINTS = [
  {
    id: 1,
    name: "HSR Layout Collection Center",
    latitude: 12.9147,
    longitude: 77.6497,
    type: 'collection'
  },
  {
    id: 2,
    name: "Koramangala Waste Center",
    latitude: 12.9279,
    longitude: 77.6271,
    type: 'collection'
  },
  {
    id: 3,
    name: "Indiranagar Collection Point",
    latitude: 12.9719,
    longitude: 77.6412,
    type: 'collection'
  },
  {
    id: 4,
    name: "Whitefield Waste Management",
    latitude: 12.9698,
    longitude: 77.7500,
    type: 'collection'
  },
  {
    id: 5,
    name: "Electronic City Collection",
    latitude: 12.8458,
    longitude: 77.6692,
    type: 'collection'
  }
];

// Sample data for testing
const INITIAL_MARKERS = [
  {
    id: 1,
    type: 'vehicle',
    latitude: 12.9716,
    longitude: 77.5946,
    title: 'Waste Collection Vehicle 1'
  },
  {
    id: 2,
    type: 'collection',
    latitude: 12.9616,
    longitude: 77.6046,
    title: 'Collection Point 1'
  }
];

export default function AppMapView() {
  const [staticMarkers, setStaticMarkers] = useState(INITIAL_MARKERS);
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const mapRef = useRef(null);

  const requestLocationPermission = useCallback(async () => {
    try {
      // First check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable location services to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open Settings", 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return false;
      }

      // Then check/request permissions
      let { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'undetermined') {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      }
      
      if (status === 'denied') {
        Alert.alert(
          "Location Permission Required",
          "Please grant location permission to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return false;
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }, []);

  const setupLocation = useCallback(async () => {
    let locationSubscription = null;
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setErrorMsg('Location permission is required to use this feature.');
        return null;
      }

      // Get initial location
      let location;
      try {
        if (Platform.OS === 'ios') {
          location = await Location.getLastKnownPositionAsync({
            maxAge: 10000,
          });
          if (!location) {
            location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.BestForNavigation,
            });
          }
        } else {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
        }
      } catch (error) {
        Alert.alert(
          "Location Error",
          "Unable to get your location. Please try again.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Retry",
              onPress: () => setupLocation()
            }
          ]
        );
        return null;
      }

      const { latitude, longitude } = location.coords;
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setUserLocation({ latitude, longitude });
      setRegion(newRegion);
      setErrorMsg(null);

      // Start location updates
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Platform.OS === 'android' ? Location.Accuracy.Low : Location.Accuracy.BestForNavigation,
          distanceInterval: Platform.OS === 'ios' ? 5 : 10,
          timeInterval: Platform.OS === 'ios' ? 2000 : 5000,
          foregroundService: Platform.OS === 'android' ? {
            notificationTitle: "Location",
            notificationBody: "Location tracking in progress",
            notificationColor: "#fff",
          } : undefined
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setUserLocation({ latitude, longitude });
        }
      );

      return locationSubscription;
    } catch (error) {
      console.error('Error setting up location:', error);
      Alert.alert(
        "Location Error",
        "There was an error setting up location services. Please check your settings and try again.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Retry",
            onPress: () => setupLocation()
          }
        ]
      );
      return null;
    }
  }, [requestLocationPermission]);

  useEffect(() => {
    let locationSubscription = null;

    const initLocation = async () => {
      locationSubscription = await setupLocation();
    };

    initLocation();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [setupLocation]);

  const handleLocationSelect = (location) => {
    setSearchedLocation(location);
    animateToLocation(location.latitude, location.longitude);
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

  const renderMarker = (marker) => {
    let description = '';
    switch (marker.type) {
      case 'vehicle':
        description = 'Click to show route';
        break;
      case 'alert':
        description = 'Active waste alert';
        break;
      case 'collection':
        description = 'Collection point location';
        break;
      default:
        description = '';
    }

    return (
      <Marker
        key={`${marker.type}-${marker.id}`}
        coordinate={{
          latitude: marker.latitude,
          longitude: marker.longitude
        }}
        title={marker.title}
        description={description}
        pinColor="red"
        onPress={() => marker.type === 'vehicle' && setSelectedVehicle(marker.id)}
      >
        <Image
          source={getMarkerImage(marker.type)}
          style={styles.markerImage}
        />
        <Callout tooltip>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutTitle}>{marker.title}</Text>
            {description ? <Text style={styles.calloutDescription}>{description}</Text> : null}
          </View>
        </Callout>
      </Marker>
    );
  };

  const renderCollectionPoint = (point) => (
    <Marker
      key={`collection-${point.id}`}
      coordinate={{
        latitude: point.latitude,
        longitude: point.longitude
      }}
      title={point.name}
      description="Waste Collection Center"
      pinColor="red"
    >
      <Image
        source={getMarkerImage('collection')}
        style={styles.markerImage}
      />
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{point.name}</Text>
          <Text style={styles.calloutDescription}>Waste Collection Center</Text>
        </View>
      </Callout>
    </Marker>
  );

  const renderRoute = () => {
    if (!selectedVehicle || !userLocation) return null;

    const vehicleMarker = staticMarkers.find(m => m.id === selectedVehicle);
    if (!vehicleMarker) return null;

    return (
      <Polyline
        coordinates={[
          {
            latitude: vehicleMarker.latitude,
            longitude: vehicleMarker.longitude
          },
          userLocation
        ]}
        strokeColor="#2196F3"
        strokeWidth={3}
      />
    );
  };

  const animateToLocation = (latitude, longitude) => {
    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    });
  };

  return (
    <View style={styles.container}>
      <SearchBar onLocationSelect={handleLocationSelect} />
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 12.9716,
          longitude: 77.5946,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={false}
        showsMyLocationButton={true}
        followsUserLocation={true}
        onMapReady={() => {
          const allPoints = [
            ...COLLECTION_POINTS,
            ...INITIAL_MARKERS,
            ...(userLocation ? [{ ...userLocation, type: 'user' }] : [])
          ];
          
          if (allPoints.length > 0) {
            mapRef.current?.fitToCoordinates(
              allPoints.map(p => ({
                latitude: p.latitude,
                longitude: p.longitude
              })),
              {
                edgePadding: {
                  top: 50,
                  right: 50,
                  bottom: 50,
                  left: 50
                },
                animated: true
              }
            );
          }
        }}
      >
        {/* Render collection points */}
        {COLLECTION_POINTS.map(point => renderCollectionPoint(point))}

        {/* Render static markers (vehicle) */}
        {staticMarkers.map(marker => renderMarker(marker))}

        {/* Render user location as waste alert */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="Your current location"
            pinColor="blue"
          >
            <View style={styles.markerContainer}>
              <Image
                source={getMarkerImage('user')}
                style={styles.markerImage}
              />
            </View>
            <Callout tooltip>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>Your Location</Text>
                <Text style={styles.calloutDescription}>Current location</Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Render searched location if exists */}
        {searchedLocation && (
          <Marker
            coordinate={{
              latitude: searchedLocation.latitude,
              longitude: searchedLocation.longitude
            }}
            title={searchedLocation.name || "Searched Location"}
            description={searchedLocation.address}
            pinColor="green"
          >
            <View style={styles.markerContainer}>
              <Image
                source={require('../../assets/images/green-marker.png')}
                style={styles.markerImage}
              />
            </View>
            <Callout tooltip>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{searchedLocation.name || "Searched Location"}</Text>
                <Text style={styles.calloutDescription}>{searchedLocation.address}</Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Render route if vehicle is selected */}
        {renderRoute()}
      </MapView>

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  markerImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain'
  },
  calloutContainer: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    borderColor: '#ccc',
    borderWidth: 1,
    minWidth: 150,
    alignItems: 'center',
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  calloutDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
  },
  markerContainer: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  }
});