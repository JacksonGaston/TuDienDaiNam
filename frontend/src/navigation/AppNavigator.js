import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import WordDetailScreen from '../screens/WordDetailScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'TuDienDaiNam',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search Dictionary',
        }}
      />
      <Stack.Screen
        name="WordDetail"
        component={WordDetailScreen}
        options={{
          title: 'Word Details',
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;