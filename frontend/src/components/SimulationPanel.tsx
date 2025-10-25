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
    demand_increase_percent: 15,
    warehouse_location: 'Toronto',
    warehouse_size: 50000,
    investment_cost: 2000000
  });

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

  const renderSimulationCard = (simulation: any) => {
    const Icon = simulation.icon;
    const isActive = activeSimulation === simulation.id;
    const isCurrentlyRunning = runningSimulations.has(simulation.id);

    return (
      <div
        key={simulation.id}
        className={`bg-white rounded-lg p-6 card-shadow cursor-pointer transition-all ${
          isActive ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
        }`}
        onClick={() => setActiveSimulation(simulation.id)}
      >
        <div className="flex items-center mb-4">
          <div className={`p-3 rounded-lg bg-${simulation.color}-100`}>
            <Icon className={`h-6 w-6 text-${simulation.color}-600`} />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">{simulation.title}</h3>
            <p className="text-sm text-gray-600">{simulation.description}</p>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            runSimulation(simulation.id);
          }}
          disabled={isCurrentlyRunning}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isCurrentlyRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isCurrentlyRunning ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Running...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Play className="h-4 w-4 mr-2" />
              Run Simulation
            </div>
          )}
        </button>
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
        
        {result.scenario === 'Fuel Price Increase' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Fuel Increase</p>
                <p className="text-2xl font-bold text-orange-900">{result.fuel_increase_percent}%</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Cost Impact</p>
                <p className="text-2xl font-bold text-red-900">${result.total_cost_impact?.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Confidence</p>
                <p className="text-2xl font-bold text-green-900">{Math.round((result.confidence_score || 0) * 100)}%</p>
              </div>
            </div>

            {result.monthly_breakdown && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Impact Breakdown</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={result.monthly_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Cost Increase']} />
                    <Line type="monotone" dataKey="monthly_cost_increase" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="cumulative_cost_increase" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

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
        <p className="text-gray-600">Run "what-if" scenarios to understand the impact of business decisions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {simulations.map(renderSimulationCard)}
      </div>

      {renderSimulationResults()}
    </div>
  );
};

export default SimulationPanel;
