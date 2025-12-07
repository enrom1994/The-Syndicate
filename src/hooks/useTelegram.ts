import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (app) {
      app.ready();
      app.expand();
      setWebApp(app);
    }
  }, []);

  return {
    webApp,
    user: webApp?.initDataUnsafe?.user,
    startParam: webApp?.initDataUnsafe?.start_param,
    isReady: !!webApp,
  };
};

/**
 * Hook to handle Telegram WebApp back button
 * Shows back button when not on home page, navigates back on click
 */
export const useTelegramBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (!app?.BackButton) return;

    const isHome = location.pathname === '/';

    if (isHome) {
      app.BackButton.hide();
    } else {
      app.BackButton.show();
      app.BackButton.onClick(handleBack);

      return () => {
        app.BackButton.offClick(handleBack);
      };
    }
  }, [location.pathname, handleBack]);
};

/**
 * Hook to enable/disable exit confirmation
 * Prevents accidental app closure during important actions
 */
export const useExitConfirm = (shouldConfirm: boolean = true) => {
  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (!app) return;

    if (shouldConfirm) {
      app.enableClosingConfirmation?.();
    } else {
      app.disableClosingConfirmation?.();
    }

    return () => {
      app.disableClosingConfirmation?.();
    };
  }, [shouldConfirm]);
};

/**
 * Get Telegram user's profile photo URL
 */
export const useTelegramPhoto = () => {
  const { user } = useTelegram();
  return user?.photo_url || null;
};

