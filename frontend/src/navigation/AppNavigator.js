import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from '../i18n/LanguageContext';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import WordDetailScreen from '../screens/WordDetailScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { t } = useTranslation();

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
          title: t('appName'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: t('searchDictionary'),
        }}
      />
      <Stack.Screen
        name="WordDetail"
        component={WordDetailScreen}
        options={{
          title: t('wordDetails'),
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;