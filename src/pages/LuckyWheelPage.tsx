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
        } else if (player === null) {
            // Player is confirmed to not exist (auth loaded but no player)
            setIsLoading(false);
        }
    }, [player?.id, player]);

    const loadWheelData = async () => {
        if (!player?.id) return;

        try {
            const [prizesRes, statusRes] = await Promise.all([
                supabase.rpc('get_wheel_prizes'),
                supabase.rpc('get_spin_status', { target_player_id: player.id })
            ]);

            if (prizesRes.data) setPrizes(prizesRes.data as unknown as Prize[]);
            if (statusRes.data) {
                const data = statusRes.data as { can_free_spin: boolean; hours_remaining: number; spin_cost: number; total_spins: number };
                setCanFreeSpin(data.can_free_spin);
                setHoursRemaining(data.hours_remaining);
                setSpinCost(data.spin_cost);
                setTotalSpins(data.total_spins);
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
            const { data: rawData, error } = await supabase.rpc('spin_lucky_wheel', {
                target_player_id: player.id,
                use_diamonds: useDiamonds
            });

            if (error) throw error;

            const data = rawData as {
                success: boolean;
                prize_name: string;
                prize_type: string;
                amount: number;
                icon: string;
                color: string;
                message?: string
            } | null;

            if (data?.success) {
                // Find the index of the won prize in our prizes array
                const prizeIndex = prizes.findIndex(p => p.name === data.prize_name);
                const actualIndex = prizeIndex >= 0 ? prizeIndex : 0;

                // Calculate rotation to land on the correct prize
                // The wheel renders segments starting from index 0 at the right side (3 o'clock)
                // The pointer is at the top (12 o'clock)
                // So segment 0's center is at (segmentAngle/2) degrees from the right
                // To land segment N at top, we rotate the wheel so that segment N points up
                const segmentAngle = 360 / prizes.length;
                const segmentCenter = actualIndex * segmentAngle + segmentAngle / 2;
                // We need to rotate the wheel so segmentCenter ends up at 270° (top/12 o'clock)
                // Current position: segmentCenter is at segmentCenter degrees from right
                // Target: 270° (top)
                // Rotation needed: 270 - segmentCenter (then add full spins)
                const baseRotation = 270 - segmentCenter;
                const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
                const finalRotation = baseRotation + (360 * spins);

                setRotation(finalRotation);

                // Wait for animation to complete
                await new Promise(resolve => setTimeout(resolve, 5000));

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

                {/* Wheel Assembly */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative mx-auto w-80 h-80 mb-6"
                >
                    {/* Ambient Glow Behind Wheel */}
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%)',
                            filter: 'blur(20px)',
                        }}
                        animate={{
                            opacity: isSpinning ? [0.5, 1, 0.5] : 0.4,
                            scale: isSpinning ? [1, 1.1, 1] : 1,
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: isSpinning ? Infinity : 0,
                            ease: "easeInOut"
                        }}
                    />

                    {/* LED Light Ring */}
                    <div className="absolute inset-0 rounded-full">
                        {Array.from({ length: 24 }).map((_, i) => {
                            const ledAngle = (360 / 24) * i;
                            const ledRadius = 156; // Just outside the wheel
                            const ledX = 160 + ledRadius * Math.cos((ledAngle - 90) * Math.PI / 180);
                            const ledY = 160 + ledRadius * Math.sin((ledAngle - 90) * Math.PI / 180);
                            return (
                                <motion.div
                                    key={`led-${i}`}
                                    className="absolute w-2.5 h-2.5 rounded-full"
                                    style={{
                                        left: ledX - 5,
                                        top: ledY - 5,
                                        background: 'radial-gradient(circle, #ffd700 0%, #b8860b 100%)',
                                        boxShadow: '0 0 6px #ffd700, 0 0 10px #ffd700',
                                    }}
                                    animate={isSpinning ? {
                                        opacity: [0.4, 1, 0.4],
                                        scale: [0.8, 1.2, 0.8],
                                    } : { opacity: 0.7, scale: 1 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: i * 0.05,
                                        repeat: isSpinning ? Infinity : 0,
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Decorative Outer Ring */}
                    <div
                        className="absolute inset-2 rounded-full"
                        style={{
                            background: 'linear-gradient(180deg, #d4af37 0%, #8b6914 50%, #d4af37 100%)',
                            padding: '4px',
                            boxShadow: '0 0 20px rgba(212, 175, 55, 0.5), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)',
                        }}
                    >
                        <div className="w-full h-full rounded-full bg-background/95" style={{
                            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)',
                        }} />
                    </div>

                    {/* Pointer */}
                    <motion.div
                        className="absolute top-1 left-1/2 -translate-x-1/2 z-30"
                        animate={isSpinning ? { y: [0, 2, 0] } : { y: 0 }}
                        transition={{ duration: 0.15, repeat: isSpinning ? Infinity : 0 }}
                    >
                        <div
                            className="relative"
                            style={{
                                width: 0,
                                height: 0,
                                borderLeft: '16px solid transparent',
                                borderRight: '16px solid transparent',
                                borderTop: '28px solid #d4af37',
                                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
                            }}
                        />
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2"
                            style={{
                                width: 0,
                                height: 0,
                                borderLeft: '12px solid transparent',
                                borderRight: '12px solid transparent',
                                borderTop: '22px solid #ffd700',
                            }}
                        />
                    </motion.div>

                    {/* Main Wheel */}
                    <motion.div
                        className="absolute inset-6 rounded-full overflow-hidden"
                        style={{
                            rotate: rotation,
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 0 15px rgba(212, 175, 55, 0.3)',
                            border: '3px solid #d4af37',
                        }}
                        animate={{ rotate: rotation }}
                        transition={{
                            duration: 5,
                            ease: [0.2, 0, 0.1, 1],
                        }}
                    >
                        {/* Wheel segments with gradients */}
                        {prizes.map((prize, index) => {
                            const angle = (360 / prizes.length) * index;
                            const skewAngle = 90 - (360 / prizes.length);
                            const isGold = index % 2 === 0;
                            return (
                                <div
                                    key={prize.id}
                                    className="absolute w-1/2 h-1/2 origin-bottom-right"
                                    style={{
                                        transform: `rotate(${angle}deg) skewY(${skewAngle}deg)`,
                                        background: isGold
                                            ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.7) 0%, rgba(180, 140, 40, 0.4) 50%, rgba(139, 105, 20, 0.6) 100%)'
                                            : 'linear-gradient(135deg, rgba(45, 35, 25, 0.95) 0%, rgba(30, 25, 18, 0.9) 50%, rgba(20, 15, 10, 0.95) 100%)',
                                        borderRight: '1px solid rgba(212, 175, 55, 0.4)',
                                        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
                                    }}
                                />
                            );
                        })}

                        {/* Center circle with glow */}
                        <div
                            className="absolute inset-0 m-auto w-20 h-20 rounded-full flex items-center justify-center z-10"
                            style={{
                                background: 'radial-gradient(circle, #2a2015 0%, #1a140d 70%, #0f0a05 100%)',
                                border: '3px solid #d4af37',
                                boxShadow: '0 0 15px rgba(212, 175, 55, 0.5), inset 0 0 20px rgba(0,0,0,0.8)',
                            }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            >
                                <Sparkles className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Icons overlay - positioned using polar coordinates */}
                    <motion.div
                        className="absolute inset-6 pointer-events-none"
                        style={{ rotate: rotation }}
                        animate={{ rotate: rotation }}
                        transition={{
                            duration: 5,
                            ease: [0.2, 0, 0.1, 1],
                        }}
                    >
                        {prizes.map((prize, index) => {
                            const segmentAngle = 360 / prizes.length;
                            const iconAngle = (segmentAngle * index) + (segmentAngle / 2);
                            const radius = 90; // Distance from center in pixels (adjusted for larger wheel)
                            const wheelSize = 272; // 320 - 48 (inset-6 = 24px * 2)
                            const center = wheelSize / 2;
                            const x = center + radius * Math.cos((iconAngle * Math.PI) / 180);
                            const y = center + radius * Math.sin((iconAngle * Math.PI) / 180);

                            return (
                                <div
                                    key={`icon-${prize.id}`}
                                    className="absolute flex items-center justify-center"
                                    style={{
                                        left: x - 18,
                                        top: y - 18,
                                        transform: `rotate(${-rotation}deg)`,
                                    }}
                                >
                                    <img
                                        src={prize.icon}
                                        alt={prize.name}
                                        className="w-9 h-9 object-contain"
                                        style={{
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8)) drop-shadow(0 0 8px rgba(212,175,55,0.3))',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </motion.div>
                </motion.div>

                {/* Result Display with Celebration */}
                <AnimatePresence>
                    {spinResult && (
                        <>
                            {/* Confetti Particles */}
                            {spinResult.prize_type !== 'nothing' && (
                                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                                    {Array.from({ length: 50 }).map((_, i) => (
                                        <motion.div
                                            key={`confetti-${i}`}
                                            className="absolute w-3 h-3"
                                            style={{
                                                left: `${Math.random() * 100}%`,
                                                top: -20,
                                                backgroundColor: ['#ffd700', '#d4af37', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffffff'][Math.floor(Math.random() * 7)],
                                                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                            }}
                                            initial={{ y: -20, rotate: 0, opacity: 1 }}
                                            animate={{
                                                y: window.innerHeight + 100,
                                                rotate: Math.random() * 720 - 360,
                                                x: (Math.random() - 0.5) * 200,
                                                opacity: [1, 1, 0],
                                            }}
                                            transition={{
                                                duration: 2 + Math.random() * 2,
                                                delay: Math.random() * 0.5,
                                                ease: 'easeOut',
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Win Result Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                                className="relative p-5 mb-4 text-center rounded-xl overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(26, 20, 15, 0.95) 0%, rgba(40, 30, 20, 0.9) 100%)',
                                    border: `2px solid ${spinResult.color || '#d4af37'}`,
                                    boxShadow: `0 0 30px ${spinResult.color || '#d4af37'}40, inset 0 0 20px rgba(0,0,0,0.5)`,
                                }}
                            >
                                {/* Shimmer effect */}
                                <motion.div
                                    className="absolute inset-0"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                    }}
                                    animate={{ x: ['-100%', '200%'] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                />

                                <motion.img
                                    src={spinResult.icon}
                                    alt={spinResult.prize_name}
                                    className="w-16 h-16 object-contain mx-auto mb-2 relative z-10"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
                                    style={{
                                        filter: `drop-shadow(0 0 15px ${spinResult.color || '#d4af37'})`,
                                    }}
                                />
                                <motion.p
                                    className="font-cinzel font-bold text-xl relative z-10"
                                    style={{ color: spinResult.color }}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {spinResult.prize_name}
                                </motion.p>
                                {spinResult.prize_type !== 'nothing' && (
                                    <motion.p
                                        className="text-sm text-primary/80 mt-1 relative z-10"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        ✨ Added to your account!
                                    </motion.p>
                                )}
                            </motion.div>
                        </>
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
                    <h3 className="font-cinzel text-sm font-semibold mb-3 text-primary/80 flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Possible Prizes
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                        {prizes.map((prize) => (
                            <motion.div
                                key={prize.id}
                                className="p-2 text-center rounded-lg cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(26, 20, 15, 0.9) 0%, rgba(40, 30, 20, 0.8) 100%)',
                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                }}
                                whileHover={{
                                    scale: 1.05,
                                    borderColor: 'rgba(212, 175, 55, 0.8)',
                                    boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)',
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                                <img
                                    src={prize.icon}
                                    alt={prize.name}
                                    className="w-8 h-8 object-contain mx-auto"
                                    style={{
                                        filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.3))',
                                    }}
                                />
                                <p
                                    className="text-[10px] font-medium truncate mt-1"
                                    style={{ color: prize.color || '#d4af37' }}
                                >
                                    {prize.name}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default LuckyWheelPage;
