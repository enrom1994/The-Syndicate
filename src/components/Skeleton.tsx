import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
    <div className={`animate-pulse bg-muted/50 rounded ${className}`} />
);

export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
    <div className={`noir-card p-4 ${className}`}>
        <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-sm shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
    <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
            >
                <SkeletonCard />
            </motion.div>
        ))}
    </div>
);

export const SkeletonStats = () => (
    <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
            <div key={i} className="noir-card p-3 text-center">
                <Skeleton className="h-3 w-1/2 mx-auto mb-2" />
                <Skeleton className="h-5 w-3/4 mx-auto" />
            </div>
        ))}
    </div>
);

export const SkeletonPage = () => (
    <div className="py-6 px-4 space-y-4">
        <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-10 h-10 rounded-sm" />
            <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
        <SkeletonStats />
        <SkeletonList count={4} />
    </div>
);
