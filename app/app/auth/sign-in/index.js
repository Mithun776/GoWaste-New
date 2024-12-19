import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import Colors from '../../utils/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

export default function SignIn() {
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
        });
    }, []); // Empty dependency array to run only once

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>

                <Text style={styles.heading}>Let's Sign You In</Text>
                <Text style={styles.subHeading}>Welcome Back</Text>

                {/* Phone Number */}
                <View style={styles.inputContainer}>
                    <Text>Phone Number:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='Enter Phone Number'
                        keyboardType="numeric"
                    />
                </View>


                {/* Password */}
                {/* <View style={styles.inputContainer}> */}
                {/* <Text>Password:</Text> */}
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


                {/* Sign In Button */}
                <TouchableOpacity
                    onPress={() => router.replace('(tabs)/locate')}
                    style={styles.signInButton} >
                    <Text style={styles.signInText}>Login</Text>
                </TouchableOpacity>

                {/* Create Account Button */}
                <TouchableOpacity
                    onPress={() => router.replace('auth/sign-up')}
                    style={styles.createAccountButton}>
                    <Text style={styles.createAccountText}>Create Account</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollViewContainer: {
        flexGrow: 1, // Ensures ScrollView takes up full height
        paddingBottom: 20, // Ensure the content is not cut off at the bottom
    },
    container: {
        padding: 20,
        paddingTop: height * 0.1, // Dynamic padding based on screen height
        backgroundColor: Colors.WHITE,
        flex: 1,
        justifyContent: 'flex-start',
    },
    backButton: {
        marginBottom: 20,
    },
    heading: {
        fontFamily: 'System',
        fontWeight: 'bold',
        color: Colors.GREEN,
        fontSize: width * 0.08, // Adjust font size dynamically based on screen width
        marginTop: 10,
    },
    subHeading: {
        fontFamily: 'System',
        fontSize: width * 0.06, // Adjust font size dynamically for the subheading
        marginTop: 20,
    },
    inputContainer: {
        marginTop: 30,
    },
    input: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 15,
        borderColor: Colors.GREY,
        marginTop: 8,
        marginBottom: 15,
        fontSize: width * 0.04, // Dynamic font size for inputs
    },
    toggleButton: {
        marginTop: 3,
        alignItems: 'flex-end',
    },
    toggleText: {
        color: Colors.GREEN,
        fontSize: width * 0.04, // Dynamic font size for toggle text
        fontWeight: 'bold',
    },
    signInButton: {
        padding: 15,
        backgroundColor: Colors.PRIMARY,
        borderRadius: 15,
        marginTop: 50,
        marginBottom: 20,
    },
    signInText: {
        color: Colors.WHITE,
        textAlign: 'center',
        fontSize: width * 0.05, // Dynamic font size for button text
    },
    createAccountButton: {
        padding: 15,
        backgroundColor: Colors.WHITE,
        borderRadius: 15,
        borderWidth: 1,
        marginTop: 20,
    },
    createAccountText: {
        color: Colors.PRIMARY,
        textAlign: 'center',
        fontSize: width * 0.05, // Dynamic font size for button text
    },
});
