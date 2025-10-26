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
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
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
import ChatWithData from './components/ChatWithData';
import './App.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface OverviewData {
  total_revenue?: number;
  total_costs?: number;
  active_shipments?: number;
  total_orders?: number;
}

interface QuarterlyData {
  quarter: string;
  revenue: number;
  costs: number;
}

interface FuelPieData {
  name: string;
  volume: number;
  avgPrice: number;
}

interface BudgetData {
  quarter: string;
  total_budget: number;
  total_spent: number;
  departments: {
    [key: string]: {
      budget: number;
      spent: number;
    };
  };
}

interface QuarterlyShipmentData {
  quarter: string;
  shipment_count: number;
}

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [trendData, setTrendData] = useState([]);
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyData[]>([]);
  const [quarterlyShipmentData, setQuarterlyShipmentData] = useState<QuarterlyShipmentData[]>([]);
  const [fuelPieData, setFuelPieData] = useState<FuelPieData[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
    fetchTrendData();
    fetchBudgetData();
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

  const processQuarterlyData = (trends: any[]): QuarterlyData[] => {
    if (!trends || trends.length === 0) return [];
    
    // Parse dates and group by quarter for current year
    const dataByQuarter: { [key: string]: { revenue: number[]; costs: number[] } } = {};
    const currentYear = new Date().getFullYear();
    
    trends.forEach((item: any) => {
      if (item.date && item.revenue !== undefined && item.costs !== undefined) {
        const date = new Date(item.date);
        const year = date.getFullYear();
        
        // Only process current year data
        if (year === currentYear) {
          const month = date.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          const key = `Q${quarter}`;
          
          if (!dataByQuarter[key]) {
            dataByQuarter[key] = { revenue: [], costs: [] };
          }
          dataByQuarter[key].revenue.push(item.revenue);
          dataByQuarter[key].costs.push(item.costs);
        }
      }
    });
    
    // Build quarterly comparison data with revenue vs costs
    const quarterlyComparison = [];
    for (let q = 1; q <= 4; q++) {
      const key = `Q${q}`;
      const data = dataByQuarter[key];
      
      const avgRevenue = data && data.revenue.length > 0
        ? Math.round(data.revenue.reduce((sum, val) => sum + val, 0) / data.revenue.length)
        : 0;
        
      const avgCosts = data && data.costs.length > 0
        ? Math.round(data.costs.reduce((sum, val) => sum + val, 0) / data.costs.length)
        : 0;
      
      quarterlyComparison.push({
        quarter: key,
        revenue: avgRevenue,
        costs: avgCosts
      });
    }
    
    return quarterlyComparison;
  };

  const processQuarterlyShipmentData = (trends: any[]): QuarterlyShipmentData[] => {
    if (!trends || trends.length === 0) return [];
    
    const dataByQuarter: { [key: string]: number[] } = {};
    const currentYear = new Date().getFullYear();
    
    trends.forEach((item: any) => {
      if (item.date && item.shipment_count !== undefined) {
        const date = new Date(item.date);
        const year = date.getFullYear();
        
        if (year === currentYear) {
          const month = date.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          const key = `Q${quarter}`;
          
          if (!dataByQuarter[key]) {
            dataByQuarter[key] = [];
          }
          dataByQuarter[key].push(item.shipment_count || 0);
        }
      }
    });
    
    const quarterlyShipment = [];
    for (let q = 1; q <= 4; q++) {
      const key = `Q${q}`;
      const data = dataByQuarter[key];
      
      const totalShipments = data && data.length > 0
        ? Math.round(data.reduce((sum, val) => sum + val, 0))
        : 0;
      
      quarterlyShipment.push({
        quarter: key,
        shipment_count: totalShipments
      });
    }
    
    return quarterlyShipment;
  };

  const processFuelPieData = (trends: any[]): FuelPieData[] => {
    if (!trends || trends.length === 0) return [];
    
    const dataByQuarter: { [key: string]: { volume: number[]; price: number[] } } = {};
    const currentYear = new Date().getFullYear();
    
    trends.forEach((item: any) => {
      if (item.date && item.fuel_volume !== undefined && item.avg_fuel_price !== undefined) {
        const date = new Date(item.date);
        const year = date.getFullYear();
        
        if (year === currentYear) {
          const month = date.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          const key = `Q${quarter}`;
          
          if (!dataByQuarter[key]) {
            dataByQuarter[key] = { volume: [], price: [] };
          }
          dataByQuarter[key].volume.push(item.fuel_volume || 0);
          dataByQuarter[key].price.push(item.avg_fuel_price || 0);
        }
      }
    });
    
    const pieData = [];
    for (let q = 1; q <= 4; q++) {
      const key = `Q${q}`;
      const data = dataByQuarter[key];
      
      const totalVolume = data && data.volume.length > 0
        ? Math.round(data.volume.reduce((sum, val) => sum + val, 0))
        : 0;
        
      const avgPrice = data && data.price.length > 0
        ? parseFloat((data.price.reduce((sum, val) => sum + val, 0) / data.price.length).toFixed(2))
        : 0;
      
      pieData.push({
        name: key,
        volume: totalVolume,
        avgPrice: avgPrice
      });
    }
    
    return pieData;
  };

  const fetchTrendData = async () => {
    try {
      const response = await fetch('https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api/data?type=trends&days=730');
      const data = await response.json();
      const trends = data.trends || [];
      setTrendData(trends);
      
      // Process quarterly data for the Revenue Trends chart
      const quarterly = processQuarterlyData(trends);
      setQuarterlyData(quarterly);
      
      // Process quarterly shipment data
      const quarterlyShipments = processQuarterlyShipmentData(trends);
      setQuarterlyShipmentData(quarterlyShipments);
      
      // Process fuel data for pie chart
      const fuelPie = processFuelPieData(trends);
      setFuelPieData(fuelPie);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  const fetchBudgetData = async () => {
    try {
      const response = await fetch('https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api/data?type=budget-vs-spent');
      const data = await response.json();
      setBudgetData(data.quarterly_budget || []);
    } catch (error) {
      console.error('Error fetching budget data:', error);
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
            <BarChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12 }}
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
                labelFormatter={(label) => `Quarter: ${label} (${new Date().getFullYear()})`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => value === 'revenue' ? 'Revenue' : 'Costs'}
              />
              <Bar 
                dataKey="revenue" 
                fill="#3B82F6" 
                radius={[8, 8, 0, 0]}
                name="revenue"
              />
              <Bar 
                dataKey="costs" 
                fill="rgb(245, 158, 11)" 
                radius={[8, 8, 0, 0]}
                name="costs"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quarterly Fuel Volume Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fuelPieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={85}
                fill="#8884d8"
                dataKey="volume"
                nameKey="name"
              >
                {fuelPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  const avgPrice = props.payload.avgPrice;
                  return [
                    `${value.toLocaleString()} L`,
                    `Fuel Volume (Avg Price: $${avgPrice.toFixed(2)}/L)`
                  ];
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend 
                formatter={(value) => `${value} Fuel Volume`}
              />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">Hover over each section to see the average fuel price</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quarterly Shipment Volume ({new Date().getFullYear()})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={quarterlyShipmentData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis 
                dataKey="quarter"
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <PolarRadiusAxis 
                angle={90}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Total Shipments']}
                labelFormatter={(label) => `Quarter: ${label} (${new Date().getFullYear()})`}
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
                formatter={() => 'Total Shipments'}
              />
              <Radar 
                dataKey="shipment_count" 
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.6}
                strokeWidth={2}
                name="Total Shipments"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 card-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quarterly Budget vs Actual Spending ({new Date().getFullYear()})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
                        <p className="font-semibold text-gray-900 mb-2">{data.quarter} ({new Date().getFullYear()})</p>
                        <div className="space-y-1 mb-3">
                          <p className="text-sm">
                            <span className="font-medium text-blue-600">Budget Allocated:</span>{' '}
                            <span className="font-semibold">${data.total_budget.toLocaleString()}</span>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-orange-600">Amount Spent:</span>{' '}
                            <span className="font-semibold">${data.total_spent.toLocaleString()}</span>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-gray-600">Variance:</span>{' '}
                            <span className={`font-semibold ${data.total_spent > data.total_budget ? 'text-red-600' : 'text-green-600'}`}>
                              ${Math.abs(data.total_budget - data.total_spent).toLocaleString()}
                              {data.total_spent > data.total_budget ? ' over' : ' under'}
                            </span>
                          </p>
                        </div>
                        {data.departments && Object.keys(data.departments).length > 0 && (
                          <div className="border-t pt-2">
                            <p className="font-medium text-gray-700 text-xs mb-1">Department Breakdown:</p>
                            <div className="space-y-1">
                              {Object.entries(data.departments).map(([dept, values]: [string, any]) => (
                                <div key={dept} className="text-xs">
                                  <span className="font-medium text-gray-600">{dept}:</span>{' '}
                                  <span className="text-gray-800">
                                    ${values.spent.toLocaleString()} / ${values.budget.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => value === 'total_budget' ? 'Budget Allocated' : 'Amount Spent'}
              />
              <Bar 
                dataKey="total_budget" 
                fill="#3B82F6" 
                radius={[8, 8, 0, 0]}
                name="total_budget"
              />
              <Bar 
                dataKey="total_spent" 
                fill="rgb(245, 158, 11)" 
                radius={[8, 8, 0, 0]}
                name="total_spent"
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">Hover over bars to see department-wise spending breakdown</p>
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
      
      {/* Chat with Data widget - only show on Overview tab */}
      {activeTab === 'overview' && <ChatWithData />}
    </div>
  );
}

export default App;
