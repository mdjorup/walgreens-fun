import PositionsDashboard from '@/components/PositionsDashboard';
import { KalshiPosition, Position, PositionWithPrice, StockPosition, KalshiApiResponse, KalshiMarketData} from '@/types/positions';

import { POSITIONS } from '@/data/positions';
import yahooFinance from 'yahoo-finance2';



export const revalidate = 60;

const getStockPrice = async (position: StockPosition): Promise<number> => {

  const quote = await yahooFinance.quote(position.ticker);

  const price = quote.regularMarketPrice;

  if (price === undefined) {
    console.warn("Unable to get price for position", position);
    return position.purchasePrice;
  }

  return price;

}

const getKalshiMarketData = async (position: KalshiPosition): Promise<KalshiMarketData> => {
  try {
    const marketsResponse = await fetch(`https://api.elections.kalshi.com/trade-api/v2/markets/${position.ticker}`);
    
    if (!marketsResponse.ok) {
      throw new Error(`Kalshi API error: ${marketsResponse.status}`);
    }
    
    const marketsData: KalshiApiResponse = await marketsResponse.json();
    return marketsData.market;
  } catch (error) {
    console.error(`Failed to fetch Kalshi market data for ${position.ticker}:`, error);
    // Return a fallback market data structure
    return {
      ticker: position.ticker,
      event_ticker: position.ticker,
      market_type: 'binary',
      title: position.positionName,
      subtitle: '',
      yes_sub_title: 'Yes',
      no_sub_title: 'No',
      open_time: '',
      close_time: '',
      expected_expiration_time: '',
      expiration_time: '',
      latest_expiration_time: '',
      settlement_timer_seconds: 0,
      status: 'unknown',
      response_price_units: 'usd_cent',
      notional_value: 100,
      notional_value_dollars: [0, 0],
      yes_bid: 0,
      yes_bid_dollars: [0, 0],
      yes_ask: 0,
      yes_ask_dollars: [0, 0],
      no_bid: 0,
      no_bid_dollars: [0, 0],
      no_ask: 0,
      no_ask_dollars: [0, 0],
      last_price: position.purchasePrice * 100, // Convert to cents as fallback
      last_price_dollars: [0, 0],
      previous_yes_bid: 0,
      previous_yes_bid_dollars: [0, 0],
      previous_yes_ask: 0,
      previous_yes_ask_dollars: [0, 0],
      previous_price: 0,
      previous_price_dollars: [0, 0],
      volume: 0,
      volume_24h: 0,
      liquidity: 0,
      liquidity_dollars: [0, 0],
      open_interest: 0,
      result: '',
      can_close_early: false,
      expiration_value: '',
      category: '',
      risk_limit_cents: 0,
      yes_topbook_liquidity_dollars: [0, 0],
      no_topbook_liquidity_dollars: [0, 0],
      strike_type: '',
      floor_strike: 0,
      rules_primary: '',
      rules_secondary: '',
      early_close_condition: '',
      tick_size: 1
    };
  }
}

const getPositionValue = async (position: Position): Promise<PositionWithPrice> => {

  if (position.type === "cash") {
    // Cash always has a price of 1 and no return
    return {
      ...position,
      currentPrice: 1,
      currentValue: position.amount,
      totalReturn: 0,
      originalValue: position.amount
    }
  } else if (position.type === "stock") {
    // For stocks, get real-time price from Yahoo Finance
    let currentPrice = await getStockPrice(position);
    const originalValue= position.amount * position.purchasePrice

    const currentValue = currentPrice * position.amount;
    const totalReturn = originalValue > 0 ? ((currentValue - originalValue) / originalValue) * 100 : 0;

    return {
      ...position,
      currentPrice,
      currentValue,
      totalReturn,
      originalValue
    }
  } else if (position.type === "kalshi") {
    // For Kalshi, get real market data and properly account for fees
    const marketData = await getKalshiMarketData(position);
    
    // Get the correct price based on whether we're betting Yes or No
    let currentPrice: number;
    if (position.side === 'yes') {
      // For Yes positions, use the last price directly
      currentPrice = marketData.last_price / 100; // Convert from cents to dollars
    } else {
      // For No positions, the price is 1 - yes_price
      currentPrice = 1 - (marketData.last_price / 100);
    }
    
    // Original cost basis includes the purchase price + fees (sunk cost)
    const originalValue = (position.purchasePrice * position.contracts) + (position.fees || 0);
    const currentValue = currentPrice * position.contracts;
    
    // Total return includes fees as sunk cost
    const totalReturn = originalValue > 0 ? ((currentValue - originalValue) / originalValue) * 100 : 0;
    
    // Net return excludes fees (for comparison purposes)
    const netReturn = position.purchasePrice > 0 ? 
      ((currentPrice - position.purchasePrice) / position.purchasePrice) * 100 : 0;

    return {
      ...position,
      marketData,
      currentPrice,
      currentValue,
      totalReturn,
      originalValue,
      fees: position.fees || 0,
      netReturn
    }
  }

  // This should never be reached due to TypeScript's exhaustive checking
  throw new Error(`Unknown position type: ${(position as any).type}`);
}


export interface Portfolio {
  positions: PositionWithPrice[];
  lastUpdated: string;
}

const getPortfolio = async (): Promise<Portfolio> => {
  const positionsWithPrices = await Promise.all(
    POSITIONS.map((position) => getPositionValue(position))
  );

  return {
    positions: positionsWithPrices,
    lastUpdated: new Date().toISOString(),
  };
}

export default async function Home() {
  // Server-side data fetching with caching
  const portfolio = await getPortfolio();
  
  return <PositionsDashboard portfolio={portfolio}/>;
}
