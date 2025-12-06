import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, DollarSign, Clock, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface BusinessCardProps {
    name: string;
    description: string;
    image: string;
    level: number;
    maxLevel: number;
    income: number;
    upgradeCost: number;
    cooldown: string;
    owned: boolean;
    delay?: number;
    onBuy: () => void;
    onUpgrade: () => void;
}

const BusinessCard = ({
    name,
    description,
    image,
    level,
    maxLevel,
    income,
    upgradeCost,
    cooldown,
    owned,
    delay = 0,
    onBuy,
    onUpgrade
}: BusinessCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start gap-3 mb-3">
            <div className="w-16 h-16 rounded-sm bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="w-8 h-8 text-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/></svg></div>';
                    }}
                />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                    {owned && (
                        <span className="text-xs text-primary font-medium">Lv. {level}/{maxLevel}</span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-muted/20 rounded-sm p-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    <span>Income</span>
                </div>
                <p className="font-cinzel font-bold text-sm text-primary">${income.toLocaleString()}/hr</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Collect</span>
                </div>
                <p className="font-cinzel font-bold text-sm text-foreground">{cooldown}</p>
            </div>
        </div>

        {owned ? (
            <div className="flex gap-2">
                <Button className="flex-1 btn-gold text-xs" disabled={level >= maxLevel} onClick={onUpgrade}>
                    <ArrowUp className="w-4 h-4 mr-1" />
                    Upgrade ${upgradeCost.toLocaleString()}
                </Button>
                <Button variant="outline" className="flex-1 text-xs">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Collect
                </Button>
            </div>
        ) : (
            <Button className="w-full btn-gold text-xs" onClick={onBuy}>
                Buy for ${upgradeCost.toLocaleString()}
            </Button>
        )}
    </motion.div>
);

const BusinessPage = () => {
    const { toast } = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'buy' | 'upgrade', business: string, cost: number } | null>(null);

    const businesses = [
        {
            name: 'Speakeasy',
            description: 'Underground bar serving bootleg liquor',
            image: '/images/businesses/speakeasy.png',
            level: 3,
            maxLevel: 10,
            income: 5000,
            upgradeCost: 25000,
            cooldown: '1h',
            owned: true
        },
        {
            name: 'Casino',
            description: 'Illegal gambling den for high rollers',
            image: '/images/businesses/casino.png',
            level: 1,
            maxLevel: 10,
            income: 15000,
            upgradeCost: 75000,
            cooldown: '2h',
            owned: true
        },
        {
            name: 'Nightclub',
            description: 'Jazz club and front for money laundering',
            image: '/images/businesses/nightclub.png',
            level: 0,
            maxLevel: 10,
            income: 8000,
            upgradeCost: 50000,
            cooldown: '1h 30m',
            owned: false
        },
        {
            name: 'Smuggling Route',
            description: 'Import contraband from overseas',
            image: '/images/businesses/smugglingroute.png',
            level: 0,
            maxLevel: 10,
            income: 25000,
            upgradeCost: 150000,
            cooldown: '4h',
            owned: false
        },
        {
            name: 'Protection Racket',
            description: 'Collect protection money from local businesses',
            image: '/images/businesses/protectionracket.png',
            level: 0,
            maxLevel: 10,
            income: 3000,
            upgradeCost: 15000,
            cooldown: '30m',
            owned: false
        },
        {
            name: 'Loan Sharking',
            description: 'High-interest loans to desperate borrowers',
            image: '/images/businesses/loansharking.png',
            level: 0,
            maxLevel: 10,
            income: 12000,
            upgradeCost: 80000,
            cooldown: '3h',
            owned: false
        },
    ];

    const handleAction = (type: 'buy' | 'upgrade', business: string, cost: number) => {
        setPendingAction({ type, business, cost });
        setConfirmOpen(true);
    };

    const confirmAction = () => {
        if (pendingAction) {
            toast({
                title: pendingAction.type === 'buy' ? 'Business Purchased!' : 'Business Upgraded!',
                description: `${pendingAction.business} ${pendingAction.type === 'buy' ? 'is now yours' : 'has been upgraded'}!`,
            });
        }
        setConfirmOpen(false);
        setPendingAction(null);
    };

    const totalIncome = businesses
        .filter(b => b.owned)
        .reduce((sum, b) => sum + b.income, 0);

    return (
        <MainLayout>
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/business.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Business Empire</h1>
                        <p className="text-xs text-muted-foreground">Invest in income-generating ventures</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Hourly Income</p>
                            <p className="font-cinzel font-bold text-2xl text-primary flex items-center gap-1">
                                <TrendingUp className="w-5 h-5" />
                                ${totalIncome.toLocaleString()}/hr
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Businesses Owned</p>
                            <p className="font-cinzel font-bold text-lg text-foreground">
                                {businesses.filter(b => b.owned).length}/{businesses.length}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-3">
                    {businesses.map((business, index) => (
                        <BusinessCard
                            key={business.name}
                            {...business}
                            delay={0.1 * index}
                            onBuy={() => handleAction('buy', business.name, business.upgradeCost)}
                            onUpgrade={() => handleAction('upgrade', business.name, business.upgradeCost)}
                        />
                    ))}
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={pendingAction?.type === 'buy' ? 'Purchase Business?' : 'Upgrade Business?'}
                description={`This will cost $${pendingAction?.cost.toLocaleString()}. Are you sure you want to proceed?`}
                onConfirm={confirmAction}
            />
        </MainLayout>
    );
};

export default BusinessPage;
