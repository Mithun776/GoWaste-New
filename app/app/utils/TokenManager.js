import * as SecureStore from 'expo-secure-store';

export const storeToken = async (token) => {
  try {
    await SecureStore.setItemAsync('user_token', token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync('user_token');
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync('user_token');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};
