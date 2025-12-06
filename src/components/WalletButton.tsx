import { useTonConnectUI } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { GameIcon } from './GameIcon';

export const WalletButton = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = tonConnectUI.wallet;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 gap-2 bg-background/50 backdrop-blur-sm border-primary/20"
      onClick={() => tonConnectUI.openModal()}
    >
      <GameIcon type="ton" className="w-5 h-5" />
      <span className="font-cinzel text-xs">
        {wallet ?
          `${wallet.account.address.slice(0, 4)}...${wallet.account.address.slice(-4)}` :
          'Connect Wallet'
        }
      </span>
    </Button>
  );
};
