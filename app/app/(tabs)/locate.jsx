import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useRef } from 'react'
import AppMapView from '../HomeScreen/AppMapView.jsx';
import Header from '../HomeScreen/header.jsx';
import SearchBar from '../HomeScreen/SearchBar.jsx';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/Colors';
import * as Location from 'expo-location';

export default function Locate() {
    const mapRef = useRef(null);

    const handleCenterLocation = () => {
        if (mapRef.current) {
            mapRef.current.centerToCurrentLocation();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Header />
                <SearchBar />
            </View>
            <AppMapView ref={mapRef} />
            <TouchableOpacity 
                style={styles.centerLocationButton} 
                onPress={handleCenterLocation}
            >
                <Ionicons 
                    name="locate" 
                    size={24} 
                    color={Colors.PRIMARY} 
                />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        position: 'absolute',
        zIndex: 10,
        padding: 5,
        width: '100%',
        paddingHorizontal: 20,
    },
    centerLocationButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: Colors.WHITE,
        borderRadius: 50,
        padding: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }
})
