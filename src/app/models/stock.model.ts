export interface StockQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  dailyHigh: number;
  dailyLow: number;
  weekHigh52: number;
  weekLow52: number;
}

export type StockTrend = 'up' | 'down' | 'neutral';

export interface StockState {
  quote: StockQuote;
  active: boolean;
  trend: StockTrend;
  openPrice: number;
  lastTradeTime: Date | null;
}

export interface StockUpdate {
  symbol: string;
  currentPrice: number;
  dailyHigh: number;
  dailyLow: number;
  weekHigh52: number;
  weekLow52: number;
}
