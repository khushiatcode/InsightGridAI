import json
import boto3
import os
import time
from datetime import datetime, timedelta
import uuid

# Initialize AWS clients
athena = boto3.client('athena')
s3 = boto3.client('s3')

# Import ML predictions module
ML_ENABLED = False
try:
    print("Attempting to import simple_ml...")
    from simple_ml import predict_fuel_price_with_ml, predict_demand_with_ml
    ML_ENABLED = True
    print("✅ ML predictions enabled (numpy-based, no scipy)")
except ImportError as e:
    print(f"⚠️ ML predictions import error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"⚠️ ML predictions disabled due to error: {e}")
    import traceback
    traceback.print_exc()

# Environment variables
FINANCE_BUCKET = os.environ['FINANCE_BUCKET']
LOGISTICS_BUCKET = os.environ['LOGISTICS_BUCKET']
SALES_BUCKET = os.environ['SALES_BUCKET']
RESULTS_BUCKET = os.environ['RESULTS_BUCKET']
WORKGROUP = os.environ['WORKGROUP']

def handler(event, context):
    """
    Lambda function to process data queries and return insights
    """
    try:
        method = event.get('httpMethod', 'GET')
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        
        # Handle CORS preflight
        if method == 'OPTIONS':
            return create_response(200, {})
        
        if method == 'GET':
            return handle_get_request(event)
        elif method == 'POST':
            return handle_post_request(body)
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(500, {'error': str(e)})

def handle_get_request(event):
    """Handle GET requests for data insights"""
    query_params = event.get('queryStringParameters') or {}
    query_type = query_params.get('type', 'overview') if query_params else 'overview'
    days = int(query_params.get('days', '30')) if query_params and query_params.get('days') else 30
    
    print(f"Query type requested: {query_type}, Days filter: {days}")
    print(f"Query params: {query_params}")
    
    try:
        if query_type == 'overview':
            return get_overview_data()
        elif query_type == 'trends':
            return get_trend_data(days)
        elif query_type == 'costs' or query_type == 'cost-analysis':
            return get_cost_analysis(days)
        elif query_type == 'analytics-kpis':
            return get_analytics_kpis(days)
        elif query_type == 'product-performance':
            return get_product_performance(days)
        elif query_type == 'regional-performance':
            return get_regional_performance(days)
        else:
            return create_response(400, {'error': f'Invalid query type: {query_type}', 'available_types': ['overview', 'trends', 'costs', 'analytics-kpis', 'product-performance', 'regional-performance']})
    except Exception as e:
        print(f"Error in handle_get_request: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': str(e), 'query_type': query_type})

def handle_post_request(body):
    """Handle POST requests for custom queries and simulations"""
    query = body.get('query', '')
    simulation_type = body.get('type', '')
    parameters = body.get('parameters', {})
    
    if simulation_type:
        # Handle simulation requests
        result = run_simulation(simulation_type, parameters)
        return create_response(200, {
            'simulationType': simulation_type,
            'parameters': parameters,
            'result': result
        })
    elif query:
        # Handle custom queries
        result = process_custom_query(query)
        return create_response(200, {
            'query': query,
            'result': result
        })
    else:
        return create_response(400, {'error': 'Query or simulation type is required'})

def get_overview_data():
    """Get overview of all data"""
    queries = {
        'total_revenue': """
            SELECT SUM(revenue) as total_revenue 
            FROM insights_grid_db.sales
        """,
        'total_costs': """
            SELECT SUM(amount) as total_costs 
            FROM insights_grid_db.finance
        """,
        'active_shipments': """
            SELECT COUNT(*) as active_shipments 
            FROM insights_grid_db.logistics
        """,
        'total_orders': """
            SELECT COUNT(DISTINCT order_id) as total_orders 
            FROM insights_grid_db.sales
        """
    }
    
    results = {}
    for key, query in queries.items():
        try:
            result = execute_athena_query(query)
            if len(result['ResultSet']['Rows']) > 1:
                value = result['ResultSet']['Rows'][1]['Data'][0].get('VarCharValue', '0')
                # Convert to float to handle scientific notation, then back to int for display
                results[key] = float(value) if value else 0
            else:
                results[key] = 0
        except Exception as e:
            print(f"Error executing {key}: {str(e)}")
            results[key] = 0
    
    return create_response(200, results)

def get_trend_data(days=30):
    """Get trend data for charts - fetch each dataset separately and merge"""
    
    # Get revenue by date
    revenue_query = f"""
        SELECT date, SUM(revenue) as total_revenue
        FROM insights_grid_db.sales
        GROUP BY date
        ORDER BY date DESC
        LIMIT {min(days, 365)}
    """
    
    # Get costs by date
    costs_query = f"""
        SELECT date, SUM(amount) as total_costs
        FROM insights_grid_db.finance
        GROUP BY date
        ORDER BY date DESC
        LIMIT {min(days, 365)}
    """
    
    # Get logistics data by date
    logistics_query = f"""
        SELECT date, AVG(fuel_price_per_l) as avg_fuel_price, COUNT(DISTINCT route_id) as shipment_count
        FROM insights_grid_db.logistics
        GROUP BY date
        ORDER BY date DESC
        LIMIT {min(days, 365)}
    """
    
    # Fetch all data
    revenue_result = execute_athena_query(revenue_query)
    costs_result = execute_athena_query(costs_query)
    logistics_result = execute_athena_query(logistics_query)
    
    # Build dictionaries for easy merging
    revenue_by_date = {}
    for row in revenue_result['ResultSet']['Rows'][1:]:
        if len(row['Data']) >= 2:
            date_val = row['Data'][0].get('VarCharValue', '')
            rev_val = row['Data'][1].get('VarCharValue', '') if 'VarCharValue' in row['Data'][1] else ''
            if date_val and date_val != 'date':  # Skip header
                revenue_by_date[date_val] = float(rev_val) if rev_val and rev_val != '' else 0
    
    costs_by_date = {}
    for row in costs_result['ResultSet']['Rows'][1:]:
        if len(row['Data']) >= 2:
            date_val = row['Data'][0].get('VarCharValue', '')
            cost_val = row['Data'][1].get('VarCharValue', '') if 'VarCharValue' in row['Data'][1] else ''
            if date_val and date_val != 'date':  # Skip header
                costs_by_date[date_val] = float(cost_val) if cost_val and cost_val != '' else 0
    
    logistics_by_date = {}
    for row in logistics_result['ResultSet']['Rows'][1:]:
        if len(row['Data']) >= 3:
            date_val = row['Data'][0].get('VarCharValue', '')
            fuel_val = row['Data'][1].get('VarCharValue', '') if 'VarCharValue' in row['Data'][1] else ''
            ship_val = row['Data'][2].get('VarCharValue', '') if 'VarCharValue' in row['Data'][2] else ''
            if date_val and date_val != 'date':  # Skip header
                logistics_by_date[date_val] = {
                    'fuel_price': float(fuel_val) if fuel_val and fuel_val != '' else 0,
                    'shipment_count': int(float(ship_val)) if ship_val and ship_val != '' else 0
                }
    
    # Merge all data by date (use revenue dates as primary)
    trends = []
    for date_val in sorted(revenue_by_date.keys(), reverse=True):
        revenue = revenue_by_date.get(date_val, 0)
        costs = costs_by_date.get(date_val, 0)
        logistics = logistics_by_date.get(date_val, {'fuel_price': 0, 'shipment_count': 0})
        
        trends.append({
            'date': date_val,
            'revenue': revenue,
            'costs': costs,
            'profit': revenue - costs,
            'avg_fuel_price': logistics['fuel_price'],
            'shipment_count': logistics['shipment_count']
        })
    
    return create_response(200, {'trends': trends})

def get_cost_analysis(days=30):
    """Get detailed cost analysis"""
    query = f"""
        SELECT 
            l.region,
            l.route_id,
            AVG(l.fuel_used_l * l.fuel_price_per_l) as avg_cost,
            AVG(l.delay_hr) as avg_delay,
            AVG(l.fuel_price_per_l) as avg_fuel_price,
            COUNT(*) as shipment_count
        FROM insights_grid_db.logistics l
        GROUP BY l.region, l.route_id
        ORDER BY avg_cost DESC
        LIMIT {min(days, 50)}
    """
    
    try:
        result = execute_athena_query(query)
        
        cost_analysis = []
        for row in result['ResultSet']['Rows'][1:]:  # Skip header row
            if len(row['Data']) >= 6:  # Ensure we have enough columns
                try:
                    cost_analysis.append({
                        'route': f"{row['Data'][0]['VarCharValue']} - {row['Data'][1]['VarCharValue']}",
                        'avg_cost': float(row['Data'][2]['VarCharValue']) if row['Data'][2]['VarCharValue'] else 0,
                        'avg_delay': float(row['Data'][3]['VarCharValue']) if row['Data'][3]['VarCharValue'] else 0,
                        'avg_fuel_price': float(row['Data'][4]['VarCharValue']) if row['Data'][4]['VarCharValue'] else 0,
                        'shipment_count': int(row['Data'][5]['VarCharValue']) if row['Data'][5]['VarCharValue'] else 0
                    })
                except Exception as e:
                    print(f"Error parsing row: {str(e)}")
                    print(f"Row data: {row}")
                    continue
        
        return create_response(200, {'cost_analysis': cost_analysis})
    except Exception as e:
        print(f"Error in get_cost_analysis: {str(e)}")
        return create_response(500, {'error': str(e)})

def process_custom_query(query):
    """Process custom SQL-like queries"""
    # This is a simplified version - in production, you'd want more sophisticated query parsing
    query_lower = query.lower()
    
    if 'fuel price' in query_lower and 'increase' in query_lower:
        return simulate_fuel_price_increase(query)
    elif 'warehouse' in query_lower and 'new' in query_lower:
        return simulate_new_warehouse(query)
    elif 'demand' in query_lower and 'increase' in query_lower:
        return simulate_demand_increase(query)
    else:
        return {'message': 'Query processed', 'query': query, 'status': 'success'}

def run_simulation(simulation_type, parameters):
    """Run business simulations using Lambda + Athena (with optional ML)"""
    # Check if user wants ML predictions (default: True if ML is enabled)
    use_ml = parameters.get('use_ml_predictions', True) and ML_ENABLED
    print(f"ML_ENABLED={ML_ENABLED}, use_ml={use_ml}, simulation_type={simulation_type}")
    
    if simulation_type == 'fuel_price':
        if use_ml:
            # Get full logistics data for ML analysis
            logistics_data = fetch_logistics_data_for_ml()
            return predict_fuel_price_with_ml(parameters, logistics_data)
        else:
            return simulate_fuel_price_impact(parameters)
    elif simulation_type == 'demand_forecast':
        if use_ml:
            # Get full sales data for ML analysis
            sales_data = fetch_sales_data_for_ml()
            return predict_demand_with_ml(parameters, sales_data)
        else:
            return simulate_demand_forecast(parameters)
    elif simulation_type == 'warehouse_expansion':
        return simulate_warehouse_expansion(parameters)
    elif simulation_type == 'route_optimization':
        return simulate_route_optimization(parameters)
    else:
        return {'error': 'Invalid simulation type'}

def fetch_logistics_data_for_ml():
    """Fetch full logistics data for ML analysis"""
    query = """
        SELECT 
            date,
            fuel_used_l,
            fuel_price_per_l,
            delay_hr,
            shipment_volume_tons
        FROM insights_grid_db.logistics
        ORDER BY date DESC
        LIMIT 1000
    """
    
    try:
        result = execute_athena_query(query)
        logistics_data = []
        
        if result['ResultSet']['Rows']:
            # Skip header
            for row in result['ResultSet']['Rows'][1:]:
                data = row['Data']
                if len(data) >= 5:
                    logistics_data.append({
                        'date': data[0].get('VarCharValue', ''),
                        'fuel_used_l': float(data[1].get('VarCharValue', 0)),
                        'fuel_price_per_l': float(data[2].get('VarCharValue', 0)),
                        'delay_hr': float(data[3].get('VarCharValue', 0)),
                        'shipment_volume_tons': float(data[4].get('VarCharValue', 0))
                    })
        
        return logistics_data
    except Exception as e:
        print(f"Error fetching logistics data for ML: {str(e)}")
        return []

def fetch_sales_data_for_ml():
    """Fetch full sales data for ML analysis"""
    query = """
        SELECT 
            date,
            revenue,
            units_sold,
            unit_price
        FROM insights_grid_db.sales
        ORDER BY date DESC
        LIMIT 1000
    """
    
    try:
        result = execute_athena_query(query)
        sales_data = []
        
        if result['ResultSet']['Rows']:
            # Skip header
            for row in result['ResultSet']['Rows'][1:]:
                data = row['Data']
                if len(data) >= 4:
                    sales_data.append({
                        'date': data[0].get('VarCharValue', ''),
                        'revenue': float(data[1].get('VarCharValue', 0)),
                        'units_sold': int(float(data[2].get('VarCharValue', 0))),
                        'unit_price': float(data[3].get('VarCharValue', 0))
                    })
        
        return sales_data
    except Exception as e:
        print(f"Error fetching sales data for ML: {str(e)}")
        return []

def simulate_fuel_price_impact(parameters):
    """Simulate fuel price impact on logistics costs (Simple calculation)"""
    fuel_increase_percent = parameters.get('fuel_increase_percent', 10)
    time_horizon_months = parameters.get('time_horizon_months', 12)
    
    # Query actual logistics data
    query = f"""
        SELECT 
            AVG(fuel_used_l * fuel_price_per_l) as avg_cost,
            COUNT(*) as shipment_count,
            AVG(fuel_price_per_l) as current_fuel_price
        FROM insights_grid_db.logistics 
    """
    
    try:
        result = execute_athena_query(query)
        if result['ResultSet']['Rows']:
            row = result['ResultSet']['Rows'][1]['Data']
            avg_cost = float(row[0]['VarCharValue'])
            shipment_count = int(row[1]['VarCharValue'])
            current_fuel_price = float(row[2]['VarCharValue'])
            
            # Calculate impact
            fuel_cost_ratio = parameters.get('fuel_cost_ratio', 30) / 100  # Get from params or default 30%
            monthly_impact = avg_cost * shipment_count * fuel_cost_ratio * (fuel_increase_percent / 100)
            total_impact = monthly_impact * time_horizon_months
            
            # Generate monthly breakdown for chart
            monthly_breakdown = []
            cumulative_cost = 0
            for month in range(1, time_horizon_months + 1):
                cumulative_cost += monthly_impact
                monthly_breakdown.append({
                    'month': f'Month {month}',
                    'monthly_cost_increase': round(monthly_impact, 2),
                    'cumulative_cost_increase': round(cumulative_cost, 2)
                })
            
            return {
                'scenario': 'Fuel Price Increase',
                'fuel_increase_percent': fuel_increase_percent,
                'time_horizon_months': time_horizon_months,
                'current_monthly_cost': avg_cost * shipment_count,
                'projected_cost_increase': monthly_impact,
                'total_cost_impact': total_impact,
                'monthly_breakdown': monthly_breakdown,
                'recommendations': [
                    f"Consider shifting {int(fuel_increase_percent * 0.5)}% of shipments to rail transport",
                    "Negotiate bulk fuel contracts for better rates",
                    "Optimize routes to reduce fuel consumption"
                ]
            }
    except Exception as e:
        return {'error': f'Could not process fuel price simulation: {str(e)}'}

def simulate_demand_forecast(parameters):
    """Simulate demand forecast scenarios"""
    demand_increase_percent = parameters.get('demand_increase_percent', 15)
    
    # Query actual sales data (using all data for better simulation)
    query = f"""
        SELECT 
            AVG(revenue) as avg_revenue,
            COUNT(*) as order_count,
            AVG(units_sold) as avg_units_sold
        FROM insights_grid_db.sales
    """
    
    try:
        result = execute_athena_query(query)
        if result['ResultSet']['Rows']:
            row = result['ResultSet']['Rows'][1]['Data']
            avg_revenue = float(row[0]['VarCharValue'])
            order_count = int(row[1]['VarCharValue'])
            avg_units = float(row[2]['VarCharValue'])
            
            # Calculate monthly and total impact
            time_horizon_months = parameters.get('time_horizon_months', 12)
            current_monthly_revenue = avg_revenue * order_count
            monthly_revenue_increase = current_monthly_revenue * (demand_increase_percent / 100)
            total_revenue_increase = monthly_revenue_increase * time_horizon_months
            
            # Generate monthly breakdown for chart
            monthly_breakdown = []
            for month in range(1, time_horizon_months + 1):
                projected_revenue = current_monthly_revenue + (monthly_revenue_increase * (month / time_horizon_months))
                monthly_breakdown.append({
                    'month': f'Month {month}',
                    'current_revenue': round(current_monthly_revenue, 2),
                    'projected_revenue': round(projected_revenue, 2)
                })
            
            return {
                'scenario': 'Demand Forecast',
                'demand_increase_percent': demand_increase_percent,
                'time_horizon_months': time_horizon_months,
                'current_monthly_revenue': current_monthly_revenue,
                'projected_monthly_revenue': current_monthly_revenue + monthly_revenue_increase,
                'projected_revenue_increase': monthly_revenue_increase,
                'total_revenue_increase': total_revenue_increase,
                'monthly_breakdown': monthly_breakdown,
                'capacity_requirements': [
                    f"Increase inventory by {demand_increase_percent}%",
                    f"Consider hiring {max(1, int(demand_increase_percent / 10))} additional staff",
                    "Plan for warehouse expansion if growth exceeds 25%"
                ]
            }
    except Exception as e:
        return {'error': f'Could not process demand forecast: {str(e)}'}

def simulate_warehouse_expansion(parameters):
    """Simulate warehouse expansion impact"""
    location = parameters.get('location', 'Toronto')
    investment_cost = parameters.get('investment_cost', 2000000)
    warehouse_size = parameters.get('warehouse_size', 50000)
    annual_operating_cost = parameters.get('annual_operating_cost', 150000)
    cost_reduction_percent = parameters.get('warehouse_cost_reduction', 25)
    
    # Query all logistics data (use all shipments as proxy for regional analysis)
    query = """
        SELECT 
            AVG(fuel_used_l * fuel_price_per_l) as avg_cost,
            COUNT(*) as total_shipments
        FROM insights_grid_db.logistics
    """
    
    try:
        result = execute_athena_query(query)
        if result['ResultSet']['Rows'] and len(result['ResultSet']['Rows']) > 1:
            row = result['ResultSet']['Rows'][1]['Data']
            avg_cost = float(row[0].get('VarCharValue', '0'))
            total_shipments = int(row[1].get('VarCharValue', '0'))
            
            # Assume 30% of shipments are in the target region
            regional_shipment_ratio = 0.3
            regional_shipments = int(total_shipments * regional_shipment_ratio)
            
            # Calculate current monthly cost for regional shipments
            monthly_regional_cost = avg_cost * regional_shipments
            
            # Calculate savings
            cost_reduction = cost_reduction_percent / 100
            monthly_gross_savings = monthly_regional_cost * cost_reduction
            monthly_operating_cost = annual_operating_cost / 12
            monthly_net_savings = monthly_gross_savings - monthly_operating_cost
            
            # Annual calculations
            annual_gross_savings = monthly_gross_savings * 12
            annual_net_savings = monthly_net_savings * 12
            
            # Payback period
            payback_period = investment_cost / annual_net_savings if annual_net_savings > 0 else 999
            
            # ROI calculation
            roi_percent = (annual_net_savings / investment_cost) * 100 if investment_cost > 0 else 0
            
            return {
                'scenario': 'Warehouse Expansion',
                'location': location,
                'warehouse_size': warehouse_size,
                'investment_cost': investment_cost,
                'annual_operating_cost': annual_operating_cost,
                'cost_reduction_percent': cost_reduction_percent,
                'monthly_regional_cost': round(monthly_regional_cost, 2),
                'monthly_gross_savings': round(monthly_gross_savings, 2),
                'monthly_net_savings': round(monthly_net_savings, 2),
                'annual_gross_savings': round(annual_gross_savings, 2),
                'annual_net_savings': round(annual_net_savings, 2),
                'payback_period_years': round(payback_period, 2),
                'roi_percent': round(roi_percent, 2),
                'regional_shipments': regional_shipments,
                'recommendations': [
                    f"ROI: {round(roi_percent, 1)}% annually" if roi_percent > 0 else "⚠️ Negative ROI - reconsider investment",
                    f"Payback period: {round(payback_period, 1)} years" if payback_period < 100 else "⚠️ Payback period exceeds 100 years",
                    f"Net annual savings: ${round(annual_net_savings, 0):,}" if annual_net_savings > 0 else "⚠️ Annual operating costs exceed savings",
                    "Consider hiring 3-5 additional staff for warehouse operations",
                    f"Projected to handle ~{regional_shipments} shipments per month in {location} region"
                ]
            }
        else:
            return {'error': 'Insufficient logistics data for warehouse expansion analysis'}
    except Exception as e:
        print(f"Warehouse expansion error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': f'Could not process warehouse expansion: {str(e)}'}

def simulate_route_optimization(parameters):
    """Simulate route optimization scenarios"""
    optimization_type = parameters.get('type', 'fuel_efficiency')
    
    # Query current logistics metrics
    query = """
        SELECT 
            AVG(fuel_used_l * fuel_price_per_l) as avg_cost,
            AVG(delay_hr) as avg_delay,
            AVG(fuel_price_per_l) as avg_fuel_price
        FROM insights_grid_db.logistics 
    """
    
    try:
        result = execute_athena_query(query)
        if result['ResultSet']['Rows']:
            row = result['ResultSet']['Rows'][1]['Data']
            avg_cost = float(row[0]['VarCharValue'])
            avg_duration = float(row[1]['VarCharValue'])
            avg_fuel_price = float(row[2]['VarCharValue'])
            
            # Calculate improvements based on optimization type
            if optimization_type == 'fuel_efficiency':
                cost_reduction = 0.15
                time_increase = 0.05
            elif optimization_type == 'time_efficiency':
                cost_reduction = 0.05
                time_increase = -0.20
            else:  # balanced
                cost_reduction = 0.10
                time_increase = -0.10
            
            return {
                'scenario': 'Route Optimization',
                'optimization_type': optimization_type,
                'current_metrics': {
                    'avg_cost': avg_cost,
                    'avg_delay': avg_duration,
                    'avg_fuel_price': avg_fuel_price
                },
                'projected_improvements': {
                    'cost_reduction_percent': cost_reduction * 100,
                    'time_change_percent': abs(time_increase) * 100,
                    'monthly_savings': avg_cost * 1000 * cost_reduction  # Assuming 1000 shipments/month
                }
            }
    except Exception as e:
        return {'error': f'Could not process route optimization: {str(e)}'}

def execute_athena_query(query):
    """Execute Athena query and return results"""
    response = athena.start_query_execution(
        QueryString=query,
        WorkGroup=WORKGROUP,
        ResultConfiguration={
            'OutputLocation': f's3://{RESULTS_BUCKET}/athena-results/'
        }
    )
    
    query_execution_id = response['QueryExecutionId']
    
    # Wait for query to complete
    while True:
        response = athena.get_query_execution(QueryExecutionId=query_execution_id)
        status = response['QueryExecution']['Status']['State']
        
        if status in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
            break
        
        time.sleep(1)
    
    if status == 'SUCCEEDED':
        result = athena.get_query_results(QueryExecutionId=query_execution_id)
        return result
    else:
        raise Exception(f"Query failed: {response['QueryExecution']['Status']['StateChangeReason']}")

def get_analytics_kpis(days=30):
    """Get KPIs for Analytics dashboard with real data"""
    
    # Get all revenue data sorted by date to calculate growth
    all_revenue_query = """
        SELECT date, SUM(revenue) as daily_revenue
        FROM insights_grid_db.sales
        GROUP BY date
        ORDER BY date DESC
    """
    
    # Get sales data sorted by date for time-filtered KPIs
    sales_by_date_query = """
        SELECT date, revenue, order_id
        FROM insights_grid_db.sales
        ORDER BY date DESC
    """
    
    # Get logistics data sorted by date
    logistics_by_date_query = """
        SELECT date, delay_hr
        FROM insights_grid_db.logistics
        ORDER BY date DESC
    """
    
    results = {}
    
    try:
        # Revenue Growth - calculate based on comparing current period vs previous period
        result = execute_athena_query(all_revenue_query)
        if len(result['ResultSet']['Rows']) > 1:
            # Get daily revenues
            daily_revenues = []
            for row in result['ResultSet']['Rows'][1:]:  # Skip header
                if len(row['Data']) >= 2:
                    date_val = row['Data'][0].get('VarCharValue', '')
                    rev_val = row['Data'][1].get('VarCharValue', '0')
                    if date_val and rev_val:
                        daily_revenues.append(float(rev_val) if rev_val else 0)
            
            # Calculate growth: compare first N days vs next N days
            if len(daily_revenues) >= days * 2:
                current_period_revenue = sum(daily_revenues[:days])
                previous_period_revenue = sum(daily_revenues[days:days*2])
                if previous_period_revenue > 0:
                    results['revenue_growth'] = ((current_period_revenue - previous_period_revenue) / previous_period_revenue) * 100
                else:
                    results['revenue_growth'] = 0.0
            elif len(daily_revenues) >= days:
                # Not enough data for comparison, just show based on available data
                current_period_revenue = sum(daily_revenues[:days])
                total_revenue = sum(daily_revenues)
                if total_revenue > current_period_revenue and current_period_revenue > 0:
                    previous_estimate = (total_revenue - current_period_revenue) / max(1, len(daily_revenues) - days) * days
                    if previous_estimate > 0:
                        results['revenue_growth'] = ((current_period_revenue - previous_estimate) / previous_estimate) * 100
                    else:
                        results['revenue_growth'] = 0.0
                else:
                    results['revenue_growth'] = 0.0
            else:
                results['revenue_growth'] = 0.0
        else:
            results['revenue_growth'] = 0.0
            
        # Avg Order Value & Order Volume - from sales data filtered by time
        result = execute_athena_query(sales_by_date_query)
        if len(result['ResultSet']['Rows']) > 1:
            revenues = []
            order_ids = set()
            dates_seen = set()
            
            for row in result['ResultSet']['Rows'][1:]:  # Skip header
                if len(row['Data']) >= 3:
                    date_val = row['Data'][0].get('VarCharValue', '')
                    revenue_val = row['Data'][1].get('VarCharValue', '0')
                    order_id_val = row['Data'][2].get('VarCharValue', '')
                    
                    if date_val:
                        dates_seen.add(date_val)
                        # Only include data from the first N unique dates
                        if len(dates_seen) <= days:
                            if revenue_val:
                                revenues.append(float(revenue_val) if revenue_val else 0)
                            if order_id_val:
                                order_ids.add(order_id_val)
            
            # Calculate Avg Order Value
            if len(revenues) > 0:
                results['avg_order_value'] = sum(revenues) / len(revenues)
            else:
                results['avg_order_value'] = 0
            
            # Calculate Order Volume
            results['order_volume'] = len(order_ids)
        else:
            results['avg_order_value'] = 0
            results['order_volume'] = 0
            
        # Delivery Time - from logistics data filtered by time
        result = execute_athena_query(logistics_by_date_query)
        if len(result['ResultSet']['Rows']) > 1:
            delays = []
            dates_seen = set()
            
            for row in result['ResultSet']['Rows'][1:]:  # Skip header
                if len(row['Data']) >= 2:
                    date_val = row['Data'][0].get('VarCharValue', '')
                    delay_val = row['Data'][1].get('VarCharValue', '0')
                    
                    if date_val:
                        dates_seen.add(date_val)
                        # Only include data from the first N unique dates
                        if len(dates_seen) <= days:
                            if delay_val:
                                delays.append(float(delay_val) if delay_val else 0)
            
            # Calculate Average Delivery Time
            if len(delays) > 0:
                results['delivery_time'] = sum(delays) / len(delays)
            else:
                results['delivery_time'] = 0
        else:
            results['delivery_time'] = 0
            
    except Exception as e:
        print(f"Error getting analytics KPIs: {str(e)}")
        import traceback
        traceback.print_exc()
        results = {
            'revenue_growth': 0,
            'avg_order_value': 0,
            'order_volume': 0,
            'delivery_time': 0
        }
    
    return create_response(200, results)

def get_product_performance(days=30):
    """Get real product performance data"""
    query = f"""
        SELECT 
            product_id,
            SUM(units_sold) as total_units,
            SUM(revenue) as total_revenue,
            AVG(unit_price) as avg_price
        FROM insights_grid_db.sales
        GROUP BY product_id
        ORDER BY total_revenue DESC
        LIMIT {min(days // 3, 20)}
    """
    
    try:
        result = execute_athena_query(query)
        products = []
        
        for row in result['ResultSet']['Rows'][1:]:
            if len(row['Data']) >= 4:
                product_id = row['Data'][0].get('VarCharValue', '')
                units = row['Data'][1].get('VarCharValue', '0')
                revenue = row['Data'][2].get('VarCharValue', '0')
                price = row['Data'][3].get('VarCharValue', '0')
                
                if product_id:
                    products.append({
                        'product_id': product_id,
                        'total_units': int(float(units)) if units else 0,
                        'total_revenue': float(revenue) if revenue else 0,
                        'avg_price': float(price) if price else 0
                    })
        
        return create_response(200, {'products': products})
    except Exception as e:
        print(f"Error getting product performance: {str(e)}")
        return create_response(200, {'products': []})

def get_regional_performance(days=30):
    """Get real regional distribution"""
    query = """
        SELECT 
            region,
            COUNT(DISTINCT order_id) as order_count,
            SUM(revenue) as total_revenue
        FROM insights_grid_db.sales
        GROUP BY region
        ORDER BY total_revenue DESC
    """
    
    try:
        result = execute_athena_query(query)
        regions = []
        
        for row in result['ResultSet']['Rows'][1:]:
            if len(row['Data']) >= 3:
                region = row['Data'][0].get('VarCharValue', '')
                count = row['Data'][1].get('VarCharValue', '0')
                revenue = row['Data'][2].get('VarCharValue', '0')
                
                if region:
                    regions.append({
                        'region': region,
                        'order_count': int(float(count)) if count else 0,
                        'total_revenue': float(revenue) if revenue else 0
                    })
        
        return create_response(200, {'regions': regions})
    except Exception as e:
        print(f"Error getting regional performance: {str(e)}")
        return create_response(200, {'regions': []})

def store_query_in_session(session_id, query):
    """No longer needed - stateless architecture"""
    pass

def create_response(status_code, body):
    """Create API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(body)
    }
