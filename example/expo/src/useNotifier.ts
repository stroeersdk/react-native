import { useCallback, useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';

const MAX_EVENTS = 20;

/**
 * Small helper that reports SDK events to the user, like the Toasts of the Android example.
 *  - Android: shows a ToastAndroid.
 *  - iOS: has no toast, so the message only appears in the on-screen event log.
 * The log is kept on both platforms (newest first, last 20 entries).
 */
export function useNotifier() {
  const [events, setEvents] = useState<string[]>([]);

  const notify = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
    const time = new Date().toLocaleTimeString();
    setEvents(previous => [`${time}  ${message}`, ...previous].slice(0, MAX_EVENTS));
  }, []);

  return { events, notify };
}
