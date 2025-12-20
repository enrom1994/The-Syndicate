import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';
import { haptic } from '@/lib/haptics';
import { useNavigate } from 'react-router-dom';

export const TutorialProgress = () => {
    const { steps, isActive, completedCount, totalSteps, currentStep, dismissTutorial } = useTutorial();
    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();

    // Don't show if tutorial is inactive or all complete
    if (!isActive) return null;

    const toggleExpand = () => {
        haptic.light();
        setIsExpanded(!isExpanded);
    };

    const handleStepClick = (targetPage: string) => {
        haptic.light();
        if (targetPage === 'dashboard') {
            navigate('/');
        } else {
            navigate(targetPage);
        }
        setIsExpanded(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-20 right-4 z-40"
        >
            {/* Collapsed view */}
            <motion.button
                onClick={toggleExpand}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-600/20 to-amber-500/10 border border-amber-500/30 rounded-full shadow-lg shadow-amber-500/10 backdrop-blur-sm"
            >
                <ListChecks className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-300">
                    {completedCount}/{totalSteps}
                </span>
                {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-amber-400" />
                ) : (
                    <ChevronUp className="w-3 h-3 text-amber-400" />
                )}
            </motion.button>

            {/* Expanded checklist */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-12 right-0 w-64 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-500/30 rounded-lg p-3 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-cinzel text-sm font-bold text-amber-300">
                                New Boss Checklist
                            </h3>
                            <button
                                onClick={() => { dismissTutorial(); setIsExpanded(false); }}
                                className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
                            >
                                Skip all
                            </button>
                        </div>

                        <div className="space-y-2">
                            {steps.map((step, index) => (
                                <button
                                    key={step.id}
                                    onClick={() => !step.completed && handleStepClick(step.targetPage)}
                                    disabled={step.completed}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${step.completed
                                            ? 'opacity-50 cursor-default'
                                            : currentStep?.id === step.id
                                                ? 'bg-amber-500/10 border border-amber-500/20'
                                                : 'hover:bg-white/5'
                                        }`}
                                >
                                    {step.completed ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    ) : (
                                        <Circle className={`w-4 h-4 flex-shrink-0 ${currentStep?.id === step.id ? 'text-amber-400' : 'text-muted-foreground/30'
                                            }`} />
                                    )}
                                    <span className={`text-xs ${step.completed
                                            ? 'text-muted-foreground line-through'
                                            : currentStep?.id === step.id
                                                ? 'text-foreground'
                                                : 'text-muted-foreground'
                                        }`}>
                                        {index + 1}. {step.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
