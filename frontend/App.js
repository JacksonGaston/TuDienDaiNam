import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { store } from './src/store/store';
import { LanguageProvider } from './src/i18n/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerAppUpdater } from './src/web/appUpdate';

const navigationRef = createNavigationContainerRef();

const linking = {
  config: {
    screens: {
      Home: '',
      Search: 'search',
      WordDetail: {
        path: 'word/:wordId',
        parse: { wordId: Number },
      },
    },
  },
};

export default function App() {
  useEffect(() => {
    registerAppUpdater();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  return (
    <Provider store={store}>
      <LanguageProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </LanguageProvider>
    </Provider>
  );
}