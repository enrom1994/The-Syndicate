import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorial, TutorialStep } from '@/contexts/TutorialContext';
import { haptic } from '@/lib/haptics';

interface TutorialTooltipProps {
    step: TutorialStep;
    position?: 'top' | 'bottom' | 'left' | 'right';
    onAction?: () => void;
    actionLabel?: string;
}

export const TutorialTooltip = ({
    step,
    position = 'bottom',
    onAction,
    actionLabel = 'Got it',
}: TutorialTooltipProps) => {
    const { markStepComplete, dismissTutorial } = useTutorial();

    const handleAction = () => {
        haptic.light();
        if (onAction) {
            onAction();
        }
        markStepComplete(step.id);
    };

    const handleSkip = () => {
        haptic.light();
        dismissTutorial();
    };

    // Position classes
    const positionClasses = {
        top: 'bottom-full mb-2',
        bottom: 'top-full mt-2',
        left: 'right-full mr-2',
        right: 'left-full ml-2',
    };

    // Arrow classes
    const arrowClasses = {
        top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-amber-500/50',
        bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-amber-500/50',
        left: 'right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-amber-500/50',
        right: 'left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-amber-500/50',
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: position === 'bottom' ? -10 : 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute z-50 ${positionClasses[position]} w-72`}
            >
                {/* Arrow */}
                <div
                    className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
                />

                {/* Content */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-500/30 rounded-lg p-4 shadow-lg shadow-amber-500/10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="font-cinzel text-sm font-bold text-amber-300">
                            {step.title}
                        </h3>
                        <button
                            onClick={handleSkip}
                            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        {step.description}
                    </p>

                    {/* Reward preview */}
                    {step.reward && (
                        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-amber-500/10 rounded-md">
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs text-amber-300">
                                Complete for +{step.reward.amount.toLocaleString()}{' '}
                                {step.reward.type === 'diamonds' ? '💎' : '$'}
                            </span>
                        </div>
                    )}

                    {/* Action button */}
                    <Button
                        onClick={handleAction}
                        size="sm"
                        className="w-full btn-gold text-xs py-2"
                    >
                        {actionLabel}
                        <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
