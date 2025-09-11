import PositionsDashboard from '@/components/PositionsDashboard';
import { KalshiPosition, Position, PositionWithPrice, StockPosition, KalshiApiResponse, KalshiMarketData} from '@/types/positions';

import { POSITIONS } from '@/data/positions';
import yahooFinance from 'yahoo-finance2';



export const revalidate = 60;

const getStockPrice = async (position: StockPosition): Promise<number> => {
  try {
    const quote = await yahooFinance.quote(position.ticker);
    const price = quote.regularMarketPrice;

    if (price === undefined) {
      console.warn("Unable to get price for position", position);
      return position.purchasePrice;
    }

    return price;
  } catch (error) {
    console.error(`Failed to fetch stock price for ${position.ticker}:`, error);
    // Return purchase price as fallback during build
    return position.purchasePrice;
  }
}

const getKalshiMarketData = async (position: KalshiPosition): Promise<KalshiMarketData> => {
  try {
    const marketsResponse = await fetch(`https://api.elections.kalshi.com/trade-api/v2/markets/${position.ticker}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NextJS App)',
      },
      // Add timeout to prevent hanging during build
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!marketsResponse.ok) {
      throw new Error(`Kalshi API error: ${marketsResponse.status}`);
    }
    
    const responseText = await marketsResponse.text();
    
    // Check if response is valid JSON
    if (!responseText.trim()) {
      throw new Error('Empty response from Kalshi API');
    }
    
    let marketsData: KalshiApiResponse;
    try {
      marketsData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Invalid JSON response from Kalshi API for ${position.ticker}:`, responseText.substring(0, 200));
      throw new Error(`Invalid JSON response: ${parseError}`);
    }
    
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
    const currentPrice = await getStockPrice(position);
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
    const originalValue = (position.purchasePrice * position.contracts) + (position.fees || 0) + position.extraCash;
    const currentValue = currentPrice * position.contracts + position.extraCash;
    
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
  throw new Error(`Unknown position type: ${(position)}`);
}


export interface Portfolio {
  positions: PositionWithPrice[];
  lastUpdated: string;
}

const getPortfolio = async (): Promise<Portfolio> => {
  try {
    // Use Promise.allSettled to handle individual position failures gracefully
    const positionResults = await Promise.allSettled(
      POSITIONS.map((position) => getPositionValue(position))
    );

    const positionsWithPrices = positionResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to get value for position ${index}:`, result.reason);
        // Return a fallback position with purchase price as current price
        const position = POSITIONS[index];
        return {
          ...position,
          currentPrice: position.type === 'cash' ? 1 : position.purchasePrice,
          currentValue: position.type === 'cash' ? position.amount : 
                       position.type === 'kalshi' ? position.contracts * position.purchasePrice : 
                       position.amount * position.purchasePrice,
          totalReturn: 0,
          originalValue: position.type === 'cash' ? position.amount : 
                        position.type === 'kalshi' ? position.contracts * position.purchasePrice : 
                        position.amount * position.purchasePrice,
          ...(position.type === 'kalshi' && { fees: position.fees || 0, netReturn: 0 })
        } as PositionWithPrice;
      }
    });

    return {
      positions: positionsWithPrices,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get portfolio:', error);
    // Return a minimal portfolio with fallback data
    const fallbackPositions = POSITIONS.map(position => ({
      ...position,
      currentPrice: position.type === 'cash' ? 1 : position.purchasePrice,
      currentValue: position.type === 'cash' ? position.amount : 
                   position.type === 'kalshi' ? position.contracts * position.purchasePrice : 
                   position.amount * position.purchasePrice,
      totalReturn: 0,
      originalValue: position.type === 'cash' ? position.amount : 
                    position.type === 'kalshi' ? position.contracts * position.purchasePrice : 
                    position.amount * position.purchasePrice,
      ...(position.type === 'kalshi' && { fees: position.fees || 0, netReturn: 0 })
    })) as PositionWithPrice[];

    return {
      positions: fallbackPositions,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export default async function Home() {
  // Server-side data fetching with caching
  const portfolio = await getPortfolio();
  
  return <PositionsDashboard portfolio={portfolio}/>;
}
