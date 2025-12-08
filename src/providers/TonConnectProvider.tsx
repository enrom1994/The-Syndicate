import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ReactNode } from 'react';

// Manifest for the mini app - hosted on Vercel
const manifestUrl = 'https://the-syndicate-rho.vercel.app/tonconnect_manifest.json';

interface TonConnectProviderProps {
  children: ReactNode;
}

export const TonConnectProvider = ({ children }: TonConnectProviderProps) => {
  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
    >
      {children}
    </TonConnectUIProvider>
  );
};
