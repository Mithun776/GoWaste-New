import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
// import { useUser } from ''

export default function Header() {
    // const {user} = useUser();
    const router = useRouter();

    return (
        <View style={styles.container}>

            {/* <Image source={{ uri: user?.imageUrl }} */}

            <TouchableOpacity
                onPress={() => router.replace('/(tabs)/profile')}>
                <Image source={require('./../../assets/images/user.png')}
                    style={{ width: 40, height: 40, borderRadius: 99 }}
                />
            </TouchableOpacity>

            <Image source={require('./../../assets/images/logo.png')}
                style={{ width: 150, height: 45, objectFit: 'contain' }}
            />

            <TouchableOpacity
                onPress={() => router.replace('/(tabs)/details')}>
                <FontAwesome5 name="filter" size={24} color="green" />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        backgroundColor: '#ffffffBF',
        paddingHorizontal: 5,
        padding: 3,
        borderRadius: 15,
    }
})
