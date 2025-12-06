/**
 * Telegram Mini App Haptic Feedback Utilities
 * Uses the Telegram WebApp API for native haptic feedback
 */

interface HapticFeedback {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
}

const getHaptic = (): HapticFeedback | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram;
    return tg?.WebApp?.HapticFeedback;
};

export const haptic = {
    /** Light impact - for subtle UI feedback */
    light: () => getHaptic()?.impactOccurred('light'),

    /** Medium impact - for button presses */
    medium: () => getHaptic()?.impactOccurred('medium'),

    /** Heavy impact - for significant actions */
    heavy: () => getHaptic()?.impactOccurred('heavy'),

    /** Soft impact - for gentle feedback */
    soft: () => getHaptic()?.impactOccurred('soft'),

    /** Rigid impact - for firm feedback */
    rigid: () => getHaptic()?.impactOccurred('rigid'),

    /** Success notification - for completed actions */
    success: () => getHaptic()?.notificationOccurred('success'),

    /** Warning notification - for caution states */
    warning: () => getHaptic()?.notificationOccurred('warning'),

    /** Error notification - for failed actions */
    error: () => getHaptic()?.notificationOccurred('error'),

    /** Selection changed - for toggle/switch feedback */
    selection: () => getHaptic()?.selectionChanged(),
};

// Convenience aliases
export const vibrate = {
    click: haptic.light,
    tap: haptic.soft,
    button: haptic.medium,
    action: haptic.heavy,
    claim: haptic.success,
    attack: haptic.rigid,
    fail: haptic.error,
};
