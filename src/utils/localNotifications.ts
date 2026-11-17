export type LocalNotificationState = NotificationPermission | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): LocalNotificationState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestLocalNotificationPermission(): Promise<LocalNotificationState> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Triggers a 100% on-device local notification via ServiceWorkerRegistration
 * when available, or falls back to the standard Web Notification API.
 * Never contacts any external push server and requires zero user login.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  enabled: boolean
): Promise<boolean> {
  if (!enabled || !isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'pdf-studio-local-event',
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 400)),
      ]);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
