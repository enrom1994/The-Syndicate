import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from './useTelegram';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';

export const useDeepLink = () => {
    const { startParam, isReady } = useTelegram();
    const navigate = useNavigate();
    const { toast } = useToast();
    const processedRef = useRef(false);

    useEffect(() => {
        if (!isReady || !startParam || processedRef.current) return;

        processedRef.current = true;

        // Handle different deep link types
        if (startParam.startsWith('ref_')) {
            const referrerId = startParam.split('_')[1];
            logger.debug('Referral from:', referrerId);
            toast({
                title: 'Welcome!',
                description: 'You joined via a referral link. Bonus rewards applied!',
            });
            // Here you would typically call an API to register the referral
        } else if (startParam.startsWith('family_')) {
            const familyId = startParam.split('_')[1];
            logger.debug('Join family:', familyId);
            navigate(`/family/${familyId}`);
            toast({
                title: 'Family Invite',
                description: 'You have been invited to join a family.',
            });
        } else if (startParam === 'shop') {
            navigate('/shop');
        } else if (startParam === 'tasks') {
            navigate('/tasks');
        }

    }, [isReady, startParam, navigate, toast]);
};
