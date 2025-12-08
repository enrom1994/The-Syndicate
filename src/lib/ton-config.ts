// TON Blockchain Configuration

// The receiving wallet address for all TON payments
export const TON_RECEIVING_ADDRESS = 'UQBwSrL92eTOv4UuYgs01xDe5LtY9rQgG7fpdbOpPxoBce28';

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

// Convert TON to nanoTON (1 TON = 10^9 nanoTON)
export const toNanoTon = (ton: number): bigint => {
    return BigInt(Math.floor(ton * 1_000_000_000));
};
