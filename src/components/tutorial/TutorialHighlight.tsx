import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { TutorialTooltip } from './TutorialTooltip';

interface TutorialHighlightProps {
    stepId: string;
    children: ReactNode;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * Wraps a component with a pulsing highlight when the tutorial step is active.
 * Shows a tooltip explaining what to do.
 */
export const TutorialHighlight = ({
    stepId,
    children,
    tooltipPosition = 'top',
    actionLabel,
    onAction,
}: TutorialHighlightProps) => {
    const { isStepActive, currentStep } = useTutorial();

    const isActive = isStepActive(stepId);

    if (!isActive || !currentStep) {
        return <>{children}</>;
    }

    return (
        <div className="relative">
            {/* Pulsing ring effect */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 -m-1 rounded-lg pointer-events-none"
            >
                <div className="absolute inset-0 rounded-lg border-2 border-amber-400/50 animate-pulse" />
                <div
                    className="absolute inset-0 rounded-lg"
                    style={{
                        boxShadow: '0 0 20px rgba(245, 158, 11, 0.3), inset 0 0 20px rgba(245, 158, 11, 0.1)',
                    }}
                />
            </motion.div>

            {/* The actual content */}
            <div className="relative z-10">
                {children}
            </div>

            {/* Tutorial tooltip */}
            <TutorialTooltip
                step={currentStep}
                position={tooltipPosition}
                actionLabel={actionLabel}
                onAction={onAction}
            />
        </div>
    );
};
