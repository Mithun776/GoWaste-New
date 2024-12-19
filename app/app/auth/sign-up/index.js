import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import Colors from '../../utils/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window'); // Get screen width and height

export default function SignUp() {
    const navigation = useNavigation();
    const router = useRouter();

    // State for password visibility toggle
    const [secureText, setSecureText] = useState(true);

    // Toggle the visibility of the password
    const toggleSecureText = () => {
        setSecureText(prevState => !prevState);
    };

    useEffect(() => {
        navigation.setOptions({
            headerShown: false
        })
    }, [])

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>

                <Text style={styles.heading}>Let's Sign You In</Text>

                {/* User Name */}
                <View style={styles.inputContainer}>
                    <Text>Username:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='Enter your name'
                    />
                </View>

                {/* Phone Number */}
                <View style={styles.inputContainer}>
                    <Text>Phone Number:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='Enter Phone Number'
                        keyboardType="numeric"
                    />
                </View>

                {/* Get OTP */}
                <TouchableOpacity
                    // onPress={() => router.replace('auth/sign-up')}   ================ Make something to get OTP ================
                    style={styles.getOtpButton}>
                    <Text style={styles.getOtpText}>Get OTP</Text>
                </TouchableOpacity>

                {/* OTP */}
                <View style={styles.inputContainer}>
                    <Text>OTP Received:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='Enter OTP'
                        keyboardType="numeric"
                    />
                </View>

                {/* Password */}
                {/* <View style={styles.inputContainer}> */}
                {/* <Text>Create Password:</Text> */}
                {/* <TextInput */}
                {/* secureTextEntry={secureText} // Toggles visibility based on state */}
                {/* style={styles.input} */}
                {/* placeholder='Enter Password' */}
                {/* /> */}
                {/* Toggle show/hide password */}
                {/* <TouchableOpacity onPress={toggleSecureText} style={styles.toggleButton}> */}
                {/* <Text style={styles.toggleText}> */}
                {/* {secureText ? 'Show Password' : 'Hide Password'} */}
                {/* </Text> */}
                {/* </TouchableOpacity> */}
                {/* </View> */}

                {/* Buttons Row - Create Account & Sign In */}
                <View style={styles.buttonsContainer}>
                    {/* Create Account Button */}
                    <TouchableOpacity
                        onPress={() => router.replace('(tabs)/locate')}
                        style={styles.createAccountButton}>
                        <Text style={styles.buttonText}>Sign in</Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    {/* <TouchableOpacity
                        onPress={() => router.replace('auth/sign-in')}
                        style={styles.signInButton}>
                        <Text style={styles.signInText}>Sign In</Text>
                    </TouchableOpacity> */}
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
    toggleButton: {
        marginTop: 3,
        alignItems: 'flex-end',
    },
    toggleText: {
        color: Colors.GREEN,
        fontSize: width * 0.04,
        fontWeight: 'bold',
    },
    getOtpButton: {
        padding: 12,
        backgroundColor: Colors.LIME,
        borderRadius: 15,
        marginTop: 20,
        borderWidth: 1,
    },
    getOtpText: {
        color: Colors.BLACK,
        textAlign: 'center',
    },
    // buttonsContainer: {
    //     flexDirection: 'row',  // Aligns buttons horizontally
    //     justifyContent: 'space-between',  // Distributes buttons on both sides (left and right)
    //     marginTop: 20,
    // },
    createAccountButton: {
        padding: 15,
        backgroundColor: Colors.PRIMARY,
        borderRadius: 15,
        marginTop: 50,
        marginBottom: 20,  // Allows the button to take up 47% of the available width
    },
    signInButton: {
        padding: 10,
        backgroundColor: Colors.WHITE,
        borderRadius: 15,
        flex: 0.47,  // Allows the button to take up 47% of the available width
        borderWidth: 1,
    },
    buttonText: {
        color: Colors.WHITE,
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: width * 0.05, // Button text size relative to screen width
    },
    signInText: {
        color: Colors.PRIMARY,
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: width * 0.05,
        lineHeight: width * 0.05 * 2.0, // Helps with vertical centering the text
    },
});
