import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { GameIcon } from './GameIcon';
import { LogOut } from 'lucide-react';

export const WalletButton = () => {
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);

  const isConnected = !!userFriendlyAddress;

  // Format address for display - use user-friendly format
  const displayAddress = userFriendlyAddress
    ? `${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}`
    : null;

  const handleClick = () => {
    if (isConnected) {
      // If connected, disconnect
      tonConnectUI.disconnect();
    } else {
      // If not connected, open modal
      tonConnectUI.openModal();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 gap-2 bg-background/50 backdrop-blur-sm border-primary/20"
      onClick={handleClick}
    >
      <GameIcon type="ton" className="w-5 h-5" />
      <span className="font-cinzel text-xs">
        {displayAddress || 'Connect Wallet'}
      </span>
      {isConnected && (
        <LogOut className="w-3 h-3 ml-1 text-muted-foreground" />
      )}
    </Button>
  );
};
