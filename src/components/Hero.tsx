import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { useEffect } from 'react';

interface HeroProps {
  onEnter: () => void;
}

export const Hero = ({ onEnter }: HeroProps) => {
  // Lock scrolling on hero screen for focus
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClaim = () => {
    haptic.heavy();
    onEnter();
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video with Overlay */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/animation/hero_alt.png"
          className="w-full h-full object-cover opacity-80"
        >
          <source src="/animation/hero.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlays - stronger bottom fade for CTA focus */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />
      </div>

      {/* Art Deco Decorative Elements */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-primary/50 to-transparent" />

      <div className="relative z-10 container px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mb-6"
        >
          <span className="inline-block text-xs font-inter uppercase tracking-[0.4em] text-primary/80 mb-4">
            Est. 1929
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-cinzel text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight"
        >
          <span className="gold-shimmer text-shadow-gold">THE SYNDICATE</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="w-32 h-px mx-auto mb-8 bg-gradient-gold"
        />

        {/* Urgency Microcopy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-sm text-amber-400/90 font-medium mb-4 tracking-wide"
        >
          🔥 Early players gain permanent advantages
        </motion.p>

        {/* Primary CTA - CLAIM button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <motion.div
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={handleClaim}
              className="btn-gold px-10 py-7 text-base font-bold rounded-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow"
              style={{
                animation: 'pulse-glow 2s ease-in-out infinite',
              }}
            >
              <img src="/icon/diamond.png" alt="" className="w-5 h-5 mr-2" />
              CLAIM 50 DIAMONDS
            </Button>
          </motion.div>
        </motion.div>

        {/* Reduced lore text - now below CTA and smaller */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-8 text-xs font-inter text-muted-foreground/50 max-w-xs mx-auto leading-relaxed"
        >
          Enter the underground world of prohibition-era organized crime.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-4 text-[10px] font-inter text-muted-foreground/40 uppercase tracking-wider"
        >
          Free to play • Powered by TON
        </motion.p>
      </div>

      {/* CSS for pulsing glow animation */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(245, 158, 11, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(245, 158, 11, 0.6), 0 0 60px rgba(245, 158, 11, 0.3);
          }
        }
      `}</style>
    </section>
  );
};