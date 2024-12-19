import { View, Text, Image, StyleSheet } from 'react-native'
import React, { useEffect } from 'react'
import Colors from '../../utils/Colors'
import { TouchableOpacity } from 'react-native'
import { useRouter, useNavigation } from 'expo-router'

export default function LoginScreen() {

    const navigation = useNavigation();

    useEffect(() => {
        // Hide the header for this screen
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    const router = useRouter();   // Hook for moving from one screen to another
    return (
        <View style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 60
        }}>
            {/* <Text>LoginScreen</Text> */}
            <Image source={require('./../../../assets/images/logo.png')}
                style={styles.logoImage}
            />
            <Image source={require('./../../../assets/images/truck.png')}
                style={styles.bgImage}
            />
            <View style={{ padding: 20 }}>
                <Text style={styles.heading}>Track garbage trucks in real-time and stay updated</Text>
                <Text style={styles.desc}>Ensure timely waste clearance with GoWaste</Text>
                <TouchableOpacity style={styles.button}
                    // Navigating to Sign-in
                    onPress={() => router.push('auth/sign-up')}>
                    <Text style={{
                        color: Colors.WHITE,
                        textAlign: 'center',
                        fontFamily: 'System',
                        fontSize: 17
                    }}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    logoImage: {
        width: 200,
        height: 40,
        objectFit: 'contain'
    },
    bgImage: {
        width: '100%',
        height: 240,
        marginTop: 20,
        objectFit: 'cover'
    },
    heading: {
        fontSize: 23,
        fontFamily: 'System',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 10
    },
    desc: {
        fontSize: 17,
        fontFamily: 'System',
        marginTop: 15,
        textAlign: 'center',
        color: Colors.GREY
    },
    button: {
        backgroundColor: Colors.PRIMARY,
        padding: 16,
        display: 'flex',
        borderRadius: 99,
        marginTop: 45
    }
})