import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ReactNode } from 'react';

// Manifest for the mini app
const manifestUrl = 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-wallet/test/public/tonconnect-manifest.json';

interface TonConnectProviderProps {
  children: ReactNode;
}

export const TonConnectProvider = ({ children }: TonConnectProviderProps) => {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
};
