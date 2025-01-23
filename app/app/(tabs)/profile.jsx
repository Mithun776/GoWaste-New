import { View, Text, Image, FlatList, TouchableOpacity, Alert } from 'react-native'
import React from 'react'
import Colors from '../utils/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function Profile() {

    const router = useRouter();
    const profileMenu = [
        {
            id: 1,
            name: 'Home',
            icon: 'home-sharp',
            path: '/(tabs)/locate'
        },
        {
            id: 2,
            name: 'Details',
            icon: 'ticket-sharp',
            path: '/(tabs)/details'

        },
        {
            id: 3,
            name: 'Contact Us',   // Maybe using linking expo
            icon: 'mail-sharp',
            path: '/(tabs)/profile'
        },
        {
            id: 4,
            name: 'Logout',
            icon: 'log-out-sharp',
            path: '/auth/sign-up'
        }
    ]

    const onPressMenu = async (menu) => {
        if (menu.name.toLowerCase() === 'logout') {
            try {
                // Remove the stored token
                await SecureStore.deleteItemAsync('user_token');
                
                // Navigate to sign-up page
                router.replace('/auth/sign-up');
            } catch (error) {
                Alert.alert('Logout Error', 'Unable to logout. Please try again.');
                console.error('Logout error:', error);
            }
            return;
        }

        router.push(menu.path)
    }

    return (
        <View>
            <View style={{ padding: 20, paddingTop: 40, backgroundColor: Colors.LIME, }}>
                <Text style={{
                    fontFamily: 'System',
                    fontSize: 25,
                    marginBottom: 5,
                    fontWeight: 'bold',
                    color: Colors.GREEN,
                }}>Profile</Text>

                <View style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 10,

                }}>
                    <Image source={require('./../../assets/images/user.png')}
                        style={{ width: 100, height: 100, borderRadius: 99 }}
                    />
                    <Text style={{ fontSize: 20, color: Colors.BLACK }}>Username</Text>
                    <Text style={{ fontSize: 15, color: Colors.BLACK, marginTop: 5 }}>Phone Number</Text>
                </View>

            </View>

            <View style={{ paddingTop: 20 }}>
                <FlatList
                    data={profileMenu}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            onPress={() => onPressMenu(item)}
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                marginVertical: 5,
                                alignItems: 'center',
                                gap: 20,
                                backgroundColor: Colors.WHITE,
                                padding: 3,
                                borderRadius: 10,
                                marginHorizontal: 35,
                            }}>
                            <Ionicons name={item.icon} size={30} color={Colors.GREEN}
                                style={{
                                    padding: 10,
                                    backgroundColor: Colors.LIGHTGREY,
                                    borderRadius: 10
                                }} />
                            <Text style={{ fontSize: 18, }}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    )
}