import { motion } from 'framer-motion';
import { Gavel, Clock } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';

const AuctionPage = () => {
    return (
        <MainLayout>
            <div className="py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                            <Gavel className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-cinzel text-xl font-bold text-foreground">Auction House</h1>
                            <p className="text-xs text-muted-foreground">Trade contraband with other players</p>
                        </div>
                    </div>

                    {/* Coming Soon Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="noir-card p-8 text-center"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                            <Clock className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="font-cinzel text-lg font-bold text-foreground mb-2">Coming Soon</h2>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            The Auction House is under construction. Soon you'll be able to buy and sell contraband with other players.
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default AuctionPage;
