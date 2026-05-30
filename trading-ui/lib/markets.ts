export type SupportedMarket = {
  symbol: string;
  displayName: string;
  assetType: "crypto" | "stock";
};

export const SUPPORTED_MARKETS: SupportedMarket[] = [
  { symbol: "BTCUSDT", displayName: "Bitcoin", assetType: "crypto" },
  { symbol: "ETHUSDT", displayName: "Ethereum", assetType: "crypto" },
  { symbol: "SOLUSDT", displayName: "Solana", assetType: "crypto" },
  { symbol: "XRPUSDT", displayName: "Ripple", assetType: "crypto" },
  { symbol: "BNBUSDT", displayName: "Binance Coin", assetType: "crypto" },
  { symbol: "DOGEUSDT", displayName: "Dogecoin", assetType: "crypto" },
  { symbol: "ADAUSDT", displayName: "Cardano", assetType: "crypto" },
  { symbol: "AVAXUSDT", displayName: "Avalanche", assetType: "crypto" },
  { symbol: "LINKUSDT", displayName: "Chainlink", assetType: "crypto" },
  { symbol: "MATICUSDT", displayName: "Polygon", assetType: "crypto" },
  { symbol: "BABA", displayName: "Alibaba Group Holding", assetType: "stock" },
  { symbol: "COIN", displayName: "Coinbase", assetType: "stock" },
  { symbol: "GLD", displayName: "SPDR Gold Shares", assetType: "stock" },
  { symbol: "GOOGL", displayName: "Alphabet", assetType: "stock" },
  { symbol: "IBIT", displayName: "iShares Bitcoin Trust", assetType: "stock" },
  { symbol: "MSFT", displayName: "Microsoft", assetType: "stock" },
  { symbol: "NVDA", displayName: "NVIDIA", assetType: "stock" },
  { symbol: "SPY", displayName: "SPDR S&P 500 ETF", assetType: "stock" },
  { symbol: "TSLA", displayName: "Tesla", assetType: "stock" },
  { symbol: "UVIX", displayName: "VS 2x VIX Futures ETF", assetType: "stock" },
];

export const SUPPORTED_MARKET_SYMBOLS = SUPPORTED_MARKETS.map(market => market.symbol);

export function getSupportedMarket(symbol: string) {
  const normalizedSymbol = symbol.toUpperCase();
  return SUPPORTED_MARKETS.find(market => market.symbol === normalizedSymbol) || null;
}
