
import { PositionWithPrice, KalshiPositionWithPrice } from '@/types/positions';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Coins, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Portfolio } from '@/app/page';
import {  formatRelative } from 'date-fns';

//e5658245-0f5c-4bfb-abc9-3f6c63a4507c 


const getAssetIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return <DollarSign className="w-4 h-4" />;
    case 'stock':
      return <BarChart3 className="w-4 h-4" />;
    case 'crypto':
      return <Coins className="w-4 h-4" />;
    case 'kalshi':
      return <Target className="w-4 h-4" />;
    default:
      return <DollarSign className="w-4 h-4" />;
  }
};

const getFunnyEmoji = (type: string) => {
  switch (type) {
    case 'cash':
      return '💵';
    case 'stock':
      return '📊';
    case 'crypto':
      return '⚡';
    case 'kalshi':
      return '🎯';
    default:
      return '💸';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatPercentage = (percentage: number) => {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
};

// Helper function to safely get link from position
const getPositionLink = (position: PositionWithPrice): string | undefined => {
  if (position.type === 'stock' || position.type === 'kalshi') {
    return position.link;
  }
  return undefined;
};

// Helper function to check if position is Kalshi with market data
const isKalshiWithMarketData = (position: PositionWithPrice): position is KalshiPositionWithPrice => {
  return position.type === 'kalshi' && 'marketData' in position && position.marketData !== undefined;
};


const PositionCard = ({ position }: { position: PositionWithPrice }) => {
  const isPositive = position.totalReturn >= 0;
  const isKalshi = isKalshiWithMarketData(position);
  
  // Check if position has a link property (Stock and Kalshi positions can have links)
  const link = getPositionLink(position);
  const hasLink = !!link;
  
  const CardWrapper = hasLink ? 'a' : 'div';
  const cardProps = hasLink ? { href: link, target: '_blank', rel: 'noopener noreferrer' } : {};
  
  // Add some fun styling based on performance
  const cardGradient = isPositive 
    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' 
    : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800';
  
  return (
    <CardWrapper {...cardProps}>
      <Card className={`hover:shadow-xl hover:scale-105 transition-all duration-300 h-full flex flex-col ${cardGradient} group`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {getFunnyEmoji(position.type)} {position.positionName}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="w-fit bg-white/50 dark:bg-black/50">
                {getAssetIcon(position.type)}
                <span className="ml-1 capitalize">{position.type}</span>
              </Badge>
              {position.personName && (
                <Badge variant="secondary" className="w-fit bg-blue-100 dark:bg-blue-900/50">
                  🏈 {position.personName}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">
              {formatCurrency(position.currentValue)}
            </div>
            <div className={`text-sm flex items-center justify-end ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <div className="flex items-center gap-1">
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{formatPercentage(position.totalReturn)}</span>
                <span>{isPositive ? '🚀' : '📉'}</span>
              </div>
            </div>
            {isKalshi && position.fees && position.fees > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                💸 Fees: {formatCurrency(position.fees)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">
              {position.type === 'cash' ? '💰 Amount:' : position.type === 'stock' ? '📊 Shares:' : '🎯 Contracts:'}
            </span>
            <div className="font-semibold">
              {position.type === 'kalshi' 
                ? position.contracts.toLocaleString() 
                : position.amount.toLocaleString()
              }
            </div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">💵 Current Price:</span>
            <div className="font-semibold">{formatCurrency(position.currentPrice)}</div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">🛒 Purchase Price:</span>
            <div className="font-semibold">
              {position.type === 'cash' 
                ? formatCurrency(1.00) 
                : formatCurrency(position.purchasePrice)
              }
            </div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">💸 Total Cost:</span>
            <div className="font-semibold">{formatCurrency(position.originalValue)}</div>
          </div>
        </div>
      </CardContent>
      </Card>
    </CardWrapper>
  );
};

interface PortofolioDashboardProps {
  portfolio: Portfolio
}

export default function PositionsDashboard({ portfolio }: PortofolioDashboardProps) {

  const positions = portfolio.positions;

  const lastUpdated = portfolio.lastUpdated;

  const total = positions.reduce((sum, position) => sum + position.currentValue, 0);
  const originalTotal = 420;
  const returnPercentage = originalTotal > 0 ? ((total - originalTotal) / originalTotal) * 100 : 0;

  const totalValue = total;
  const totalReturn = returnPercentage;
  const isPositive = returnPercentage > 0


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-6 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl border-2 border-yellow-300 dark:border-yellow-700 transform hover:scale-105 transition-transform duration-300 shadow-lg">
                <div className="text-3xl mb-2">🥇</div>
                <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">
                  {formatCurrency(totalValue * 0.625)}
                </div>
                <div className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">1st Place</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">62.5% 🏆</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/30 dark:to-gray-700/30 rounded-xl border-2 border-gray-300 dark:border-gray-600 transform hover:scale-105 transition-transform duration-300 shadow-lg">
                <div className="text-3xl mb-2">🥈</div>
                <div className="text-3xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {formatCurrency(totalValue * 0.25)}
                </div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">2nd Place</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">25% 💪</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl border-2 border-orange-300 dark:border-orange-700 transform hover:scale-105 transition-transform duration-300 shadow-lg">
                <div className="text-3xl mb-2">🥉</div>
                <div className="text-3xl font-bold text-orange-700 dark:text-orange-300 mb-2">
                  {formatCurrency(totalValue * 0.125)}
                </div>
                <div className="text-lg font-semibold text-orange-800 dark:text-orange-200">3rd Place</div>
                <div className="text-sm text-orange-600 dark:text-orange-400">12.5% 🎯</div>
              </div>
            </div>

        {/* Portfolio Summary */}
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl flex items-center gap-3">
                  💰 Portfolio 💰
                </CardTitle>
                <CardDescription className="text-base">
                  🎯 Our portfolio across all asset types • Last updated: {formatRelative(new Date(lastUpdated), new Date())}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                {formatCurrency(totalValue)}
              </div>
              <div className={`text-2xl flex items-center justify-end font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <div className="flex items-center gap-2">
                  {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  <span>{formatPercentage(totalReturn)}</span>
                  <span>{isPositive ? '🚀' : '📉'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Positions Grid */}
        <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {positions.map((position) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </div>
        </div>
      </div>
    </div>
  );
}
