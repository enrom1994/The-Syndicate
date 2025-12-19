// TON Blockchain Configuration

// The receiving wallet address for all TON payments
// Can be overridden via environment variable for easy wallet changes without code deployment
export const TON_RECEIVING_ADDRESS = import.meta.env.VITE_TON_RECEIVING_ADDRESS || 'UQBwSrL92eTOv4UuYgs01xDe5LtY9rQgG7fpdbOpPxoBce28';

// Diamond package prices in TON
export const DIAMOND_PACKAGES = [
    { name: 'Small', tonPrice: 1, diamonds: 120 },
    { name: 'Standard', tonPrice: 3, diamonds: 420, bonus: 60 },
    { name: 'Value', tonPrice: 10, diamonds: 1600, bonus: 400, popular: true },
    { name: 'Godfather', tonPrice: 30, diamonds: 5000, bonus: 1500 },
];

// Protection pack prices in TON
export const PROTECTION_PACKS = [
    { id: 'basic', name: 'Basic Protection', tonPrice: 0.1, durationMinutes: 60 },
    { id: 'standard', name: 'Standard Protection', tonPrice: 0.4, durationMinutes: 360 },
    { id: 'premium', name: 'Premium Protection', tonPrice: 1, durationMinutes: 1440 },
];

/**
 * Convert TON to nanoTON (1 TON = 10^9 nanoTON)
 * Uses string-based conversion to avoid floating point precision issues
 * @param ton - Amount in TON (e.g., 1.5)
 * @returns Amount in nanoTON as bigint
 */
export const toNanoTon = (ton: number): bigint => {
    // Convert to string with 9 decimal places to preserve precision
    const tonString = ton.toFixed(9);
    const [whole, decimal = ''] = tonString.split('.');

    // Pad decimal to exactly 9 digits
    const paddedDecimal = decimal.padEnd(9, '0').slice(0, 9);

    // Combine whole + decimal as nanoTON
    const nanoTonString = whole + paddedDecimal;

    // Remove leading zeros and convert to BigInt
    return BigInt(nanoTonString.replace(/^0+/, '') || '0');
};

/**
 * Transaction timeout in seconds (10 minutes)
 * After this time, the wallet will reject the transaction
 */
export const TRANSACTION_TIMEOUT_SECONDS = 600;

/**
 * Get a transaction object with proper timeout
 * @param address - Receiving wallet address
 * @param tonAmount - Amount in TON
 * @returns Transaction object for TonConnect
 */
export const createTonTransaction = (address: string, tonAmount: number) => ({
    validUntil: Math.floor(Date.now() / 1000) + TRANSACTION_TIMEOUT_SECONDS,
    messages: [
        {
            address,
            amount: toNanoTon(tonAmount).toString(),
        }
    ]
});
