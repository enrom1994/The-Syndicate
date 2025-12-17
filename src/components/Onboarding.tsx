import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import {
    Crown,
    Briefcase,
    Swords,
    Shield,
    AlertTriangle,
    ChevronRight,
    ChevronLeft,
    X,
} from 'lucide-react';

interface OnboardingStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    tips: string[];
}

const onboardingSteps: OnboardingStep[] = [
    {
        title: '18+ Warning',
        description: 'This game contains crime-related themes, violence, PvP interactions, and player-driven conflict.',
        icon: <AlertTriangle className="w-12 h-12 text-red-400" />,
        iconBg: 'bg-gradient-to-br from-red-600 to-red-900',
        tips: [
            'By continuing, you confirm you are 18 years or older',
            'Game involves competitive player vs player combat',
            'Real money (TON) rewards are available',
        ],
    },
    {
        title: 'Welcome to The Syndicate',
        description: 'You\'re starting from nothing. Build your criminal empire and compete for real TON rewards.',
        icon: <Crown className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-gold',
        tips: [
            'Rise from street thug to boss',
            'Top players earn real TON each season',
            'Every decision has consequences',
        ],
    },
    {
        title: 'You Are a Target',
        description: 'Other players can attack you to steal cash. If you are unprotected, you will lose money.',
        icon: <Shield className="w-12 h-12 text-cyan-400" />,
        iconBg: 'bg-gradient-to-br from-cyan-600 to-cyan-900',
        tips: [
            'PvP attacks are real and costly',
            'Shields block all attacks completely',
            'Protection keeps your operation safe',
        ],
    },
    {
        title: 'Your Power',
        description: 'Your stats determine your combat effectiveness. Train wisely to survive.',
        icon: <Swords className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-to-br from-red-600 to-red-800',
        tips: [
            'STR - Affects attack strength',
            'DEF - Affects defense against attacks',
            'Crew and items increase these stats',
        ],
    },
    {
        title: 'Businesses',
        description: 'Invest in businesses for passive income. Collect regularly before reaching the cap.',
        icon: <Briefcase className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-to-br from-blue-600 to-blue-800',
        tips: [
            'Generates hourly income automatically',
            'Higher income makes you a bigger target',
            'Use the Bank to protect your earnings',
        ],
    },
    {
        title: 'PvP Combat',
        description: 'Attacks are high-risk, high-reward. Know the rules before you strike.',
        icon: <Swords className="w-12 h-12 text-orange-400" />,
        iconBg: 'bg-gradient-to-br from-orange-600 to-red-700',
        tips: [
            'Attacks cost $500-$2,000 depending on your tier',
            'Shields block attacks - fee refunded if target is shielded',
            'Failed attacks = respect loss + crew deaths',
            'Victims can revenge you within 24 hours',
        ],
    },
    {
        title: 'Become a Made Man',
        description: 'Join the elite. Get initiated into the family with the Starter Pack.',
        icon: <span className="text-5xl">🏅</span>,
        iconBg: 'bg-gradient-to-br from-yellow-600 to-orange-700',
        tips: [
            '✨ Made Man badge (prestige only)',
            '💰 $25K cash + 120 diamonds',
            '🏢 Speakeasy business + items',
            '⏰ Available for 24 hours only',
        ],
    },
];

const ONBOARDING_KEY = 'mafia_onboarding_complete';

export const useOnboarding = () => {
    const [isComplete, setIsComplete] = useState(() => {
        return localStorage.getItem(ONBOARDING_KEY) === 'true';
    });

    const complete = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setIsComplete(true);
    };

    const reset = () => {
        localStorage.removeItem(ONBOARDING_KEY);
        setIsComplete(false);
    };

    return { isComplete, complete, reset };
};

interface OnboardingProps {
    onComplete: () => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const step = onboardingSteps[currentStep];
    const isLastStep = currentStep === onboardingSteps.length - 1;
    const isFirstStep = currentStep === 0;

    const handleNext = () => {
        haptic.light();
        if (isLastStep) {
            onComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        haptic.light();
        if (!isFirstStep) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        haptic.light();
        onComplete();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
        >
            {/* Skip button - hidden on first step (PG+18) */}
            {!isFirstStep && (
                <div className="flex justify-end p-4">
                    <button
                        onClick={handleSkip}
                        className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
                    >
                        Skip <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="text-center max-w-sm"
                    >
                        {/* Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.1 }}
                            className={`w-24 h-24 rounded-full ${step.iconBg} flex items-center justify-center mx-auto mb-6 ${currentStep === 0 ? 'ring-2 ring-red-500' : ''
                                }`}
                        >
                            {step.icon}
                        </motion.div>

                        {/* Title */}
                        <h1 className={`font-cinzel text-2xl font-bold mb-3 ${currentStep === 0 ? 'text-red-400' : 'text-foreground'
                            }`}>
                            {step.title}
                        </h1>

                        {/* Description */}
                        <p className="text-muted-foreground mb-6">{step.description}</p>

                        {/* Tips */}
                        <div className="noir-card p-4 text-left space-y-2">
                            {step.tips.map((tip, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className="flex items-start gap-2"
                                >
                                    <span className="text-primary text-xs">▸</span>
                                    <span className="text-sm text-foreground/80">{tip}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Special warning for PG+18 */}
                        {currentStep === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                            >
                                <p className="text-xs text-red-400 font-semibold">
                                    You must be 18+ to play this game
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="p-6 space-y-4">
                {/* Progress dots */}
                <div className="flex justify-center gap-2">
                    {onboardingSteps.map((_, index) => (
                        <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all ${index === currentStep
                                    ? 'w-6 bg-primary'
                                    : index < currentStep
                                        ? 'bg-primary/50'
                                        : 'bg-muted'
                                }`}
                        />
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    {!isFirstStep && (
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            className="flex-1"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                    )}
                    <Button
                        onClick={handleNext}
                        className={`btn-gold ${isFirstStep ? 'w-full' : 'flex-1'}`}
                    >
                        {isFirstStep
                            ? 'I Am 18+ - Continue'
                            : isLastStep
                                ? "Let's Go!"
                                : 'Next'}
                        {!isLastStep && !isFirstStep && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};
