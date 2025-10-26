import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  Label,
  Dot
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Truck, Lightbulb, AlertCircle, Target, Award, Calendar } from 'lucide-react';

const API_BASE = 'https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api';

interface KPIData {
  revenue_growth: number;
  avg_order_value: number;
  order_volume: number;
  delivery_time: number;
}

interface Product {
  product_id: string;
  total_revenue: number;
  total_units: number;
}

interface Region {
  region: string;
  total_revenue: number;
  order_count: number;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  impact: string;
}

const DataOverview: React.FC = () => {
  const [kpis, setKpis] = useState<KPIData>({
    revenue_growth: 0,
    avg_order_value: 0,
    order_volume: 0,
    delivery_time: 0
  });
  const [data, setData] = useState<{
    trends: any[];
    costAnalysis: any[];
    regionalData: Region[];
    productPerformance: Product[];
  }>({
    trends: [],
    costAnalysis: [],
    regionalData: [],
    productPerformance: []
  });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [dataGrouping, setDataGrouping] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Convert timeRange to days
      const daysMap: { [key: string]: number } = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      const days = daysMap[timeRange] || 30;
      
      // Fetch all data in parallel
      const [kpiRes, trendsRes, costRes, regionalRes, productRes, insightsRes] = await Promise.all([
        fetch(`${API_BASE}/data?type=analytics-kpis&days=${days}`),
        fetch(`${API_BASE}/data?type=trends&days=${days}`),
        fetch(`${API_BASE}/data?type=cost-analysis&days=${days}`),
        fetch(`${API_BASE}/data?type=regional-performance&days=${days}`),
        fetch(`${API_BASE}/data?type=product-performance&days=${days}`),
        fetch(`${API_BASE}/insights`)
      ]);
      
      const [kpiData, trendsData, costData, regionalData, productData, insightsData] = await Promise.all([
        kpiRes.json(),
        trendsRes.json(),
        costRes.json(),
        regionalRes.json(),
        productRes.json(),
        insightsRes.json()
      ]);
      
      setKpis(kpiData);
      setData({
        trends: trendsData.trends || [],
        costAnalysis: costData.cost_analysis || [],
        regionalData: regionalData.regions || [],
        productPerformance: productData.products || []
      });
      setInsights(insightsData.insights || []);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group data by week or month
  const groupedTrendData = useMemo(() => {
    if (!data.trends || data.trends.length === 0) return [];
    
    if (dataGrouping === 'daily') {
      return data.trends;
    }
    
    const grouped: { [key: string]: { revenue: number; costs: number; profit: number; count: number } } = {};
    
    data.trends.forEach((item: any) => {
      const date = new Date(item.date);
      let key: string;
      
      if (dataGrouping === 'weekly') {
        // Get week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `W${weekNum} ${date.getFullYear()}`;
      } else {
        // Monthly
        key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = { revenue: 0, costs: 0, profit: 0, count: 0 };
      }
      
      grouped[key].revenue += item.revenue || 0;
      grouped[key].costs += item.costs || 0;
      grouped[key].profit += item.profit || 0;
      grouped[key].count += 1;
    });
    
    return Object.entries(grouped).map(([date, values]) => ({
      date,
      revenue: values.revenue,
      costs: values.costs,
      profit: values.profit
    }));
  }, [data.trends, dataGrouping]);

  // Calculate key metrics and annotations
  const trendMetrics = useMemo(() => {
    if (!groupedTrendData || groupedTrendData.length === 0) {
      return {
        highestRevenue: null,
        lowestProfit: null,
        avgRevenue: 0,
        avgCosts: 0,
        costSpikes: []
      };
    }

    let highestRevenue = groupedTrendData[0];
    let lowestProfit = groupedTrendData[0];
    let totalRevenue = 0;
    let totalCosts = 0;

    groupedTrendData.forEach((item: any) => {
      if (item.revenue > highestRevenue.revenue) {
        highestRevenue = item;
      }
      if (item.profit < lowestProfit.profit) {
        lowestProfit = item;
      }
      totalRevenue += item.revenue;
      totalCosts += item.costs;
    });

    const avgCosts = totalCosts / groupedTrendData.length;
    const avgRevenue = totalRevenue / groupedTrendData.length;

    // Find cost spikes (costs > 1.5x average)
    const costSpikes = groupedTrendData.filter((item: any) => item.costs > avgCosts * 1.5);

    return {
      highestRevenue,
      lowestProfit,
      avgRevenue,
      avgCosts,
      costSpikes
    };
  }, [groupedTrendData]);

  // Dark colors for borders in charts
  const COLORS = ['#3b82f6', '#11b981', '#f59e0b', '#ef4444'];
  
  // Calculate total revenue for donut center
  const totalRegionalRevenue = useMemo(() => {
    return data.regionalData
      .filter(r => r.region !== 'region')
      .reduce((sum, item) => sum + item.total_revenue, 0);
  }, [data.regionalData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            {kpis.revenue_growth >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue Growth</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.revenue_growth !== undefined ? (
                  `${kpis.revenue_growth >= 0 ? '+' : ''}${kpis.revenue_growth.toFixed(1)}%`
                ) : '...'}
              </p>
              <p className={`text-xs ${kpis.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                vs last period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.avg_order_value !== undefined ? (
                  `$${kpis.avg_order_value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`
                ) : '...'}
              </p>
              <p className="text-xs text-blue-600">per order</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Order Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.order_volume !== undefined ? kpis.order_volume.toLocaleString() : '...'}
              </p>
              <p className="text-xs text-purple-600">last 30 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Delivery Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.delivery_time !== undefined ? `${kpis.delivery_time.toFixed(1)} days` : '...'}
              </p>
              <p className="text-xs text-orange-600">avg delay</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue vs Costs Trend</h3>
            <div className="flex space-x-1">
              {(['daily', 'weekly', 'monthly'] as const).map((grouping) => (
                <button
                  key={grouping}
                  onClick={() => setDataGrouping(grouping)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    dataGrouping === grouping
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {grouping.charAt(0).toUpperCase() + grouping.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
            <div className="bg-green-50 p-2 rounded">
              <p className="text-green-600 font-semibold">Highest Revenue</p>
              <p className="text-green-900">${(trendMetrics.highestRevenue?.revenue || 0).toLocaleString()}</p>
              <p className="text-green-600 text-[10px]">{trendMetrics.highestRevenue?.date}</p>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-blue-600 font-semibold">Lowest Profit</p>
              <p className="text-blue-900">${(trendMetrics.lowestProfit?.profit || 0).toLocaleString()}</p>
              <p className="text-blue-600 text-[10px]">{trendMetrics.lowestProfit?.date}</p>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <p className="text-red-600 font-semibold">Cost Spikes</p>
              <p className="text-red-900">{trendMetrics.costSpikes.length}</p>
              <p className="text-red-600 text-[10px]">above avg</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={groupedTrendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c6e0cf" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#c6e0cf" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fedbd9" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#fedbd9" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#afcafc" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#afcafc" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                angle={dataGrouping === 'daily' ? -45 : 0}
                textAnchor={dataGrouping === 'daily' ? 'end' : 'middle'}
                height={dataGrouping === 'daily' ? 60 : 30}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" style={{ minWidth: '200px' }}>
                      <p className="font-semibold text-gray-900 mb-2 pb-2 border-b">{label}</p>
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-gray-700">{entry.name}:</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 ml-3">
                            ${entry.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {payload[0] && payload[1] && typeof payload[0].value === 'number' && typeof payload[1].value === 'number' && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Margin:</span>
                            <span className="font-semibold">
                              {((payload[0].value - payload[1].value) / payload[0].value * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="square"
              />
              
              {/* Reference line for average revenue */}
              <ReferenceLine 
                y={trendMetrics.avgRevenue} 
                stroke="#11b981" 
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              >
                <Label 
                  value={`Avg: $${(trendMetrics.avgRevenue / 1000).toFixed(0)}k`} 
                  position="insideTopRight" 
                  fill="#11b981"
                  fontSize={10}
                />
              </ReferenceLine>
              
              {/* Reference line for average costs */}
              <ReferenceLine 
                y={trendMetrics.avgCosts} 
                stroke="#ef4444" 
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              >
                <Label 
                  value={`Avg: $${(trendMetrics.avgCosts / 1000).toFixed(0)}k`} 
                  position="insideBottomRight" 
                  fill="#ef4444"
                  fontSize={10}
                />
              </ReferenceLine>
              
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#11b981" 
                strokeWidth={2}
                fill="url(#colorRevenue)" 
                name="Revenue"
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="costs" 
                stroke="#ef4444" 
                strokeWidth={2}
                fill="url(#colorCosts)" 
                name="Costs"
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill="url(#colorProfit)" 
                name="Profit"
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Performance</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <defs>
                <radialGradient id="colorRegion0" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="#afcafc" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#afcafc" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#afcafc" stopOpacity={1}/>
                </radialGradient>
                <radialGradient id="colorRegion1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="#c6e0cf" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#c6e0cf" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#c6e0cf" stopOpacity={1}/>
                </radialGradient>
                <radialGradient id="colorRegion2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="#fde6c0" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#fde6c0" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#fde6c0" stopOpacity={1}/>
                </radialGradient>
                <radialGradient id="colorRegion3" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="#fedbd9" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#fedbd9" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#fedbd9" stopOpacity={1}/>
                </radialGradient>
              </defs>
              <Pie
                data={data.regionalData.filter(r => r.region !== 'region')}
                cx="50%"
                cy="45%"
                labelLine={false}
                label={({ region, percent }) => `${region} ${(percent * 100).toFixed(0)}%`}
                innerRadius={70}
                outerRadius={110}
                fill="#8884d8"
                dataKey="total_revenue"
                nameKey="region"
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {data.regionalData.filter(r => r.region !== 'region').map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#colorRegion${index % 4})`}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0];
                  const value = data.value as number;
                  const region = data.name;
                  const percentage = totalRegionalRevenue > 0 
                    ? ((value / totalRegionalRevenue) * 100).toFixed(1)
                    : '0.0';
                  
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-gray-900 mb-2">{region}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Revenue:</span>
                          <span className="text-sm font-semibold text-gray-900 ml-3">
                            ${value.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Percentage:</span>
                          <span className="text-sm font-semibold text-gray-900 ml-3">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-2xl font-bold"
                fill="#1f2937"
              >
                ${(totalRegionalRevenue / 1000000).toFixed(1)}M
              </text>
              <text
                x="50%"
                y="51%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs"
                fill="#6b7280"
              >
                Total Revenue
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Routes by Cost</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={data.costAnalysis
                .sort((a: any, b: any) => b.avg_cost - a.avg_cost)
                .slice(0, 8)
              }
              margin={{ top: 5, right: 20, bottom: 80, left: 60 }}
            >
              <defs>
                <linearGradient id="barGradientWest" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#afcafc" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#afcafc" stopOpacity={1}/>
                </linearGradient>
                <linearGradient id="barGradientEast" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#c6e0cf" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#c6e0cf" stopOpacity={1}/>
                </linearGradient>
                <linearGradient id="barGradientSouth" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#afcafc" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#afcafc" stopOpacity={1}/>
                </linearGradient>
                <linearGradient id="barGradientNorth" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#fedbd9" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#fedbd9" stopOpacity={1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="route" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                label={{ 
                  value: 'Cost (USD)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 14, fill: '#374151', fontWeight: 600 }
                }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-gray-900 mb-2 pb-2 border-b">
                        {data.route}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Region:</span>
                          <span className="text-sm font-semibold text-gray-900 ml-3">
                            {data.region}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Avg Cost:</span>
                          <span className="text-sm font-semibold text-gray-900 ml-3">
                            ${data.avg_cost.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Shipments:</span>
                          <span className="text-sm font-semibold text-gray-900 ml-3">
                            {data.shipment_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="avg_cost" 
                fill="#c6e0cf"
                stroke="#11b981"
                strokeWidth={2}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.productPerformance.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="product_id" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Revenue') return [`$${value.toLocaleString()}`, 'Revenue'];
                  return [`${value.toLocaleString()} units`, 'Units Sold'];
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#111827'
                }}
                labelStyle={{ color: '#111827' }}
                itemStyle={{ color: '#111827' }}
                cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
              />
              <Legend />
              <Bar 
                dataKey="total_revenue" 
                fill="#afcafc" 
                stroke="#3b82f6"
                strokeWidth={2}
                name="Revenue" 
                radius={[8, 8, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2">Showing top products by revenue. Hover for units sold.</p>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-white rounded-lg p-6 card-shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
          AI-Powered Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.map((insight, index) => {
            const getInsightStyle = (type: string) => {
              switch (type) {
                case 'optimization':
                  return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: <Lightbulb className="h-5 w-5 text-green-600" /> };
                case 'growth':
                  return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: <TrendingUp className="h-5 w-5 text-blue-600" /> };
                case 'risk':
                  return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: <AlertCircle className="h-5 w-5 text-orange-600" /> };
                case 'recommendation':
                  return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: <Target className="h-5 w-5 text-purple-600" /> };
                default:
                  return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', icon: <Award className="h-5 w-5 text-gray-600" /> };
              }
            };
            
            const style = getInsightStyle(insight.type);
            
            return (
              <div key={index} className={`${style.bg} border ${style.border} p-4 rounded-lg`}>
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">{style.icon}</div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${style.text} mb-2`}>{insight.title}</h4>
                    <p className={`${style.text} text-sm mb-2`}>
                      {insight.description}
                    </p>
                    {insight.impact && (
                      <p className={`text-xs font-semibold ${style.text} opacity-75`}>
                        Impact: {insight.impact}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DataOverview;
