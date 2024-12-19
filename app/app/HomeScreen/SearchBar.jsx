import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import 'react-native-get-random-values';
import Colors from '../utils/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'

export default function SearchBar({ onLocationSelect }) {
    return (
        <View style={styles.container}>
            <Ionicons name="location-sharp" size={24} color={Colors.GREY} style={styles.icon} />
            <GooglePlacesAutocomplete
                placeholder='Search your Location'
                enablePoweredByContainer={false}
                fetchDetails={true}
                onPress={(data, details = null) => {
                    if (details) {
                        const location = {
                            latitude: details.geometry.location.lat,
                            longitude: details.geometry.location.lng,
                            address: details.formatted_address,
                            name: details.name
                        };
                        onLocationSelect && onLocationSelect(location);
                    }
                }}
                query={{
                    key: 'YOUR_GOOGLE_PLACES_API_KEY',
                    language: 'en',
                    components: 'country:in', // Restrict to India
                    types: 'geocode|establishment', // Allow both addresses and places
                }}
                styles={{
                    container: {
                        flex: 1,
                    },
                    textInput: {
                        height: 45,
                        color: Colors.GREY,
                        fontSize: 16,
                        backgroundColor: Colors.WHITE,
                    },
                    predefinedPlacesDescription: {
                        color: Colors.GREY,
                    },
                    description: {
                        color: Colors.GREY,
                        fontSize: 14,
                    },
                    row: {
                        backgroundColor: Colors.WHITE,
                        padding: 13,
                        minHeight: 44,
                        flexDirection: 'row',
                    },
                    separator: {
                        height: 0.5,
                        backgroundColor: Colors.GREY,
                    },
                    poweredContainer: {
                        display: 'none',
                    },
                }}
                nearbyPlacesAPI="GooglePlacesSearch"
                debounce={300}
                minLength={2}
                returnKeyType={'search'}
                listViewDisplayed={false}
                autoFocus={false}
                filterReverseGeocodingByTypes={['locality', 'administrative_area_level_1']}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'row',
        marginTop: 10,
        paddingHorizontal: 10,
        backgroundColor: Colors.WHITE,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    icon: {
        paddingTop: 10,
        marginRight: 5,
    }
});