/*
 * GlobePen PWA plumbing: service-worker registration, update detection and
 * install-prompt handling. Everything here is best-effort — the app must work
 * perfectly when service workers are unsupported (older Safari, private mode).
 */
import { useEffect, useState } from 'react';

type UpdateListener = (registration: ServiceWorkerRegistration) => void;

const listeners = new Set<UpdateListener>();
let reloadScheduled = false;

function notify(registration: ServiceWorkerRegistration) {
  listeners.forEach((listener) => listener(registration));
}

/** Called by the UI once the user consents; never reloads without consent. */
export function applyPwaUpdate(registration: ServiceWorkerRegistration) {
  const waiting = registration.waiting;
  if (!waiting) return;
  waiting.postMessage('SKIP_WAITING');
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      // A controller change means the new worker took over; one reload, once.
      if (reloadScheduled) return;
      reloadScheduled = true;
      window.location.reload();
    },
    { once: true }
  );
}

/** Subscribe to "a newer app version is waiting" notifications. */
export function onPwaUpdate(listener: UpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Registers /sw.js and surfaces update availability. Updates are never applied
 * automatically: the app shows an action and applies it on user consent.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // Service workers require a secure context (https or localhost).
  if (window.location.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)(:|$)/.test(window.location.hostname)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // Only an update (not the very first install) should surface a prompt.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) notify(registration);
          });
        });

        if (registration.waiting && navigator.serviceWorker.controller) notify(registration);

        // Re-check periodically and when the tab becomes visible again.
        window.setInterval(() => {
          registration.update().catch(() => undefined);
        }, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
        });
      })
      .catch(() => {
        // Service workers are an enhancement; failures are non-fatal.
      });
  });
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media || ios;
}

export interface InstallPromptState {
  canInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Install affordance state. `canInstall` is true only when the browser fired
 * `beforeinstallprompt`, so no fake install button is ever shown.
 */
export function useInstallPrompt(): InstallPromptState {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(isStandaloneDisplay);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = () => setIsStandalone(isStandaloneDisplay());

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onDisplayChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplayChange);
    };
  }, []);

  const isIOS =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !/crios|fxios|edgios|opt/i.test(window.navigator.userAgent);

  const promptInstall = async () => {
    if (!promptEvent) return 'unavailable';
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setPromptEvent(null);
    return outcome;
  };

  return {
    canInstall: Boolean(promptEvent) && !isStandalone && !installed,
    isStandalone,
    isIOS,
    promptInstall,
  };
}