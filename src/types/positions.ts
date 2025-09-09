// Base position interface with common properties
interface BasePosition {
  id: number;
  positionName: string;
  personName?: string;
  error?: string;
}

// Cash position - simple cash holdings
export interface CashPosition extends BasePosition {
  type: 'cash';
  amount: number;
}

// Stock position - requires ticker symbol
export interface StockPosition extends BasePosition {
  type: 'stock';
  ticker: string; // Required for stocks
  link?: string; // Optional link to financial data
  purchasePrice: number;
  amount: number;
  extraCash: number; // should 
}

// Kalshi market data from API
export interface KalshiMarketData {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle: string;
  yes_sub_title: string;
  no_sub_title: string;
  open_time: string;
  close_time: string;
  expected_expiration_time: string;
  expiration_time: string;
  latest_expiration_time: string;
  settlement_timer_seconds: number;
  status: string;
  response_price_units: string;
  notional_value: number;
  notional_value_dollars: number[];
  yes_bid: number;
  yes_bid_dollars: number[];
  yes_ask: number;
  yes_ask_dollars: number[];
  no_bid: number;
  no_bid_dollars: number[];
  no_ask: number;
  no_ask_dollars: number[];
  last_price: number;
  last_price_dollars: number[];
  previous_yes_bid: number;
  previous_yes_bid_dollars: number[];
  previous_yes_ask: number;
  previous_yes_ask_dollars: number[];
  previous_price: number;
  previous_price_dollars: number[];
  volume: number;
  volume_24h: number;
  liquidity: number;
  liquidity_dollars: number[];
  open_interest: number;
  result: string;
  can_close_early: boolean;
  expiration_value: string;
  category: string;
  risk_limit_cents: number;
  yes_topbook_liquidity_dollars: number[];
  no_topbook_liquidity_dollars: number[];
  strike_type: string;
  floor_strike: number;
  rules_primary: string;
  rules_secondary: string;
  early_close_condition: string;
  tick_size: number;
}

// Kalshi API response structure
export interface KalshiApiResponse {
  market: KalshiMarketData;
}

// Kalshi position - event market trading
export interface KalshiPosition extends BasePosition {
  type: 'kalshi';
  ticker: string; // Kalshi market ticker
  purchasePrice: number; // Price per contract when purchased
  contracts: number; // Number of contracts
  extraCash: number; // Remaining cash from the trade
  fees: number; // Trading fees (sunk cost)
  link?: string; // Optional link to market
  marketData?: KalshiMarketData; // Current market data from API
  side: 'yes' | 'no'; // Whether betting Yes or No on the market
}

// Union type for all position types
export type Position = CashPosition | StockPosition | KalshiPosition;

// Position with current market data
export interface PositionWithCurrentPrice {
  originalValue: number; // Total cost basis (including fees for Kalshi)
  currentValue: number; // Current market value
  currentPrice: number; // Current market price
  totalReturn: number; // (currentValue - originalValue) / originalValue * 100
  fees?: number; // Trading fees (for display purposes)
  netReturn?: number; // Return excluding fees (for Kalshi positions)
}

// Combined type for positions with current pricing
export type CashPositionWithPrice = CashPosition & PositionWithCurrentPrice;
export type StockPositionWithPrice = StockPosition & PositionWithCurrentPrice;
export type KalshiPositionWithPrice = KalshiPosition & PositionWithCurrentPrice;

export type PositionWithPrice = CashPositionWithPrice | StockPositionWithPrice | KalshiPositionWithPrice;