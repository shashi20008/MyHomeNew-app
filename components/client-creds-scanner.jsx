import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ToastAndroid, Platform } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Permissions from 'expo-permissions';
import TextDisplay from './common/text-display';
import { setServerAddress, setClientId, setClientSecret } from '../lib/settings';

export default function ClientCredsScanner() {
  const [err, setErr] = useState(null);
  const loggingIn = useRef(false);

  useEffect(() => {
    Permissions.getAsync(Permissions.CAMERA)
      .then((perm) => {
        if (perm.granted) {
          // we already have permission.
          return null;
        }

        if (perm.canAskAgain) {
          return Permissions.askAsync(Permissions.CAMERA);
        }
        throw new Error('NO_CAM_PERM');
      })
      .then((perm) => {
        if (perm && !perm.granted) {
          throw new Error('NO_CAM_PERM');
        }
      })
      .catch(() => setErr('Please grant camera permission to scan.'));
  }, []);

  const onCredsScanned = useCallback(({ data }) => {
    if (loggingIn.current) {
      return;
    }

    const dataParts = (data || '').split(':');
    const clientId = dataParts.shift();
    const clientSecret = dataParts.shift();
    const hostname = dataParts.join(':');

    if (!clientId || !clientSecret || !hostname) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Invalid QR Code', ToastAndroid.SHORT);
        return;
      }
      setErr('Invalid QR scanned!');
      return;
    }

    ToastAndroid.show('Scan complete. Logging in..', ToastAndroid.SHORT);
    loggingIn.current = true;
    Promise.all([setServerAddress(hostname), setClientId(clientId), setClientSecret(clientSecret)])
      .then(() => {
        ToastAndroid.show('Logged in successfully', ToastAndroid.SHORT);
        loggingIn.current = false;
      })
      .catch((e) => {
        console.error(e.stack || e);
        loggingIn.current = false;
      });
  }, []);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 12,
      }}
    >
      {err && (
        <TextDisplay size="medium" style={{ color: 'red', marginTop: 16 }}>
          {err}
        </TextDisplay>
      )}
      <BarCodeScanner onBarCodeScanned={onCredsScanned} style={{ flex: 1 }} />
    </View>
  );
}
