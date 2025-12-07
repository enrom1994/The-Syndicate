import { useState, useEffect } from 'react';

export const useNotifications = () => {
    const [badges, setBadges] = useState({
        home: false,
        market: false,
        ops: 0,
        family: false,
        ranks: false,
    });

    useEffect(() => {
        // Check for daily reward availability
        const lastClaim = localStorage.getItem('lastDailyRewardClaim');
        const today = new Date().toDateString();
        const hasUnclaimedReward = lastClaim !== today;

        // Simulate some other notifications
        const newBounties = 2; // Mock: 2 new bounties available
        const familyInvites = false;

        setBadges({
            home: hasUnclaimedReward,
            market: false,
            ops: newBounties,
            family: familyInvites,
            ranks: false,
        });
    }, []);

    return badges;
};
