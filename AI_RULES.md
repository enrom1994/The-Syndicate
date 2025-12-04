# AI Rules for The Syndicate Application

This document outlines the core technologies used in "The Syndicate" application and provides clear guidelines for using specific libraries and frameworks.

## Tech Stack Overview

*   **Frontend Framework**: React with TypeScript for building dynamic user interfaces.
*   **Build Tool**: Vite for a fast development experience and optimized builds.
*   **Styling**: Tailwind CSS for utility-first styling, ensuring a consistent and responsive design.
*   **UI Components**: shadcn/ui for pre-built, accessible, and customizable UI components, built on Radix UI.
*   **Routing**: React Router for managing navigation and defining application routes.
*   **Animations**: Framer Motion for rich, declarative animations and transitions.
*   **Backend & Database**: Supabase for database management, authentication, and real-time capabilities.
*   **Wallet Integration**: TON Connect UI React for connecting to TON wallets within the mini app.
*   **Icons**: Lucide React for a comprehensive set of customizable SVG icons.
*   **Data Fetching/State Management**: React Query (TanStack Query) for efficient server state management.
*   **Telegram Integration**: Custom hooks and direct access to `window.Telegram.WebApp` for Telegram Mini App specific functionalities.
*   **Toasts**: Sonner for elegant and customizable toast notifications.

## Library Usage Rules

To maintain consistency, performance, and ease of development, please adhere to the following rules when implementing features:

1.  **UI Components**:
    *   **Always** prioritize using components from `src/components/ui/` (shadcn/ui).
    *   If a required component is not available in `shadcn/ui` or needs significant deviation from its design, create a **new, separate component** in `src/components/` and style it with Tailwind CSS. Do not modify existing `shadcn/ui` files.

2.  **Styling**:
    *   **Exclusively** use Tailwind CSS classes for all styling. Avoid inline styles or separate CSS files for components.
    *   Leverage the custom CSS variables and utilities defined in `src/index.css` for consistent branding (e.g., `gold-shimmer`, `noir-card`).

3.  **State Management**:
    *   For local component state, use React's `useState` and `useReducer` hooks.
    *   For global application state, especially asynchronous data fetching and caching, use **React Query (`@tanstack/react-query`)**.

4.  **Routing**:
    *   All navigation within the application **must** use `react-router-dom`. Define routes in `src/App.tsx`.

5.  **Animations**:
    *   For complex, interactive, or orchestrated animations, use **Framer Motion**.
    *   For simpler hover effects, transitions, or basic entrance animations, utilize Tailwind CSS's built-in animation utilities or custom animations defined in `src/index.css`.

6.  **Icons**:
    *   **Always** use icons from the `lucide-react` library.

7.  **Backend Interaction**:
    *   All interactions with the database and backend services **must** be done using the Supabase client (`supabase` from `src/lib/supabase.ts`).

8.  **Wallet Integration**:
    *   For connecting to TON wallets and interacting with the TON blockchain, use the `@tonconnect/ui-react` library and the `TonConnectProvider`.

9.  **Toasts/Notifications**:
    *   For displaying user feedback or notifications, use the `sonner` toast library. The `Toaster` component is already set up in `src/App.tsx`.

10. **Telegram Web App Specifics**:
    *   Utilize the `useTelegram` hook (`src/hooks/useTelegram.ts`) for accessing Telegram Web App functionalities and user data.
    *   Directly interact with `window.Telegram.WebApp` when necessary for advanced features not covered by the hook.

11. **Utility Functions**:
    *   Place general utility functions (e.g., `cn` for Tailwind class merging) in `src/lib/utils.ts`.