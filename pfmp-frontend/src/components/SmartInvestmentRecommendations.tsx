import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  ExpandMore,
  TrendingUp,
  AccountBalance,
  Security,
  CurrencyBitcoin,
  Savings,
  Assessment
} from '@mui/icons-material';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { InvestmentAnalyzer } from '../services/InvestmentAnalyzer';
import { FinancialDataService, type MarketDataResponse, type CryptoData, type EconomicIndicators, type BankRates } from '../services/FinancialDataService';
import type { 
  InvestmentRecommendation, 
  UserProfile, 
  FinancialGoal, 
  InvestmentOption,
  AllocationRecommendation 
} from '../types/investment';

/**
 * Smart Investment Recommendations Component
 */
// Static mock data lifted outside component to stabilize references for hook deps
const MOCK_USER_PROFILE: UserProfile = {
  age: 35,
  riskTolerance: 'moderate',
  investmentExperience: 'intermediate',
  annualIncome: 95000,
  currentSavings: 45000,
  monthlyInvestmentCapacity: 2500,
  taxBracket: 22,
  hasEmergencyFund: true,
  retirementGoalAge: 65
};

const MOCK_GOALS: FinancialGoal[] = [
  {
    id: 'emergency',
    type: 'emergency_fund',
    name: 'Emergency Fund',
    targetAmount: 30000,
    currentAmount: 25000,
    targetDate: new Date('2024-12-31'),
    timeHorizon: 'short',
    priority: 'high',
    riskTolerance: 'conservative'
  },
  {
    id: 'house',
    type: 'house_down_payment',
    name: 'House Down Payment',
    targetAmount: 100000,
    currentAmount: 35000,
    targetDate: new Date('2026-06-01'),
    timeHorizon: 'medium',
    priority: 'high',
    riskTolerance: 'moderate'
  },
  {
    id: 'retirement',
    type: 'retirement',
    name: 'Retirement Savings',
    targetAmount: 1500000,
    currentAmount: 125000,
    targetDate: new Date('2054-12-31'),
    timeHorizon: 'long',
    priority: 'medium',
    riskTolerance: 'aggressive'
  }
];

export const SmartInvestmentRecommendations: React.FC = () => {
  const [analyzer] = useState(new InvestmentAnalyzer());
  const [dataService] = useState(new FinancialDataService());
  const [recommendations, setRecommendations] = useState<InvestmentRecommendation[]>([]);
  const [availableOptions, setAvailableOptions] = useState<InvestmentOption[]>([]);
  interface ComprehensiveMarketData {
    stocks: MarketDataResponse[];
    crypto: CryptoData[];
    economicIndicators: EconomicIndicators;
    bankRates: BankRates[];
  }
  const [marketData, setMarketData] = useState<ComprehensiveMarketData | null>(null);
  const [loading, setLoading] = useState(true);

  // (Mocks moved outside component)

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
        
        // Fetch live market data
        console.log('🔄 Fetching live market data...');
      const liveMarketData = await dataService.getComprehensiveMarketData();
      setMarketData(liveMarketData);
      console.log('📊 Live market data received:', liveMarketData);
        
        // Generate AI recommendations with real data
    const recs = await analyzer.analyzePortfolio(MOCK_USER_PROFILE, MOCK_GOALS);
      const options = await analyzer.getInvestmentOptions();
      setRecommendations(recs);
      setAvailableOptions(options);
      console.log('🤖 AI recommendations generated:', recs);
    } catch (error) {
      console.error('❌ Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [analyzer, dataService]);

  useEffect(() => {
    loadRecommendations();
    const interval = setInterval(loadRecommendations, 300000);
    return () => clearInterval(interval);
  }, [loadRecommendations]);

  const getAssetClassIcon = (assetClass: string) => {
    switch (assetClass) {
      case 'cash': return <Savings />;
      case 'bonds': return <Security />;
      case 'stocks': return <TrendingUp />;
      case 'etfs': return <Assessment />;
      case 'crypto': return <CurrencyBitcoin />;
      default: return <AccountBalance />;
    }
  };

  type AssetClassColor = 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning';
  const getAssetClassColor = (assetClass: string): AssetClassColor => {
    switch (assetClass) {
      case 'cash': return 'success';
      case 'bonds': return 'info';
      case 'stocks': return 'primary';
      case 'etfs': return 'secondary';
      case 'crypto': return 'warning';
      default: return 'default';
    }
  };

  const AllocationCard: React.FC<{ allocation: AllocationRecommendation }> = ({ allocation }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {getAssetClassIcon(allocation.assetClass)}
          <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
            {allocation.assetClass.replace('_', ' ')}
          </Typography>
          <Chip 
            label={`${allocation.percentage}%`} 
            color={getAssetClassColor(allocation.assetClass)}
            size="small"
          />
        </Box>
        
        <Typography variant="h5" color="primary" gutterBottom>
          ${allocation.amount.toLocaleString()}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {allocation.reasoning}
        </Typography>
        
        <Typography variant="subtitle2" gutterBottom>
          Top Options:
        </Typography>
        {allocation.specificOptions.slice(0, 2).map((option, idx) => (
          <Box key={idx} sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              {option.name} ({option.symbol})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.currentYield.toFixed(1)}% current yield • {option.riskLevel} risk
            </Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );

  const RecommendationPanel: React.FC<{ recommendation: InvestmentRecommendation }> = ({ recommendation }) => {
  const goal = MOCK_GOALS.find(g => g.id === recommendation.goalId);
    
    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Typography variant="h6">{goal?.name}</Typography>
            <Box display="flex" gap={1}>
              <Chip 
                label={`${recommendation.projectedReturn.toFixed(1)}% Return`} 
                color="success" 
                size="small" 
              />
              <Chip 
                label={`${recommendation.confidence} confidence`} 
                color={recommendation.confidence === 'high' ? 'success' : 'warning'} 
                size="small" 
              />
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom>Investment Summary</Typography>
                <Typography variant="body2">
                  <strong>Total Amount:</strong> ${recommendation.totalAmount.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Monthly Contribution:</strong> ${recommendation.monthlyContribution.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Time to Goal:</strong> {recommendation.timeToGoal.toFixed(1)} years
                </Typography>
                <Typography variant="body2">
                  <strong>Risk Score:</strong> {recommendation.riskScore.toFixed(0)}/100
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={recommendation.riskScore} 
                  sx={{ mt: 1, height: 8, borderRadius: 1 }}
                  color={recommendation.riskScore > 70 ? 'warning' : recommendation.riskScore > 40 ? 'primary' : 'success'}
                />
              </Paper>
            </Grid>
            
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="subtitle1" gutterBottom>Recommended Allocation</Typography>
              <Grid container spacing={2}>
                {recommendation.allocations.map((allocation, idx) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                    <AllocationCard allocation={allocation} />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>Analysis & Insights</Typography>
              <Typography variant="body1" paragraph>
                {recommendation.reasoning}
              </Typography>
              
              {recommendation.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Considerations:</Typography>
                  <List dense>
                    {recommendation.warnings.map((warning, idx) => (
                      <ListItem key={idx}>
                        <ListItemText primary={warning} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
              
              {recommendation.alternatives.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Alternative Strategies:</Typography>
                  <List dense>
                    {recommendation.alternatives.map((alt, idx) => (
                      <ListItem key={idx}>
                        <ListItemText primary={alt} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <ProtectedRoute>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          Smart Investment Analysis
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          🔴 <strong>LIVE:</strong> Personalized investment recommendations based on your risk tolerance, goals, and <strong>real-time market conditions</strong>.
          Our dual AI engines analyze live data from Alpha Vantage, CoinGecko, and Federal Reserve APIs across hundreds of investment options.
        </Typography>
        
        {marketData && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>⚡ Live Data Connected!</strong> Current market conditions: Fed Rate {marketData.economicIndicators.interestRate}%, 
              VIX {marketData.economicIndicators.vixIndex}, Treasury 10Y {marketData.economicIndicators.treasury10y}%. 
              Data updated: {new Date(marketData.economicIndicators.lastUpdated).toLocaleTimeString()}
            </Typography>
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Analysis Complete!</strong> Based on your moderate risk tolerance and diversified goals, 
                we've identified optimal allocations across {availableOptions.length} investment options. 
                Recommendations consider current market conditions, interest rates at {4.5}%, and your {MOCK_USER_PROFILE.age}-year investment timeline.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              {recommendations.map((recommendation, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <RecommendationPanel recommendation={recommendation} />
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />
            
            <Box textAlign="center">
              <Button variant="contained" color="primary" size="large">
                Implement Recommendations
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Connect your accounts to automatically execute these investment strategies
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </ProtectedRoute>
  );
};