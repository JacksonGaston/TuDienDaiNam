import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '../i18n/LanguageContext';

const DISMISS_KEY = 'pwa-install-dismissed-v1';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

function detectInstallContext() {
  const ua = window.navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Macintosh') && window.navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid };
}

const PWAInstallPrompt = () => {
  const { t } = useTranslation();
  const [variant, setVariant] = useState(null);
  const [visible, setVisible] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    if (isStandalone()) return undefined;
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return undefined;

    const { isIOS, isAndroid } = detectInstallContext();

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      setVariant('android');
      setVisible(true);
    };

    const handleInstalled = () => {
      deferredPromptRef.current = null;
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    // iOS Safari never fires beforeinstallprompt — show manual instructions.
    if (isIOS && !isAndroid) {
      setVariant('ios');
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch (e) {}
  };

  const install = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;
    promptEvent.prompt();
    try {
      await promptEvent.userChoice;
    } catch (e) {}
    deferredPromptRef.current = null;
    setVisible(false);
  };

  if (Platform.OS !== 'web' || !visible) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{t('installAppTitle')}</Text>
        {variant === 'ios' ? (
          <>
            <Text style={styles.body}>{t('iosInstallStep1')}</Text>
            <Text style={styles.body}>{t('iosInstallStep2')}</Text>
          </>
        ) : (
          <Text style={styles.body}>{t('installAppBody')}</Text>
        )}
      </View>
      <View style={styles.actions}>
        {variant === 'android' && deferredPromptRef.current && (
          <TouchableOpacity style={styles.installButton} onPress={install}>
            <Text style={styles.installButtonText}>{t('installAppButton')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.dismissButton} onPress={dismiss}>
          <Text style={styles.dismissButtonText}>{t('dismiss')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  textWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  actions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  installButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  installButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dismissButtonText: {
    color: '#6c757d',
    fontSize: 13,
  },
});

export default PWAInstallPrompt;
