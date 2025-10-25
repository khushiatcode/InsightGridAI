import React, { useState } from 'react';
import { Play, TrendingUp, DollarSign, Truck, Building, MapPin } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SimulationResult {
  scenario: string;
  parameters: any;
  result: any;
}

const SimulationPanel: React.FC = () => {
  const [activeSimulation, setActiveSimulation] = useState<string>('');
  const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
  const [runningSimulations, setRunningSimulations] = useState<Set<string>>(new Set());
  const [parameters, setParameters] = useState({
    fuel_increase_percent: 10,
    time_horizon_months: 12,
    demand_increase_percent: 15,
    warehouse_location: 'Toronto',
    warehouse_size: 50000,
    investment_cost: 2000000,
    optimization_type: 'fuel_efficiency',
    // Advanced assumptions
    fuel_cost_ratio: 30,
    warehouse_cost_reduction: 25,
    annual_operating_cost: 150000,
    show_assumptions: false
  });

  const updateParameter = (key: string, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const toggleAssumptions = () => {
    setParameters(prev => ({ ...prev, show_assumptions: !prev.show_assumptions }));
  };

  const simulations = [
    {
      id: 'fuel_price',
      title: 'Fuel Price Impact',
      description: 'Simulate the effect of fuel price changes on logistics costs',
      icon: TrendingUp,
      color: 'orange'
    },
    {
      id: 'demand_forecast',
      title: 'Demand Forecast',
      description: 'Predict revenue and capacity needs based on demand changes',
      icon: DollarSign,
      color: 'green'
    },
    {
      id: 'warehouse_expansion',
      title: 'Warehouse Expansion',
      description: 'Analyze the ROI and impact of opening new facilities',
      icon: Building,
      color: 'blue'
    },
    {
      id: 'route_optimization',
      title: 'Route Optimization',
      description: 'Optimize delivery routes for cost and time efficiency',
      icon: MapPin,
      color: 'purple'
    }
  ];

  const runSimulation = async (simulationType: string) => {
    setRunningSimulations(prev => new Set(prev).add(simulationType));
    setActiveSimulation(simulationType);

    try {
      const response = await fetch('https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: simulationType,
          parameters: parameters
        }),
      });

      const data = await response.json();
      console.log('Simulation response:', data);
      setSimulationResults(data);
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setRunningSimulations(prev => {
        const newSet = new Set(prev);
        newSet.delete(simulationType);
        return newSet;
      });
    }
  };

  const renderParameterControls = () => {
    if (!activeSimulation) return null;

    return (
      <div className="bg-white rounded-lg p-6 card-shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">📊 Adjust Parameters</h3>
          <button
            onClick={toggleAssumptions}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {parameters.show_assumptions ? '▼ Hide' : '▶'} Assumptions
          </button>
        </div>
        
        {activeSimulation === 'fuel_price' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuel Price Increase: <span className="text-blue-600 font-bold">{parameters.fuel_increase_percent}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={parameters.fuel_increase_percent}
                onChange={(e) => updateParameter('fuel_increase_percent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Horizon: <span className="text-blue-600 font-bold">{parameters.time_horizon_months} months</span>
              </label>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={parameters.time_horizon_months}
                onChange={(e) => updateParameter('time_horizon_months', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 month</span>
                <span>12 months</span>
                <span>24 months</span>
              </div>
            </div>

            {parameters.show_assumptions && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">🔍 Calculation Assumptions</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">
                      Fuel Cost Ratio: <span className="font-bold">{parameters.fuel_cost_ratio}%</span>
                      <span className="ml-2 text-blue-600 cursor-help" title="Percentage of total logistics costs that are fuel-related">ℹ️</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={parameters.fuel_cost_ratio}
                      onChange={(e) => updateParameter('fuel_cost_ratio', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-blue-600 mt-1">
                      <span>10%</span>
                      <span>35%</span>
                      <span>60%</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Industry typical: 25-35%. Adjust based on your business.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-800 mb-2">
                      <strong>Formula:</strong> Impact = (Avg Shipment Cost × Count) × {parameters.fuel_cost_ratio}% × {parameters.fuel_increase_percent}% × {parameters.time_horizon_months} months
                    </p>
                    <p className="text-xs text-blue-700">
                      Using data from S3: insightgridai-logistics bucket
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSimulation === 'demand_forecast' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demand Increase: <span className="text-green-600 font-bold">{parameters.demand_increase_percent}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={parameters.demand_increase_percent}
                onChange={(e) => updateParameter('demand_increase_percent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {parameters.show_assumptions && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-sm font-semibold text-green-900 mb-3">🔍 Calculation Assumptions</h4>
                
                <div className="space-y-2">
                  <div className="text-xs text-green-800">
                    <p className="mb-2">
                      <strong>Growth Model:</strong> Linear growth over 12 months
                    </p>
                    <p className="mb-2">
                      <strong>Revenue Scaling:</strong> Revenue increases proportionally with demand
                    </p>
                    <p className="mb-2">
                      <strong>Staffing Ratio:</strong> 1 additional employee per 10% growth
                    </p>
                  </div>

                  <div className="pt-2 border-t border-green-200">
                    <p className="text-xs text-green-800 mb-1">
                      <strong>Formula:</strong> Revenue Increase = Total Revenue × {parameters.demand_increase_percent}%
                    </p>
                    <p className="text-xs text-green-700">
                      Using data from S3: insightgridai-sales bucket
                    </p>
                  </div>

                  <div className="pt-2 border-t border-green-200">
                    <p className="text-xs text-green-700">
                      <strong>⚠️ Note:</strong> Assumes no capacity constraints or pricing changes
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSimulation === 'warehouse_expansion' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={parameters.warehouse_location}
                onChange={(e) => updateParameter('warehouse_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Toronto">Toronto</option>
                <option value="Montreal">Montreal</option>
                <option value="Vancouver">Vancouver</option>
                <option value="Calgary">Calgary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investment Cost: <span className="text-blue-600 font-bold">${(parameters.investment_cost / 1000000).toFixed(1)}M</span>
              </label>
              <input
                type="range"
                min="500000"
                max="10000000"
                step="250000"
                value={parameters.investment_cost}
                onChange={(e) => updateParameter('investment_cost', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$0.5M</span>
                <span>$5M</span>
                <span>$10M</span>
              </div>
            </div>

            {parameters.show_assumptions && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-900 mb-3">🔍 Calculation Assumptions</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">
                      Cost Reduction: <span className="font-bold">{parameters.warehouse_cost_reduction}%</span>
                      <span className="ml-2 text-purple-600 cursor-help" title="Expected reduction in regional shipping costs">ℹ️</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="40"
                      step="5"
                      value={parameters.warehouse_cost_reduction}
                      onChange={(e) => updateParameter('warehouse_cost_reduction', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-purple-600 mt-1">
                      <span>10%</span>
                      <span>25%</span>
                      <span>40%</span>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      Industry typical: 20-30% for urban areas, 15-25% for rural
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">
                      Annual Operating Cost: <span className="font-bold">${(parameters.annual_operating_cost / 1000).toFixed(0)}K</span>
                    </label>
                    <input
                      type="range"
                      min="50000"
                      max="500000"
                      step="25000"
                      value={parameters.annual_operating_cost}
                      onChange={(e) => updateParameter('annual_operating_cost', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-purple-600 mt-1">
                      <span>$50K</span>
                      <span>$275K</span>
                      <span>$500K</span>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      Includes: staff, utilities, maintenance, insurance
                    </p>
                  </div>

                  <div className="pt-2 border-t border-purple-200">
                    <p className="text-xs text-purple-800 mb-2">
                      <strong>Formula:</strong> Net Savings = (Regional Cost × {parameters.warehouse_cost_reduction}%) - ${(parameters.annual_operating_cost / 1000).toFixed(0)}K/year
                    </p>
                    <p className="text-xs text-purple-700 mb-2">
                      <strong>ROI:</strong> (Net Savings ÷ Investment) × 100
                    </p>
                    <p className="text-xs text-purple-700">
                      Using data from S3: insightgridai-logistics bucket (filtered by {parameters.warehouse_location})
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSimulation === 'route_optimization' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optimization Strategy
              </label>
              <select
                value={parameters.optimization_type}
                onChange={(e) => updateParameter('optimization_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fuel_efficiency">Fuel Efficiency (15% cost savings, 5% slower)</option>
                <option value="time_efficiency">Time Efficiency (20% faster, 5% cost savings)</option>
                <option value="balanced">Balanced (10% cost savings, 10% faster)</option>
              </select>
            </div>

            {parameters.show_assumptions && (
              <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="text-sm font-semibold text-orange-900 mb-3">🔍 Calculation Assumptions</h4>
                
                <div className="space-y-2">
                  <div className="text-xs text-orange-800">
                    <p className="mb-2">
                      <strong>Fuel Efficiency:</strong> 15% cost savings, 5% slower
                    </p>
                    <p className="text-xs text-orange-700 ml-4 mb-2">
                      • Use longer but cheaper routes<br/>
                      • Avoid tolls and highways<br/>
                      • Focus on fuel consumption
                    </p>
                    
                    <p className="mb-2">
                      <strong>Time Efficiency:</strong> 20% faster, 5% cost savings
                    </p>
                    <p className="text-xs text-orange-700 ml-4 mb-2">
                      • Use fastest routes even if expensive<br/>
                      • Pay tolls for speed<br/>
                      • Priority on delivery time
                    </p>
                    
                    <p className="mb-2">
                      <strong>Balanced:</strong> 10% cost savings, 10% faster
                    </p>
                    <p className="text-xs text-orange-700 ml-4 mb-2">
                      • Optimize both factors<br/>
                      • Mix of economical and fast routes<br/>
                      • Best overall value
                    </p>
                  </div>

                  <div className="pt-2 border-t border-orange-200">
                    <p className="text-xs text-orange-800 mb-1">
                      <strong>Formula:</strong> Savings = Avg Cost × Shipments × Strategy %
                    </p>
                    <p className="text-xs text-orange-700">
                      Using data from S3: insightgridai-logistics bucket
                    </p>
                  </div>

                  <div className="pt-2 border-t border-orange-200">
                    <p className="text-xs text-orange-700">
                      <strong>⚠️ Note:</strong> Based on industry benchmarks. Actual results may vary.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => runSimulation(activeSimulation)}
          disabled={runningSimulations.has(activeSimulation)}
          className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-colors ${
            runningSimulations.has(activeSimulation)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {runningSimulations.has(activeSimulation) ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Simulation...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Play className="h-5 w-5 mr-2" />
              Run Simulation with These Parameters
            </div>
          )}
        </button>
      </div>
    );
  };

  const renderSimulationCard = (simulation: any) => {
    const Icon = simulation.icon;
    const isActive = activeSimulation === simulation.id;

    return (
      <div
        key={simulation.id}
        className={`bg-white rounded-lg p-6 card-shadow cursor-pointer transition-all ${
          isActive ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
        }`}
        onClick={() => setActiveSimulation(simulation.id)}
      >
        <div className="flex items-center">
          <div className={`p-3 rounded-lg bg-${simulation.color}-100`}>
            <Icon className={`h-6 w-6 text-${simulation.color}-600`} />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">{simulation.title}</h3>
            <p className="text-sm text-gray-600">{simulation.description}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSimulationResults = () => {
    console.log('simulationResults:', simulationResults);
    if (!simulationResults) return null;

    const { result } = simulationResults;

    return (
      <div className="mt-8 bg-white rounded-lg p-6 card-shadow">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Simulation Results</h3>
        
        {(result.scenario === 'Fuel Price Increase' || result.scenario?.includes('ML-Enhanced')) && (
          <div className="space-y-6">
            {/* ML Model Indicator */}
            {result.model_info && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">🤖</span>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">
                        {result.model_type || 'ML-Enhanced Prediction'}
                      </p>
                      <p className="text-xs text-purple-700">
                        {result.model_info.trend_detected && '📈 Trend Analysis'} 
                        {result.model_info.seasonality_detected && ' • 📅 Seasonality Detection'}
                        {' • '}🎯 Confidence: {result.model_info.confidence}%
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-purple-600 bg-white px-3 py-1 rounded-full">
                    {result.model_info.data_points} data points
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 font-medium mb-1">Fuel Increase</p>
                <p className="text-3xl font-bold text-orange-900">{result.fuel_increase_percent}%</p>
                <p className="text-xs text-orange-600 mt-1">over {result.time_horizon_months} months</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 font-medium mb-1">Total Impact</p>
                <p className="text-3xl font-bold text-red-900">${result.total_cost_impact?.toLocaleString()}</p>
                <p className="text-xs text-red-600 mt-1">
                  ~${(result.projected_monthly_impact || 0).toLocaleString()}/month
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium mb-1">Confidence</p>
                <p className="text-3xl font-bold text-green-900">
                  {result.model_info?.confidence || Math.round((result.confidence_score || 0) * 100)}%
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {result.trend_info?.direction || 'stable'} trend
                </p>
              </div>
            </div>

            {result.monthly_breakdown && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Impact Breakdown</h4>
                
                {/* Legend and Explanation */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start space-x-6">
                    <div className="flex items-center">
                      <div className="w-12 h-0.5 bg-red-500 mr-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Monthly Cost (Red Line - Flat)</p>
                        <p className="text-xs text-gray-600">Extra cost EACH month: ${result.projected_cost_increase?.toLocaleString()}/month</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-12 h-0.5 bg-amber-500 mr-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Cumulative Total (Orange Line - Rising)</p>
                        <p className="text-xs text-gray-600">Total accumulated extra cost over time</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-xs text-gray-700">
                      <strong>💡 Example:</strong> If fuel increases by {result.fuel_increase_percent}%, you'll pay an extra 
                      <strong className="text-red-600"> ${result.projected_cost_increase?.toLocaleString()}</strong> each month.
                      By month {result.time_horizon_months}, your total extra cost will be 
                      <strong className="text-amber-600"> ${result.total_cost_impact?.toLocaleString()}</strong>.
                    </p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={result.monthly_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        const label = name === 'monthly_cost_increase' 
                          ? 'Monthly Extra Cost' 
                          : 'Total Accumulated Cost';
                        return [`$${value.toLocaleString()}`, label];
                      }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', padding: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="monthly_cost_increase" 
                      stroke="#EF4444" 
                      strokeWidth={2} 
                      name="Monthly Cost"
                      dot={{ fill: '#EF4444', r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative_cost_increase" 
                      stroke="#F59E0B" 
                      strokeWidth={2} 
                      name="Cumulative Total"
                      dot={{ fill: '#F59E0B', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {result.recommendations && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h4>
                <div className="space-y-3">
                  {result.recommendations.map((rec: any, index: number) => {
                    // Handle both old (string) and new (object) format
                    if (typeof rec === 'string') {
                      return (
                        <div key={index} className="flex items-start bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{rec}</span>
                        </div>
                      );
                    }
                    
                    // New structured format from ML
                    const iconMap: any = {
                      'warning': '⚠️',
                      'info': '💡',
                      'action': '🎯',
                      'success': '✅'
                    };
                    
                    return (
                      <div key={index} className={`p-4 rounded-lg border ${
                        rec.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        rec.type === 'info' ? 'bg-blue-50 border-blue-200' :
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{iconMap[rec.type] || '📌'}</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{rec.title}</p>
                            <p className="text-xs text-gray-700 mb-2">{rec.description}</p>
                            {rec.action && (
                              <p className="text-xs text-gray-600 italic bg-white px-2 py-1 rounded inline-block">
                                → {rec.action}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {result.scenario === 'Demand Forecast' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Demand Increase</p>
                <p className="text-2xl font-bold text-green-900">{result.demand_increase_percent}%</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Revenue Impact</p>
                <p className="text-2xl font-bold text-blue-900">${result.total_revenue_impact?.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Confidence</p>
                <p className="text-2xl font-bold text-purple-900">{Math.round((result.confidence_score || 0) * 100)}%</p>
              </div>
            </div>

            {result.monthly_forecast && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Forecast</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={result.monthly_forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="projected_revenue" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {result.scenario === 'Route Optimization' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Optimization Type</p>
                <p className="text-2xl font-bold text-blue-900 capitalize">
                  {result.optimization_type?.replace('_', ' ')}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Monthly Savings</p>
                <p className="text-2xl font-bold text-green-900">
                  ${result.projected_improvements?.monthly_savings?.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Time Improvement</p>
                <p className="text-2xl font-bold text-purple-900">
                  {result.projected_improvements?.time_change_percent}%
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Current Metrics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Avg Cost per Shipment</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${result.current_metrics?.avg_cost?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Avg Delay</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result.current_metrics?.avg_delay} hours
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Avg Fuel Price</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${result.current_metrics?.avg_fuel_price}/L
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">💰 Financial Impact</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cost Reduction</p>
                  <p className="text-3xl font-bold text-green-600">
                    {result.projected_improvements?.cost_reduction_percent}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Annual Savings</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${((result.projected_improvements?.monthly_savings || 0) * 12).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {result.recommendations && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h4>
                <div className="space-y-2">
                  {result.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result.scenario === 'Warehouse Expansion' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Investment</p>
                <p className="text-2xl font-bold text-blue-900">${result.investment_cost?.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Annual Savings</p>
                <p className="text-2xl font-bold text-green-900">${result.net_annual_savings?.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Payback Period</p>
              <p className="text-xl font-bold text-gray-900">{result.payback_period_years} years</p>
            </div>

            {result.recommendations && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Simulations</h2>
        <p className="text-gray-600">Select a simulation, adjust parameters, and see the impact on your business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {simulations.map(renderSimulationCard)}
      </div>

      {renderParameterControls()}

      {renderSimulationResults()}
    </div>
  );
};

export default SimulationPanel;
