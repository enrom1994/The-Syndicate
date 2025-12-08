import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component that scrolls the page to the top when the route changes.
 * Must be placed inside a BrowserRouter.
 */
export const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll to top when pathname changes
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};
