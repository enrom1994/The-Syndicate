import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface Notification {
    id: number;
    player_id: string;
    type: 'attack' | 'income' | 'job' | 'family';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
}

export const useNotifications = () => {
    const { player } = useAuth(); // Import this!
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Keep badge logic for now to prevent breaking other components
    const [badges, setBadges] = useState({
        home: false,
        market: false,
        ops: 0,
        family: false,
        ranks: false,
    });

    useEffect(() => {
        if (!player?.id) return;

        let isMounted = true;

        const fetchNotifications = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('notifications') // Assuming this table exists based on previous mocking
                    .select('*')
                    .eq('player_id', player.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                // Don't update state if component unmounted
                if (!isMounted) return;

                if (error) throw error;

                setNotifications(data || []);

                // Update badges based on unread count
                const unread = (data || []).filter(n => !n.read).length;
                setBadges(prev => ({ ...prev, home: unread > 0 })); // Simple mapping for now

            } catch (error: any) {
                // Silently ignore aborted requests and network errors during unmount
                if (!isMounted || error?.name === 'AbortError' || error?.message?.includes('Failed to fetch')) {
                    return;
                }
                console.error('Error fetching notifications:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchNotifications();

        // Setup realtime subscription
        const channel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `player_id=eq.${player.id}`,
                },
                (payload) => {
                    if (isMounted) {
                        setNotifications(prev => [payload.new as Notification, ...prev]);
                        setBadges(prev => ({ ...prev, home: true }));
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [player?.id]);

    return { notifications, isLoading, badges };
};
