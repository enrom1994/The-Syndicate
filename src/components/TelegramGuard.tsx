import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, AlertTriangle } from 'lucide-react';

interface TelegramGuardProps {
    children: React.ReactNode;
}

/**
 * TelegramGuard Component
 * 
 * Blocks access to the app when not running inside Telegram.
 * Shows a friendly message directing users to open the app via Telegram.
 */
export const TelegramGuard = ({ children }: TelegramGuardProps) => {
    const [isTelegram, setIsTelegram] = useState<boolean | null>(null);

    useEffect(() => {
        // Check if running inside Telegram WebApp
        const checkTelegram = () => {
            const tg = window.Telegram?.WebApp;

            // Check for Telegram WebApp object and valid initData
            if (tg && tg.initData && tg.initData.length > 0) {
                setIsTelegram(true);
                return;
            }

            // Also check for Telegram user agent as fallback
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('telegram')) {
                setIsTelegram(true);
                return;
            }

            // Allow localhost for development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn('[TelegramGuard] Development mode - bypassing Telegram check');
                setIsTelegram(true);
                return;
            }

            setIsTelegram(false);
        };

        // Small delay to ensure Telegram WebApp SDK has loaded
        const timer = setTimeout(checkTelegram, 100);
        return () => clearTimeout(timer);
    }, []);

    // Still checking
    if (isTelegram === null) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="font-cinzel text-primary text-sm tracking-wider">
                        THE SYNDICATE
                    </p>
                </motion.div>
            </div>
        );
    }

    // Not in Telegram - show block screen
    if (!isTelegram) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-sm text-center"
                >
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Smartphone className="w-10 h-10 text-primary" />
                    </div>

                    {/* Title */}
                    <h1 className="font-cinzel text-2xl font-bold text-foreground mb-2">
                        Telegram Required
                    </h1>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm mb-6">
                        The Syndicate can only be played inside the Telegram app.
                        Open this game through our Telegram bot to continue.
                    </p>

                    {/* Warning Card */}
                    <div className="noir-card p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div className="text-left">
                                <p className="text-xs text-foreground font-medium mb-1">
                                    How to play:
                                </p>
                                <ol className="text-xs text-muted-foreground space-y-1">
                                    <li>1. Open Telegram</li>
                                    <li>2. Search for our bot</li>
                                    <li>3. Tap "Play" or "Start"</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Telegram Link Button */}
                    <a
                        href="https://t.me/The_Syndicate_Game_Bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 btn-gold px-6 py-3 rounded-lg font-cinzel text-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                        Open in Telegram
                    </a>

                    {/* Footer */}
                    <p className="text-[10px] text-muted-foreground mt-6">
                        © 2024 The Syndicate • A Telegram Mini App Game
                    </p>
                </motion.div>
            </div>
        );
    }

    // In Telegram - render the app
    return <>{children}</>;
};

export default TelegramGuard;
