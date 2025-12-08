import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const QuickActions = () => {
    const navigate = useNavigate();

    const actions = [
        {
            label: 'Tasks',
            iconSrc: '/icons/tasks.png',
            path: '/tasks',
            desc: 'Earn Rewards',
            color: 'bg-blue-500/10 border-blue-500/20',
        },
        {
            label: 'Achievements',
            iconSrc: '/icons/Achievements.png',
            path: '/achievements',
            desc: 'Milestones',
            color: 'bg-yellow-500/10 border-yellow-500/20',
        },
        {
            label: 'Bounties',
            iconSrc: '/icons/bounty.png',
            path: '/bounty-board',
            desc: 'Find Targets',
            color: 'bg-red-500/10 border-red-500/20',
        },
        {
            label: 'Lucky Wheel',
            iconSrc: '/icons/luckywheel.png',
            path: '/lucky-wheel',
            desc: 'Free Spin',
            color: 'bg-purple-500/10 border-purple-500/20',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 mb-6">
            {actions.map((action, index) => (
                <motion.button
                    key={action.path}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(action.path)}
                    className={`relative p-3 rounded-sm border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${action.color}`}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-full bg-background/50 backdrop-blur-sm">
                            <img src={action.iconSrc} alt={action.label} className="w-5 h-5 object-contain" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <div>
                        <h3 className="font-cinzel font-bold text-sm text-foreground">
                            {action.label}
                        </h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {action.desc}
                        </p>
                    </div>
                </motion.button>
            ))}
        </div>
    );
};
