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
import { 
  MessageCircle, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Package, 
  Zap,
  Brain,
  Play
} from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import SimulationPanel from './components/SimulationPanel';
import DataOverview from './components/DataOverview';
import './App.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface OverviewData {
  total_revenue?: number;
  total_costs?: number;
  active_shipments?: number;
  total_orders?: number;
}

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [trendData, setTrendData] = useState([]);
  const [costAnalysis, setCostAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
    fetchTrendData();
    fetchCostAnalysis();
  }, []);

  const fetchOverviewData = async () => {
    try {
      const response = await fetch('https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api/data?type=overview');
      const data = await response.json();
      setOverviewData(data);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const response = await fetch('https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api/data?type=trends');
      const data = await response.json();
      setTrendData(data.trends || []);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  const fetchCostAnalysis = async () => {
    try {
      const response = await fetch('https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api/data?type=cost-analysis');
      const data = await response.json();
      setCostAnalysis(data.cost_analysis || []);
    } catch (error) {
      console.error('Error fetching cost analysis:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'chat', label: 'AI Chat', icon: MessageCircle },
    { id: 'simulate', label: 'Simulations', icon: Play },
    { id: 'analytics', label: 'Analytics', icon: BarChart }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${overviewData?.total_revenue?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {overviewData?.total_orders?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Shipments</p>
              <p className="text-2xl font-bold text-gray-900">
                {overviewData?.active_shipments?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 card-shadow">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Costs</p>
              <p className="text-2xl font-bold text-gray-900">
                ${overviewData?.total_costs?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`, 
                  name === 'revenue' ? 'Revenue' : 'Costs'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                strokeWidth={2} 
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="costs" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Costs"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis by Route</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costAnalysis.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="route" 
                angle={-20} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Avg Cost']}
                labelFormatter={(label) => `Route: ${label}`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Bar 
                dataKey="avg_cost" 
                fill="#3B82F6" 
                radius={[8, 8, 0, 0]}
                name="Average Cost"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Price Impact</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                domain={['dataMin - 0.1', 'dataMax + 0.1']}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}/L`, 'Fuel Price']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="avg_fuel_price" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Avg Fuel Price ($/L)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [value, 'Shipment Count']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
              />
              <Bar 
                dataKey="shipment_count" 
                fill="#8B5CF6" 
                radius={[8, 8, 0, 0]}
                name="Active Shipments"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'chat':
        return <ChatInterface />;
      case 'simulate':
        return <SimulationPanel />;
      case 'analytics':
        return <DataOverview />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="gradient-bg text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 mr-3" />
              <h1 className="text-xl font-bold">InsightsGridAI</h1>
              <span className="ml-2 text-sm opacity-75">AWS Digital Twin Copilot</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="opacity-75">Powered by AWS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
}

export default App;
