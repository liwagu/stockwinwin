/**
 * Dashboard asset configuration
 *
 * Defines which assets are shown on the dashboard and their access tier.
 * Free users see only "free" tier assets, Pro users see all assets.
 */

export type DashboardAsset = {
    symbol: string;      // Asset symbol (e.g., "BTCUSDT", "AAPL")
    displayName: string; // Display name shown in UI
    tier: "free" | "pro"; // Access level required
};

/**
 * Cryptocurrency assets (10 total: 3 free + 7 pro)
 */
export const CRYPTO_ASSETS: DashboardAsset[] = [
    // Free tier (3 assets)
    { symbol: "BTCUSDT", displayName: "Bitcoin", tier: "free" },
    { symbol: "ETHUSDT", displayName: "Ethereum", tier: "free" },
    { symbol: "XRPUSDT", displayName: "Ripple", tier: "free" },

    // Pro tier (7 assets)
    { symbol: "SOLUSDT", displayName: "Solana", tier: "pro" },
    { symbol: "BNBUSDT", displayName: "Binance Coin", tier: "pro" },
    { symbol: "ADAUSDT", displayName: "Cardano", tier: "pro" },
    { symbol: "DOGEUSDT", displayName: "Dogecoin", tier: "pro" },
    { symbol: "AVAXUSDT", displayName: "Avalanche", tier: "pro" },
    { symbol: "LINKUSDT", displayName: "Chainlink", tier: "pro" },
    { symbol: "MATICUSDT", displayName: "Polygon", tier: "pro" },
];

/**
 * Stock assets (10 total: 2 free + 8 pro)
 */
export const STOCK_ASSETS: DashboardAsset[] = [
    // Free tier (2 assets)
    { symbol: "MSFT", displayName: "Microsoft", tier: "free" },
    { symbol: "GOOGL", displayName: "Alphabet", tier: "free" },

    // Pro tier (8 assets)
    { symbol: "BABA", displayName: "Alibaba", tier: "pro" },
    { symbol: "COIN", displayName: "Coinbase", tier: "pro" },
    { symbol: "GLD", displayName: "SPDR Gold Shares", tier: "pro" },
    { symbol: "IBIT", displayName: "iShares Bitcoin Trust", tier: "pro" },
    { symbol: "NVDA", displayName: "NVIDIA", tier: "pro" },
    { symbol: "SPY", displayName: "SPDR S&P 500 ETF", tier: "pro" },
    { symbol: "TSLA", displayName: "Tesla", tier: "pro" },
    { symbol: "UVIX", displayName: "VS 2x VIX Futures ETF", tier: "pro" },
];
