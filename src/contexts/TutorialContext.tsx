import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    targetPage: string;
    targetElement?: string;
    reward?: { type: 'diamonds' | 'cash'; amount: number };
    completed: boolean;
}

interface TutorialContextType {
    currentStepIndex: number;
    steps: TutorialStep[];
    isActive: boolean;
    currentStep: TutorialStep | null;
    markStepComplete: (stepId: string) => void;
    dismissTutorial: () => void;
    resetTutorial: () => void;
    getStepForPage: (page: string) => TutorialStep | null;
    isStepActive: (stepId: string) => boolean;
    completedCount: number;
    totalSteps: number;
}

const TUTORIAL_STORAGE_KEY = 'mafia_tutorial_progress';

const defaultSteps: TutorialStep[] = [
    {
        id: 'telegram',
        title: 'Join Our Community',
        description: 'Get updates, tips, and exclusive giveaways in our Telegram channel.',
        targetPage: 'dashboard',
        completed: false,
    },
    {
        id: 'business',
        title: 'Buy Your First Business',
        description: 'Businesses generate passive income 24/7. Start earning while you sleep!',
        targetPage: '/business',
        targetElement: 'business-card',
        completed: false,
    },
    {
        id: 'crew',
        title: 'Hire Your First Crew',
        description: 'Crew members boost your attack and defense. Strength in numbers!',
        targetPage: '/hire',
        targetElement: 'hire-card',
        reward: { type: 'cash', amount: 1000 },
        completed: false,
    },
    {
        id: 'job',
        title: 'Complete Your First Job',
        description: 'Jobs are fast money. 30 seconds for guaranteed cash and respect.',
        targetPage: '/ops',
        targetElement: 'job-card',
        reward: { type: 'diamonds', amount: 5 },
        completed: false,
    },
    {
        id: 'bank',
        title: 'Protect Your Money',
        description: 'Banked cash cannot be stolen by other players. Always bank your earnings!',
        targetPage: '/bank',
        targetElement: 'bank-deposit',
        completed: false,
    },
];

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};

interface TutorialProviderProps {
    children: React.ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
    const [steps, setSteps] = useState<TutorialStep[]>(() => {
        try {
            const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new steps added later
                return defaultSteps.map(defaultStep => ({
                    ...defaultStep,
                    completed: parsed.completedSteps?.includes(defaultStep.id) || false,
                }));
            }
        } catch (e) {
            console.error('Failed to load tutorial progress:', e);
        }
        return defaultSteps;
    });

    const [isDismissed, setIsDismissed] = useState(() => {
        return localStorage.getItem(TUTORIAL_STORAGE_KEY + '_dismissed') === 'true';
    });

    // Find the first incomplete step
    const currentStepIndex = steps.findIndex(s => !s.completed);
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
    const isActive = !isDismissed && currentStep !== null;
    const completedCount = steps.filter(s => s.completed).length;
    const totalSteps = steps.length;

    // Save progress to localStorage
    useEffect(() => {
        const completedSteps = steps.filter(s => s.completed).map(s => s.id);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ completedSteps }));
    }, [steps]);

    const markStepComplete = useCallback((stepId: string) => {
        setSteps(prev => prev.map(step =>
            step.id === stepId ? { ...step, completed: true } : step
        ));
    }, []);

    const dismissTutorial = useCallback(() => {
        setIsDismissed(true);
        localStorage.setItem(TUTORIAL_STORAGE_KEY + '_dismissed', 'true');
    }, []);

    const resetTutorial = useCallback(() => {
        setSteps(defaultSteps);
        setIsDismissed(false);
        localStorage.removeItem(TUTORIAL_STORAGE_KEY);
        localStorage.removeItem(TUTORIAL_STORAGE_KEY + '_dismissed');
    }, []);

    const getStepForPage = useCallback((page: string): TutorialStep | null => {
        if (!isActive) return null;
        // Only return step if it's the current active step and matches the page
        if (currentStep?.targetPage === page && !currentStep.completed) {
            return currentStep;
        }
        return null;
    }, [isActive, currentStep]);

    const isStepActive = useCallback((stepId: string): boolean => {
        return isActive && currentStep?.id === stepId;
    }, [isActive, currentStep]);

    return (
        <TutorialContext.Provider
            value={{
                currentStepIndex,
                steps,
                isActive,
                currentStep,
                markStepComplete,
                dismissTutorial,
                resetTutorial,
                getStepForPage,
                isStepActive,
                completedCount,
                totalSteps,
            }}
        >
            {children}
        </TutorialContext.Provider>
    );
};
