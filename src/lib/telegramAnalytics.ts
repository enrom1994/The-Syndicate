import { init as initAnalytics } from '@telegram-apps/analytics';

/**
 * Initialize Telegram Mini Apps Analytics
 * 
 * This is required for Telegram Mini App compliance.
 * The analytics token can be obtained from @BotFather when creating your bot.
 * 
 * Set the VITE_TMA_ANALYTICS_TOKEN environment variable.
 */
export const initTelegramAnalytics = () => {
    const token = import.meta.env.VITE_TMA_ANALYTICS_TOKEN;

    // Only initialize if we have a token and we're in a Telegram context
    if (!token) {
        console.debug('[Analytics] No analytics token configured (VITE_TMA_ANALYTICS_TOKEN)');
        return;
    }

    try {
        initAnalytics({
            token,
            appName: 'The Syndicate',
        });
        console.debug('[Analytics] Telegram Mini Apps Analytics initialized');
    } catch (error) {
        console.warn('[Analytics] Failed to initialize:', error);
    }
};
