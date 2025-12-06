import { cn } from "@/lib/utils";

type IconType = 'cash' | 'diamond' | 'ton' | 'briefcase' | 'fedora';

interface GameIconProps {
    type: IconType;
    className?: string;
    alt?: string;
}

const iconPaths: Record<IconType, string> = {
    cash: '/images/icons/cash.png',
    diamond: '/images/icons/diamond.png',
    ton: '/images/icons/ton_symbol.png',
    briefcase: '/images/icons/briefcase.png',
    fedora: '/images/icons/fedora.png',
};

export const GameIcon = ({ type, className, alt }: GameIconProps) => {
    return (
        <img
            src={iconPaths[type]}
            alt={alt || type}
            className={cn("object-contain", className)}
            loading="lazy"
        />
    );
};
