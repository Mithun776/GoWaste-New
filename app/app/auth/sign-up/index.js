import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Colors from '../../utils/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/Constants';

const { width, height } = Dimensions.get('window'); // Get screen width and height

export default function SignUp() {
    const navigation = useNavigation();
    const router = useRouter();

    // State for form inputs
    const [username, setUsername] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');

    useEffect(() => {
        navigation.setOptions({
            headerShown: false
        });

        // Check for existing token on component mount
        const checkExistingToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('user_token');
                if (token) {
                    // If token exists, navigate directly to locate page
                    router.replace('(tabs)/locate');
                }
            } catch (error) {
                console.error('Error checking token:', error);
            }
        };

        checkExistingToken();
    }, []);

    const handleSignUp = async () => {
        // Validate inputs
        if (!phoneNumber) {
            Alert.alert('Error', 'Please enter a phone number');
            return;
        }

        try {
            const response = await axios.post(`${BACKEND_URL}/api/register-user/`, { 
                phone: phoneNumber,
                user_name: username || null
            });

            // Store the token securely
            const token = response.data.data.token;
            console.log(response.data.data);
            await SecureStore.setItemAsync('user_token', token);

            // Navigate to the next screen or home screen
            router.replace('(tabs)/locate');
        } catch (error) {
            Alert.alert('Registration Failed', error.response?.data?.message || 'Please try again');
            console.error(error);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>

                <Text style={styles.heading}>Let's Sign You In</Text>

                {/* User Name */}
                <View style={styles.inputContainer}>
                    <Text>Username (Optional):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='Enter your name'
                        value={username}
                        onChangeText={setUsername}
                    />
                </View>

                {/* Phone Number */}
                <View style={styles.inputContainer}>
                    <Text>Phone Number:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='Enter Phone Number'
                        keyboardType="numeric"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                    />
                </View>

                {/* OTP (Placeholder) */}
                <View style={styles.inputContainer}>
                    <Text>OTP (Not Active):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='OTP will be implemented later'
                        keyboardType="numeric"
                        value={otp}
                        onChangeText={setOtp}
                        editable={false}
                    />
                </View>

                {/* Buttons Row - Create Account & Sign In */}
                <View style={styles.buttonsContainer}>
                    {/* Create Account Button */}
                    <TouchableOpacity
                        onPress={handleSignUp}
                        style={styles.createAccountButton}>
                        <Text style={styles.buttonText}>Sign in</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollViewContainer: {
        flexGrow: 1, // Ensure ScrollView takes up all available space
        paddingBottom: 20, // Space at the bottom to ensure the last elements are accessible on small screens
    },
    container: {
        padding: 20,
        paddingTop: height * 0.1, // Dynamic padding based on screen height
        backgroundColor: Colors.WHITE,
        flex: 1,
        justifyContent: 'flex-start',
    },
    backButton: {
        marginBottom: 5,
    },
    heading: {
        fontFamily: 'System',
        fontWeight: 'bold',
        color: Colors.GREEN,
        fontSize: width * 0.08, // Responsive font size based on screen width
        marginTop: 15,
    },
    inputContainer: {
        marginTop: 20,
    },
    input: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 15,
        borderColor: Colors.GREY,
        marginTop: 5,
        fontSize: width * 0.04, // Dynamic font size for better readability on all screens
    },
    buttonsContainer: {
        flexDirection: 'row',  // Aligns buttons horizontally
        justifyContent: 'space-between',  // Distributes buttons on both sides (left and right)
        marginTop: 20,
    },
    createAccountButton: {
        padding: 15,
        backgroundColor: Colors.PRIMARY,
        borderRadius: 15,
        marginTop: 50,
        marginBottom: 20,  // Allows the button to take up 47% of the available width
    },
    buttonText: {
        color: Colors.WHITE,
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: width * 0.05, // Button text size relative to screen width
    },
});
