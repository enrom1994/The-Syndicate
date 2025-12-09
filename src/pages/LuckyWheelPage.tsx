import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Loader2, Clock, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { SkeletonPage } from '@/components/Skeleton';
import { rewardCash, rewardDiamonds, rewardEnergy } from '@/components/RewardAnimation';

interface Prize {
    id: string;
    name: string;
    prize_type: string;
    amount: number;
    icon: string;
    color: string;
}

interface SpinResult {
    prize_name: string;
    prize_type: string;
    amount: number;
    icon: string;
    color: string;
}

const LuckyWheelPage = () => {
    const { player, refetchPlayer } = useAuth();
    const { toast } = useToast();

    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSpinning, setIsSpinning] = useState(false);
    const [canFreeSpin, setCanFreeSpin] = useState(false);
    const [hoursRemaining, setHoursRemaining] = useState(0);
    const [spinCost, setSpinCost] = useState(10);
    const [totalSpins, setTotalSpins] = useState(0);
    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (player?.id) {
            loadWheelData();
        }
    }, [player?.id]);

    const loadWheelData = async () => {
        if (!player?.id) return;

        try {
            const [prizesRes, statusRes] = await Promise.all([
                supabase.rpc('get_wheel_prizes'),
                supabase.rpc('get_spin_status', { target_player_id: player.id })
            ]);

            if (prizesRes.data) setPrizes(prizesRes.data);
            if (statusRes.data) {
                setCanFreeSpin(statusRes.data.can_free_spin);
                setHoursRemaining(statusRes.data.hours_remaining);
                setSpinCost(statusRes.data.spin_cost);
                setTotalSpins(statusRes.data.total_spins);
            }
        } catch (error) {
            console.error('Failed to load wheel:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSpin = async (useDiamonds: boolean) => {
        if (!player?.id || isSpinning) return;

        if (!canFreeSpin && !useDiamonds) {
            toast({
                title: 'Free Spin Unavailable',
                description: `Wait ${hoursRemaining} hours or use ${spinCost} diamonds`,
                variant: 'destructive',
            });
            return;
        }

        if (useDiamonds && (player.diamonds || 0) < spinCost) {
            toast({
                title: 'Not Enough Diamonds',
                description: `You need ${spinCost} diamonds to spin`,
                variant: 'destructive',
            });
            return;
        }

        setIsSpinning(true);
        setSpinResult(null);
        haptic.medium();

        try {
            // Call backend FIRST to get the actual prize
            const { data, error } = await supabase.rpc('spin_lucky_wheel', {
                target_player_id: player.id,
                use_diamonds: useDiamonds
            });

            if (error) throw error;

            if (data?.success) {
                // Find the index of the won prize in our prizes array
                const prizeIndex = prizes.findIndex(p => p.id === data.prize_id);
                const actualIndex = prizeIndex >= 0 ? prizeIndex : 0;

                // Calculate rotation to land on the correct prize
                // The pointer is at the top, so we need to rotate the wheel so the prize ends up at top
                const segmentAngle = 360 / prizes.length;
                const prizeAngle = segmentAngle * actualIndex + (segmentAngle / 2); // Center of the segment
                const spins = 5 + Math.random() * 3; // 5-8 full rotations for effect
                // We rotate clockwise, pointer is at top (0 degrees), so we need to land with prize at top
                const finalRotation = rotation + (360 * spins) + (360 - prizeAngle);

                setRotation(finalRotation);

                // Wait for animation to complete
                await new Promise(resolve => setTimeout(resolve, 4000));

                haptic.success();
                setSpinResult({
                    prize_name: data.prize_name,
                    prize_type: data.prize_type,
                    amount: data.amount,
                    icon: data.icon,
                    color: data.color
                });

                if (data.prize_type !== 'nothing') {
                    // Show reward animation based on prize type
                    if (data.prize_type === 'cash') {
                        rewardCash(data.amount);
                    } else if (data.prize_type === 'diamonds') {
                        rewardDiamonds(data.amount);
                    } else if (data.prize_type === 'energy' || data.prize_type === 'stamina') {
                        rewardEnergy(data.amount);
                    }
                    toast({
                        title: `🎉 You Won!`,
                        description: `${data.prize_name}`,
                    });
                }

                await refetchPlayer();
                await loadWheelData();
            } else {
                toast({
                    title: 'Spin Failed',
                    description: data?.message || 'Please try again',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Spin error:', error);
            toast({
                title: 'Error',
                description: 'Failed to spin wheel',
                variant: 'destructive',
            });
        } finally {
            setIsSpinning(false);
        }
    };

    if (isLoading) {
        return <MainLayout><SkeletonPage /></MainLayout>;
    }

    return (
        <MainLayout>
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/home.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div className="flex items-center gap-3">
                        <img src="/images/icons/luckywheel.png" alt="Lucky Wheel" className="w-12 h-12 object-contain" />
                        <div>
                            <h1 className="font-cinzel text-xl font-bold text-foreground">Lucky Wheel</h1>
                            <p className="text-xs text-muted-foreground">{totalSpins} total spins</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 noir-card px-3 py-1.5">
                        <GameIcon type="diamond" className="w-5 h-5" />
                        <span className="font-cinzel font-bold text-sm">{player?.diamonds ?? 0}</span>
                    </div>
                </motion.div>

                {/* Wheel */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative mx-auto w-64 h-64 mb-6"
                >
                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
                    </div>

                    {/* Wheel */}
                    <motion.div
                        className="w-full h-full rounded-full border-4 border-primary overflow-hidden relative"
                        style={{ rotate: rotation }}
                        animate={{ rotate: rotation }}
                        transition={{ duration: 4, ease: [0.2, 0, 0.2, 1] }}
                    >
                        {/* Wheel segments (colored backgrounds) */}
                        {prizes.map((prize, index) => {
                            const angle = (360 / prizes.length) * index;
                            const skewAngle = 90 - (360 / prizes.length);
                            return (
                                <div
                                    key={prize.id}
                                    className="absolute w-1/2 h-1/2 origin-bottom-right"
                                    style={{
                                        transform: `rotate(${angle}deg) skewY(${skewAngle}deg)`,
                                        backgroundColor: index % 2 === 0 ? 'rgba(212, 175, 55, 0.3)' : 'rgba(26, 20, 15, 0.8)',
                                    }}
                                />
                            );
                        })}
                        {/* Center circle */}
                        <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                    </motion.div>

                    {/* Icons overlay - positioned using polar coordinates */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{ rotate: rotation }}
                        animate={{ rotate: rotation }}
                        transition={{ duration: 4, ease: [0.2, 0, 0.2, 1] }}
                    >
                        {prizes.map((prize, index) => {
                            // Calculate position for each icon using polar coordinates
                            const segmentAngle = 360 / prizes.length;
                            const iconAngle = (segmentAngle * index) + (segmentAngle / 2) - 90; // Center of segment, offset by -90 to start from top
                            const radius = 80; // Distance from center in pixels
                            const x = 128 + radius * Math.cos((iconAngle * Math.PI) / 180); // 128 = half of 256px wheel
                            const y = 128 + radius * Math.sin((iconAngle * Math.PI) / 180);

                            return (
                                <div
                                    key={`icon-${prize.id}`}
                                    className="absolute flex items-center justify-center"
                                    style={{
                                        left: x - 16, // Center the 32px icon
                                        top: y - 16,
                                        transform: `rotate(${-rotation}deg)`, // Counter-rotate to keep icons upright
                                    }}
                                >
                                    <img
                                        src={prize.icon}
                                        alt={prize.name}
                                        className="w-8 h-8 object-contain drop-shadow-lg"
                                    />
                                </div>
                            );
                        })}
                    </motion.div>
                </motion.div>

                {/* Result Display */}
                <AnimatePresence>
                    {spinResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="noir-card p-4 mb-4 text-center"
                        >
                            <img src={spinResult.icon} alt={spinResult.prize_name} className="w-12 h-12 object-contain mx-auto mb-1" />
                            <p className="font-cinzel font-bold text-lg" style={{ color: spinResult.color }}>
                                {spinResult.prize_name}
                            </p>
                            {spinResult.prize_type !== 'nothing' && (
                                <p className="text-xs text-muted-foreground">Added to your account!</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Spin Buttons */}
                <div className="space-y-3">
                    <Button
                        className="w-full btn-gold py-6 text-lg"
                        onClick={() => handleSpin(false)}
                        disabled={isSpinning || !canFreeSpin}
                    >
                        {isSpinning ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : canFreeSpin ? (
                            <>
                                <Gift className="w-5 h-5 mr-2" />
                                FREE SPIN!
                            </>
                        ) : (
                            <>
                                <Clock className="w-4 h-4 mr-2" />
                                {hoursRemaining}h until free spin
                            </>
                        )}
                    </Button>

                    {!canFreeSpin && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleSpin(true)}
                            disabled={isSpinning}
                        >
                            <GameIcon type="diamond" className="w-5 h-5 mr-2" />
                            Spin for {spinCost} Diamonds
                        </Button>
                    )}
                </div>

                {/* Prize List */}
                <div className="mt-6">
                    <h3 className="font-cinzel text-sm font-semibold mb-3 text-muted-foreground">Possible Prizes</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {prizes.map((prize) => (
                            <div key={prize.id} className="noir-card p-2 text-center">
                                <img src={prize.icon} alt={prize.name} className="w-8 h-8 object-contain mx-auto" />
                                <p className="text-[10px] text-muted-foreground truncate">{prize.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default LuckyWheelPage;
