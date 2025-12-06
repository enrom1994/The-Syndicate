import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-12 px-4 text-center"
    >
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="font-cinzel font-semibold text-lg text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-[240px] mx-auto">{description}</p>
        {actionLabel && onAction && (
            <Button className="btn-gold" onClick={onAction}>
                {actionLabel}
            </Button>
        )}
    </motion.div>
);

// Preset empty states for common pages
import { Package, Users, Bell, Briefcase, ShoppingBag, Crosshair } from 'lucide-react';

export const EmptyInventory = ({ onShop }: { onShop?: () => void }) => (
    <EmptyState
        icon={Package}
        title="Empty Stash"
        description="You haven't acquired any items yet. Visit the shop to get started."
        actionLabel="Visit Shop"
        onAction={onShop}
    />
);

export const EmptyCrew = ({ onHire }: { onHire?: () => void }) => (
    <EmptyState
        icon={Users}
        title="No Crew"
        description="You're running solo. Hire some muscle to boost your operations."
        actionLabel="Hire Crew"
        onAction={onHire}
    />
);

export const EmptyNotifications = () => (
    <EmptyState
        icon={Bell}
        title="All Caught Up"
        description="No new notifications. Check back after your next operation."
    />
);

export const EmptyBusinesses = ({ onBrowse }: { onBrowse?: () => void }) => (
    <EmptyState
        icon={Briefcase}
        title="No Businesses"
        description="Start your empire by acquiring a business."
        actionLabel="Browse Market"
        onAction={onBrowse}
    />
);

export const EmptyBounties = () => (
    <EmptyState
        icon={Crosshair}
        title="No Bounties"
        description="The board is clean. Check back later for new targets."
    />
);

export const EmptyFamily = ({ onBrowse }: { onBrowse?: () => void }) => (
    <EmptyState
        icon={Users}
        title="No Family"
        description="Join a crime family or create your own empire."
        actionLabel="Browse Families"
        onAction={onBrowse}
    />
);
