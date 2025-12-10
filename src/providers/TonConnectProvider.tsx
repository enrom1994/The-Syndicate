import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ReactNode, useEffect, useState } from 'react';
import { cleanupTonConnectForUser } from '@/lib/tonConnectCleanup';

// Manifest for the mini app - hosted on Vercel
const manifestUrl = 'https://the-syndicate-rho.vercel.app/tonconnect_manifest.json';

interface TonConnectProviderProps {
  children: ReactNode;
}

/**
 * TonConnectProvider with user isolation
 * 
 * Before initializing TonConnect, we check if the current Telegram user
 * differs from the last known user. If so, we clear all TON Connect
 * localStorage to prevent wallet sharing between users.
 */
export const TonConnectProvider = ({ children }: TonConnectProviderProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get current Telegram user ID
    const tg = window.Telegram?.WebApp;
    const telegramUserId = tg?.initDataUnsafe?.user?.id;

    if (telegramUserId) {
      // Check for user switch and cleanup if needed
      const wasCleanedUp = cleanupTonConnectForUser(telegramUserId);
      if (wasCleanedUp) {
        console.log('[TonConnectProvider] Wallet data cleared for new user');
      }
    } else {
      console.log('[TonConnectProvider] No Telegram user ID available (dev mode?)');
    }

    // Mark as ready to render TonConnectUIProvider
    setIsReady(true);
  }, []);

  // Don't render TonConnectUIProvider until cleanup is done
  if (!isReady) {
    return null;
  }

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
    >
      {children}
    </TonConnectUIProvider>
  );
};
