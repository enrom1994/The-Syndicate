import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Sword, Coins, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';

interface FaqItem {
    question: string;
    answer: string;
}

interface FaqSection {
    title: string;
    icon: React.ReactNode;
    items: FaqItem[];
}

// Collapsible FAQ Item
const FaqItemComponent = ({ question, answer, isOpen, onToggle }: {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}) => (
    <div className="border-b border-muted/20 last:border-b-0">
        <button
            onClick={onToggle}
            className="w-full py-3 px-2 flex items-center justify-between text-left hover:bg-muted/10 transition-colors"
        >
            <span className="font-medium text-sm text-foreground pr-4">{question}</span>
            <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    <p className="px-2 pb-3 text-xs text-muted-foreground leading-relaxed">
                        {answer}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

// Collapsible Section
const FaqSectionComponent = ({ section, openItems, toggleItem }: {
    section: FaqSection;
    openItems: Set<string>;
    toggleItem: (key: string) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="noir-card overflow-hidden mb-4"
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center gap-2 bg-muted/20 hover:bg-muted/30 transition-colors"
            >
                <div className="text-primary">{section.icon}</div>
                <h2 className="font-cinzel font-semibold text-sm text-foreground flex-1 text-left">
                    {section.title}
                </h2>
                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-2">
                            {section.items.map((item, idx) => {
                                const key = `${section.title}-${idx}`;
                                return (
                                    <FaqItemComponent
                                        key={key}
                                        question={item.question}
                                        answer={item.answer}
                                        isOpen={openItems.has(key)}
                                        onToggle={() => toggleItem(key)}
                                    />
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// FAQ Content - Derived from backend truth
const faqSections: FaqSection[] = [
    {
        title: 'Core Gameplay & Progression',
        icon: <HelpCircle className="w-4 h-4" />,
        items: [
            {
                question: 'What is Respect?',
                answer: 'Respect is your primary progression metric. It represents your standing in the underworld and determines your rank title. You gain Respect from completing jobs, heists, and winning PvP combat.'
            },
            {
                question: 'How do I progress?',
                answer: 'Progress by earning Respect through jobs, heists, and combat. Higher Respect unlocks higher rank titles, from Street Thug all the way to Godfather.'
            },
            {
                question: 'What happens when I lose a fight?',
                answer: 'If you lose PvP combat, you lose some Respect. Attackers typically lose more Respect on defeat than defenders gain. Your crew may be temporarily injured but will recover over time.'
            },
            {
                question: 'What is injured crew and how does recovery work?',
                answer: 'Crew injured in PvP are temporarily unavailable for combat. They recover automatically at a steady rate over time. Injured crew do not count toward your combat power and do not cost upkeep while recovering.'
            }
        ]
    },
    {
        title: 'Combat, Risk & Losses',
        icon: <Sword className="w-4 h-4" />,
        items: [
            {
                question: 'Why can I lose even with higher attack?',
                answer: 'Combat outcomes are probabilistic. Higher stats improve your odds of winning, but do not guarantee victory. Every fight carries some risk regardless of your power advantage.'
            },
            {
                question: 'What can I lose from PvP or actions?',
                answer: 'Depending on the attack type, you may lose: Cash on hand, Vault money, Contraband, Respect, or have crew temporarily injured. Different attack types target different resources.'
            },
            {
                question: 'Are fights guaranteed outcomes?',
                answer: 'No. All combat involves chance. Your stats and equipment influence the odds in your favor, but outcomes are never certain. Plan accordingly.'
            },
            {
                question: 'Are there fees or penalties?',
                answer: 'Losing an attack costs you Respect. Certain premium missions require an entry fee that is not refunded on failure. A Shield booster blocks incoming PvP attacks entirely for its duration.'
            }
        ]
    },
    {
        title: 'Economy, Items & Contraband',
        icon: <Coins className="w-4 h-4" />,
        items: [
            {
                question: 'How does contraband production work?',
                answer: 'Production requires a business, available crew, and time. When you start production, you receive the contraband immediately. A cooldown then begins before you can produce again.'
            },
            {
                question: 'Why can\'t I produce something sometimes?',
                answer: 'Production requires available crew members. If all your crew are injured or you have none hired, you cannot produce. The game will indicate when you lack the required crew.'
            },
            {
                question: 'What happens when I contribute to family treasury?',
                answer: 'Cash contributions go directly to the treasury at full value. Contraband contributions are converted to cash value, with a portion taken as a family tax. Both count toward your contribution total.'
            },
            {
                question: 'Why are some items better or worse?',
                answer: 'Items have different stat bonuses based on their type and rarity. Higher rarity items generally provide stronger bonuses. Market prices reflect the relative power of each item.'
            }
        ]
    },
    {
        title: 'Families, Wars & Future Features',
        icon: <Users className="w-4 h-4" />,
        items: [
            {
                question: 'What are Families?',
                answer: 'Families are player organizations. Members can contribute to a shared treasury, coordinate activities, and build collective influence through combined Respect.'
            },
            {
                question: 'What is total respect?',
                answer: 'Total respect is the combined Respect of all family members. It represents your family\'s collective influence and standing among other organizations.'
            },
            {
                question: 'What is territory count?',
                answer: 'Territory systems are planned for future updates. Territory count will become relevant when those features are activated.'
            },
            {
                question: 'Why are some features visible but inactive?',
                answer: 'Some systems exist in preparation for future updates. If a feature appears but does not function, it is not yet active. This is intentional, not a bug.'
            },
            {
                question: 'When do Wars / Seasons start?',
                answer: 'Wars and Seasons are planned features that are not yet active. No launch date has been announced. Updates will be communicated through official channels when ready.'
            }
        ]
    }
];

const FaqPage = () => {
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());

    const toggleItem = (key: string) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    return (
        <MainLayout>
            {/* Background */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/home.png)' }}
            />

            <div className="relative z-10 py-4 px-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <Link
                        to="/profile"
                        className="w-8 h-8 rounded-sm bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-foreground" />
                    </Link>
                    <div>
                        <h1 className="font-cinzel text-lg font-bold text-foreground flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            Help & FAQ
                        </h1>
                        <p className="text-xs text-muted-foreground">How the game works</p>
                    </div>
                </div>

                {/* FAQ Sections */}
                {faqSections.map((section, idx) => (
                    <FaqSectionComponent
                        key={idx}
                        section={section}
                        openItems={openItems}
                        toggleItem={toggleItem}
                    />
                ))}

                {/* Footer Note */}
                <div className="text-center text-[10px] text-muted-foreground mt-4 px-4">
                    <p>This information reflects current game behavior.</p>
                    <p className="mt-1">Some features may change with future updates.</p>
                </div>
            </div>
        </MainLayout>
    );
};

export default FaqPage;
