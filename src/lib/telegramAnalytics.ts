/**
 * Initialize Telegram Mini Apps Analytics
 * 
 * This is required for Telegram Mini App compliance.
 * The analytics token can be obtained from @BotFather when creating your bot.
 * 
 * Set the VITE_TMA_ANALYTICS_TOKEN environment variable.
 */
export const initTelegramAnalytics = async () => {
    const token = import.meta.env.VITE_TMA_ANALYTICS_TOKEN;

    // Only initialize if we have a token
    if (!token) {
        console.debug('[Analytics] No analytics token configured (VITE_TMA_ANALYTICS_TOKEN)');
        return;
    }

    try {
        // Dynamic import to handle potential API changes
        const analytics = await import('@telegram-apps/analytics') as any;

        // Try different init function names (API changed between versions)
        const initFn = analytics.init || analytics.initAnalytics || analytics.default?.init;

        if (typeof initFn === 'function') {
            initFn({
                token,
                appName: 'The Syndicate',
            });
            console.debug('[Analytics] Telegram Mini Apps Analytics initialized');
        } else {
            console.warn('[Analytics] Could not find init function in @telegram-apps/analytics');
        }
    } catch (error) {
        console.warn('[Analytics] Failed to initialize:', error);
    }
};
