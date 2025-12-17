import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ContextualTooltipProps {
    id: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children: React.ReactNode;
    offset?: number;
}

export const useContextualTooltip = (id: string) => {
    const key = `mafia_tooltip_dismissed_${id}`;
    const [isDismissed, setIsDismissed] = useState(() => {
        return localStorage.getItem(key) === 'true';
    });

    const dismiss = () => {
        localStorage.setItem(key, 'true');
        setIsDismissed(true);
    };

    const reset = () => {
        localStorage.removeItem(key);
        setIsDismissed(false);
    };

    return { isDismissed, dismiss, reset };
};

export const ContextualTooltip = ({
    id,
    content,
    position = 'top',
    children,
    offset = 8,
}: ContextualTooltipProps) => {
    const { isDismissed, dismiss } = useContextualTooltip(id);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!isDismissed) {
            // Delay tooltip appearance slightly for better UX
            const timer = setTimeout(() => setShow(true), 500);
            return () => clearTimeout(timer);
        }
    }, [isDismissed]);

    if (isDismissed || !show) {
        return <>{children}</>;
    }

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary',
        left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary',
        right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary',
    };

    return (
        <div className="relative inline-block">
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`absolute ${positionClasses[position]} z-50`}
                    >
                        <div className="relative bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg max-w-xs">
                            {/* Arrow */}
                            <div
                                className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
                            />

                            {/* Content */}
                            <p className="text-xs leading-tight pr-6">{content}</p>

                            {/* Dismiss button */}
                            <button
                                onClick={dismiss}
                                className="absolute top-1 right-1 text-primary-foreground/70 hover:text-primary-foreground"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
