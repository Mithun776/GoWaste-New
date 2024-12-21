import { View, Text, TextInput, Image, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import Colors from '../utils/Colors';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { BACKEND_URL } from '../utils/Constants';
import { Ionicons } from '@expo/vector-icons';

export default function Details() {
    const [formData, setFormData] = useState({
        location: '',
        wasteType: '',
        description: '',
        latitude: null,
        longitude: null,
    });
    const [alertTypes, setAlertTypes] = useState([
        { id: 0, name: 'House' },
        { id: 1, name: 'Dump Site' },
        { id: 2, name: 'Electronic' },
        { id: 3, name: 'Medical' },
        { id: 4, name: 'Other' },
    ]);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    // Fetch alert types from backend
    useEffect(() => {
        fetchAlertTypes();
        requestLocationPermission();
    }, []);

    const fetchAlertTypes = async () => {
        try {
            console.log('Fetching alert types from:', `${BACKEND_URL}/api/get-alert-types/`);
            const response = await fetch(`${BACKEND_URL}/api/get-alert-types/`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received alert types:', data);

            if (data && Array.isArray(data)) {
                setAlertTypes(data);
            } else if (data && data.choices) {
                // Handle if the API returns choices in a different format
                const formattedTypes = data.choices.map(choice => ({
                    id: choice.value,
                    name: choice.label
                }));
                setAlertTypes(formattedTypes);
            }
        } catch (error) {
            console.error('Error fetching alert types:', error);
            // Keep using the default alert types if fetch fails
            Alert.alert(
                'Connection Error',
                'Could not connect to the server. Using default waste types.',
                [{ text: 'OK' }]
            );
        }
    };

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Location permission is required to report waste alerts.'
                );
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error requesting location permission:', error);
            return false;
        }
    };

    const getCurrentLocation = async () => {
        setLocationLoading(true);
        try {
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) return;

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            // Get address from coordinates
            const [address] = await Location.reverseGeocodeAsync({
                latitude,
                longitude
            });

            setFormData(prev => ({
                ...prev,
                location: `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim(),
                latitude,
                longitude
            }));
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Failed to get current location. Please try again.');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleInputChange = (fieldName, fieldValue) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: fieldValue
        }));
    };

    const handleSubmit = async () => {
        try {
            // Validate required fields
            if (!formData.location || !formData.wasteType || !formData.latitude || !formData.longitude) {
                Alert.alert('Error', 'Please fill in all required fields and get location');
                return;
            }

            if (!image) {
                Alert.alert('Error', 'Please select an image');
                return;
            }

            setLoading(true);

            // Create form data for multipart/form-data request
            const formDataToSend = new FormData();
            formDataToSend.append('alert_type', formData.wasteType);
            formDataToSend.append('latitude', formData.latitude);
            formDataToSend.append('longitude', formData.longitude);
            formDataToSend.append('description', formData.description);

            // Append image
            const imageFileName = image.split('/').pop();
            const match = /\.(\w+)$/.exec(imageFileName);
            const imageType = match ? `image/${match[1]}` : 'image';
            formDataToSend.append('image', {
                uri: image,
                name: imageFileName,
                type: imageType
            });

            console.log('Submitting alert to:', `${BACKEND_URL}/api/user-alert/`);
            const response = await fetch(`${BACKEND_URL}/api/user-alert/`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit alert');
            }

            const data = await response.json();
            console.log('Alert submitted successfully:', data);

            // Reset form after successful submission
            setFormData({
                location: '',
                wasteType: '',
                description: '',
                latitude: null,
                longitude: null,
            });
            setImage(null);

            Alert.alert(
                'Success',
                'Alert submitted successfully!',
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('Error submitting alert:', error);
            Alert.alert(
                'Error',
                'Failed to submit alert. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    const openImagePickerAsync = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const openCameraAsync = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error launching camera:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        }
    };

    return (
        <View style={styles.mainContainer}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.title}>Report Waste Alert</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Location *</Text>
                    <View style={styles.locationContainer}>
                        <ScrollView
                            horizontal={true}
                            showsHorizontalScrollIndicator={true}
                            style={styles.locationInputContainer}
                        >
                            <TextInput
                                placeholder='Enter location or use Get Location'
                                style={styles.locationInput}
                                value={formData.location}
                                onChangeText={(text) => handleInputChange('location', text)}
                                multiline={false}
                            />
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.locationButton}
                            onPress={getCurrentLocation}
                            disabled={locationLoading}
                        >
                            {locationLoading ? (
                                <ActivityIndicator color={Colors.WHITE} />
                            ) : (
                                <View style={styles.locationButtonContent}>
                                    <Ionicons name="location-outline" size={20} color={Colors.WHITE} />
                                    <Text style={styles.locationButtonText}>Get Location</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Waste Type *</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={formData.wasteType}
                            style={styles.input}
                            onValueChange={(itemValue) => handleInputChange('wasteType', itemValue)}
                        >
                            <Picker.Item label="Select Waste Type" value="" />
                            {alertTypes.map((type) => (
                                <Picker.Item
                                    key={type.id}
                                    label={type.name}
                                    value={type.id}
                                />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* <View style={styles.inputContainer}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        placeholder='Enter description'
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={4}
                        value={formData.description}
                        onChangeText={(text) => handleInputChange('description', text)}
                        textAlignVertical="top"
                    />
                </View> */}

                <View style={styles.imageSection}>
                    <Text style={styles.label}>Add Photo</Text>
                    <View style={styles.imageContainer}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.placeholderContainer}>
                                <Ionicons name="image-outline" size={50} color={Colors.GREY} />
                                <Text style={styles.placeholderText}>No image selected</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.imageButtonContainer}>
                        <TouchableOpacity
                            style={styles.imageButton}
                            onPress={openCameraAsync}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="camera-outline" size={20} color={Colors.GREEN} style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Camera</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.imageButton}
                            onPress={openImagePickerAsync}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="images-outline" size={20} color={Colors.GREEN} style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Gallery</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.WHITE} />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit Alert</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.WHITE,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontFamily: 'System',
        fontSize: 25,
        marginBottom: 20,
        fontWeight: 'bold',
        color: Colors.PRIMARY,
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: Colors.PRIMARY,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.GREY,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: Colors.WHITE,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    locationInputContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.GREY,
        borderRadius: 8,
        backgroundColor: Colors.LIGHTGREY,
    },
    locationInput: {
        paddingHorizontal: 10,
        paddingVertical: 12,
        fontSize: 16,
        minWidth: '100%',
        color: Colors.BLACK,
    },
    locationButton: {
        backgroundColor: Colors.PRIMARY,
        padding: 12,
        borderRadius: 8,
        minWidth: 110,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    locationButtonText: {
        color: Colors.WHITE,
        fontWeight: '500',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: Colors.GREY,
        borderRadius: 1,
        backgroundColor: Colors.WHITE,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    imageSection: {
        marginVertical: 15,
    },
    imageContainer: {
        borderWidth: 1,
        borderColor: Colors.GREY,
        borderRadius: 8,
        padding: 15,
        backgroundColor: Colors.WHITE,
        marginBottom: 15,
    },
    placeholderContainer: {
        height: 130,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 10,
        color: Colors.GREY,
        fontSize: 16,
    },
    previewImage: {
        width: '100%',
        height: 130,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    imageButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    imageButton: {
        flex: 1,
        backgroundColor: Colors.WHITE,
        borderRadius: 8,
        padding: 10,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.GREEN,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingHorizontal: 0,
    },
    buttonIcon: {
        width: 24,
        marginRight: 4,
        textAlign: 'center',
    },
    buttonText: {
        color: Colors.GREEN,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        flex: 1,
    },
    submitButton: {
        backgroundColor: Colors.PRIMARY,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        height: 55,
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: Colors.WHITE,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
});
