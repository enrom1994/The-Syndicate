import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import {
    Crown,
    Briefcase,
    Swords,
    Users,
    TrendingUp,
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
        title: 'Welcome to The Syndicate',
        description: 'Rise from the streets to become the most powerful crime boss in the city.',
        icon: <Crown className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-gold',
        tips: [
            'Build your criminal empire step by step',
            'Compete with players worldwide for dominance',
            'Earn real TON rewards each season',
        ],
    },
    {
        title: 'Your Empire',
        description: 'Your stats determine your power. Train wisely to become unstoppable.',
        icon: <TrendingUp className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-to-br from-green-600 to-green-800',
        tips: [
            'STR - Increases attack damage',
            'DEF - Reduces damage taken',
            'AGI - Improves job success rate',
            'INT - Boosts business income',
        ],
    },
    {
        title: 'Businesses',
        description: 'Invest in businesses for passive income. Upgrade them to earn more.',
        icon: <Briefcase className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-to-br from-blue-600 to-blue-800',
        tips: [
            'Buy businesses to generate hourly income',
            'Collect income before it reaches the cap',
            'Upgrade to increase earnings',
        ],
    },
    {
        title: 'Operations',
        description: 'Complete jobs to earn cash and XP. Attack other players to steal their money.',
        icon: <Swords className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-to-br from-red-600 to-red-800',
        tips: [
            'Jobs are safe but give less rewards',
            'Attacks are risky but can be very rewarding',
            'Higher stats = better success rates',
        ],
    },
    {
        title: 'Join a Family',
        description: 'Families work together to dominate the leaderboard and share rewards.',
        icon: <Users className="w-12 h-12 text-primary-foreground" />,
        iconBg: 'bg-gradient-to-br from-purple-600 to-purple-800',
        tips: [
            'Family members can help defend you',
            'Contribute to the treasury for bonuses',
            'Rise through the ranks to earn privileges',
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
            {/* Skip button */}
            <div className="flex justify-end p-4">
                <button
                    onClick={handleSkip}
                    className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
                >
                    Skip <X className="w-4 h-4" />
                </button>
            </div>

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
                            className={`w-24 h-24 rounded-full ${step.iconBg} flex items-center justify-center mx-auto mb-6`}
                        >
                            {step.icon}
                        </motion.div>

                        {/* Title */}
                        <h1 className="font-cinzel text-2xl font-bold text-foreground mb-3">
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
                        {isLastStep ? "Let's Go!" : 'Next'}
                        {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};
