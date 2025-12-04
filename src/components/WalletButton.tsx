import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export const WalletButton = () => {
  const wallet = useTonWallet();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {!wallet ? (
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <TonConnectButton className="ton-connect-btn" />
        </div>
      ) : (
        <TonConnectButton className="ton-connect-btn" />
      )}
    </motion.div>
  );
};
