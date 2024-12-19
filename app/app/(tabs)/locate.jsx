import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import AppMapView from '../HomeScreen/AppMapView.jsx';
import Header from '../HomeScreen/header.jsx';
import * as Location from 'expo-location';
import SearchBar from '../HomeScreen/SearchBar.jsx';

export default function Locate() {
    return (
        <View>
            <View style={styles.headerContainer}>
                <Header />
                <SearchBar />
            </View>
            <AppMapView />
        </View>
    )
}

const styles = StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        zIndex: 10,
        padding: 5,
        width: '100%',
        paddingHorizontal: 20,

    }
})
