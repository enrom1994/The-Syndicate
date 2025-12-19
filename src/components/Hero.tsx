import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface HeroProps {
  onEnter: () => void;
}

export const Hero = ({ onEnter }: HeroProps) => {
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
        {/* Gradient overlays - stronger bottom fade to hide video text */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
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
          className="w-32 h-px mx-auto mb-6 bg-gradient-gold"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="font-inter text-muted-foreground text-base sm:text-lg max-w-md mx-auto mb-8 leading-relaxed"
        >
          Enter the underground world of prohibition-era organized crime.
          Build your empire. Lead your family. <span className="text-primary font-medium">Become The Boss.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <Button
            onClick={onEnter}
            className="btn-gold px-8 py-6 text-sm rounded-sm animate-pulse-gold"
          >
            Rise to Power
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-6 text-xs font-inter text-muted-foreground/60 uppercase tracking-wider"
        >
          Free to play • Powered by TON
        </motion.p>
      </div>
    </section>
  );
};