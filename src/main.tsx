import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTelegramAnalytics } from "./lib/telegramAnalytics";

// Initialize Telegram Mini Apps Analytics (required for compliance)
initTelegramAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
