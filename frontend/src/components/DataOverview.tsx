import React, { useState, useEffect } from 'react';
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
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Truck, Lightbulb, AlertCircle, Target, Award } from 'lucide-react';

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Costs Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="costs" stroke="#EF4444" strokeWidth={2} name="Costs" />
              <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.regionalData.filter(r => r.region !== 'region')}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ region, percent }) => `${region} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_revenue"
                nameKey="region"
              >
                {data.regionalData.filter(r => r.region !== 'region').map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Routes by Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.costAnalysis.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="route" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Cost']} />
              <Bar dataKey="avg_cost" fill="#F59E0B" />
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
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
              />
              <Legend />
              <Bar dataKey="total_revenue" fill="#8B5CF6" name="Revenue" radius={[8, 8, 0, 0]} />
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
