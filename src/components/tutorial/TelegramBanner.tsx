import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/contexts/TutorialContext';
import { haptic } from '@/lib/haptics';

// Official Telegram channel
const TELEGRAM_CHANNEL_URL = 'https://t.me/TheSyndicateOfficialgamebot';

export const TelegramBanner = () => {
    const { isStepActive, markStepComplete } = useTutorial();

    // Only show for the telegram step
    if (!isStepActive('telegram')) return null;

    const handleJoin = () => {
        haptic.medium();
        window.open(TELEGRAM_CHANNEL_URL, '_blank');
        // Mark complete after opening
        setTimeout(() => markStepComplete('telegram'), 500);
    };

    const handleLater = () => {
        haptic.light();
        markStepComplete('telegram');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mx-4 mb-4"
            >
                <div className="relative bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                    {/* Close button */}
                    <button
                        onClick={handleLater}
                        className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Telegram icon */}
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">📢</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-cinzel text-sm font-bold text-blue-300 mb-0.5">
                                Join Our Telegram
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Get updates, tips & exclusive giveaways
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <Button
                            onClick={handleJoin}
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            Join Channel
                        </Button>
                        <Button
                            onClick={handleLater}
                            size="sm"
                            variant="ghost"
                            className="text-xs text-muted-foreground"
                        >
                            Later
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
