import json
import os
import boto3
import time
import requests

# AWS clients
athena = boto3.client('athena')
s3 = boto3.client('s3')

# Environment variables
WORKGROUP = os.environ.get('WORKGROUP', 'insights-grid-workgroup')
RESULTS_BUCKET = os.environ.get('RESULTS_BUCKET', 'insightsgridai-results')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

def handler(event, context):
    """
    Lambda function to generate AI insights using Google Gemini
    """
    try:
        method = event.get('httpMethod', 'GET')
        
        # Handle CORS preflight
        if method == 'OPTIONS':
            return create_response(200, {})
        
        if method == 'GET':
            # Generate AI insights based on recent data
            insights = generate_ai_insights()
            return create_response(200, {'insights': insights})
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(500, {'error': str(e)})

def generate_ai_insights():
    """Generate AI insights using Gemini based on real business data"""
    
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not set, returning empty insights")
        return []
    
    try:
        # Fetch recent business data
        business_data = fetch_business_summary()
        
        # Prepare prompt for Gemini
        prompt = f"""You are an AI business analyst for InsightsGridAI, an enterprise digital twin platform. 
Analyze the following business data and provide exactly 4 actionable insights in JSON format.

Business Data Summary:
{json.dumps(business_data, indent=2)}

For each insight, provide:
1. "type": One of ["optimization", "risk", "growth", "recommendation"]
2. "title": Short title (max 5 words)
3. "description": Detailed insight (2-3 sentences, specific numbers from data)
4. "impact": Estimated financial impact if available

Return ONLY a JSON array with 4 insights, no other text. Example format:
[
  {{
    "type": "optimization",
    "title": "Route Cost Optimization",
    "description": "Your East-R005 route shows 23% higher costs than average at $1,345 vs $1,093. Consider consolidating shipments or negotiating with carriers to save approximately $5,200 monthly.",
    "impact": "$5,200/month"
  }}
]"""

        # Call Gemini API
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }
        
        response = requests.post(gemini_url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract text from Gemini response
            if 'candidates' in result and len(result['candidates']) > 0:
                content = result['candidates'][0]['content']
                if 'parts' in content and len(content['parts']) > 0:
                    text = content['parts'][0]['text']
                    
                    # Parse JSON from response
                    # Remove markdown code blocks if present
                    text = text.strip()
                    if text.startswith('```json'):
                        text = text[7:]
                    if text.startswith('```'):
                        text = text[3:]
                    if text.endswith('```'):
                        text = text[:-3]
                    text = text.strip()
                    
                    insights = json.loads(text)
                    return insights
        
        print(f"Gemini API error: {response.status_code} - {response.text}")
        return get_fallback_insights(business_data)
        
    except Exception as e:
        print(f"Error generating AI insights: {str(e)}")
        return get_fallback_insights({})

def fetch_business_summary():
    """Fetch key business metrics to feed into AI"""
    summary = {}
    
    try:
        # Total revenue and order count
        query1 = """
            SELECT 
                SUM(revenue) as total_revenue,
                COUNT(DISTINCT order_id) as total_orders,
                AVG(revenue) as avg_order_value
            FROM insights_grid_db.sales
        """
        result1 = execute_athena_query(query1)
        if len(result1['ResultSet']['Rows']) > 1:
            row = result1['ResultSet']['Rows'][1]['Data']
            summary['total_revenue'] = float(row[0].get('VarCharValue', '0'))
            summary['total_orders'] = int(float(row[1].get('VarCharValue', '0')))
            summary['avg_order_value'] = float(row[2].get('VarCharValue', '0'))
        
        # Top and bottom routes by cost
        query2 = """
            SELECT 
                route_id,
                region,
                AVG((fuel_used_l * fuel_price_per_l)) as avg_cost,
                AVG(delay_hr) as avg_delay
            FROM insights_grid_db.logistics
            GROUP BY route_id, region
            ORDER BY avg_cost DESC
            LIMIT 10
        """
        result2 = execute_athena_query(query2)
        routes = []
        for row in result2['ResultSet']['Rows'][1:]:
            if len(row['Data']) >= 4:
                routes.append({
                    'route_id': row['Data'][0].get('VarCharValue', ''),
                    'region': row['Data'][1].get('VarCharValue', ''),
                    'avg_cost': float(row['Data'][2].get('VarCharValue', '0')),
                    'avg_delay': float(row['Data'][3].get('VarCharValue', '0'))
                })
        summary['top_cost_routes'] = routes[:5]
        summary['low_cost_routes'] = routes[-5:] if len(routes) > 5 else []
        
        # Regional performance
        query3 = """
            SELECT 
                region,
                SUM(revenue) as revenue,
                COUNT(DISTINCT order_id) as orders
            FROM insights_grid_db.sales
            GROUP BY region
            ORDER BY revenue DESC
        """
        result3 = execute_athena_query(query3)
        regions = []
        for row in result3['ResultSet']['Rows'][1:]:
            if len(row['Data']) >= 3:
                regions.append({
                    'region': row['Data'][0].get('VarCharValue', ''),
                    'revenue': float(row['Data'][1].get('VarCharValue', '0')),
                    'orders': int(float(row['Data'][2].get('VarCharValue', '0')))
                })
        summary['regional_performance'] = regions
        
        # Fuel price trends (last 7 vs previous 7 days)
        query4 = """
            WITH recent AS (
                SELECT AVG(fuel_price_per_l) as recent_price
                FROM insights_grid_db.logistics
                ORDER BY date DESC
                LIMIT 7
            ),
            previous AS (
                SELECT AVG(fuel_price_per_l) as previous_price
                FROM insights_grid_db.logistics
                ORDER BY date DESC
                LIMIT 14
                OFFSET 7
            )
            SELECT recent_price, previous_price
            FROM recent, previous
        """
        result4 = execute_athena_query(query4)
        if len(result4['ResultSet']['Rows']) > 1:
            row = result4['ResultSet']['Rows'][1]['Data']
            recent = float(row[0].get('VarCharValue', '0'))
            previous = float(row[1].get('VarCharValue', '0'))
            summary['fuel_price_trend'] = {
                'recent_avg': recent,
                'previous_avg': previous,
                'change_pct': ((recent - previous) / previous * 100) if previous > 0 else 0
            }
        
        # Total costs
        query5 = """
            SELECT SUM(amount) as total_costs
            FROM insights_grid_db.finance
        """
        result5 = execute_athena_query(query5)
        if len(result5['ResultSet']['Rows']) > 1:
            summary['total_costs'] = float(result5['ResultSet']['Rows'][1]['Data'][0].get('VarCharValue', '0'))
        
    except Exception as e:
        print(f"Error fetching business summary: {str(e)}")
    
    return summary

def get_fallback_insights(business_data):
    """Generate rule-based insights if Gemini API fails"""
    insights = []
    
    # Analyze routes
    if 'top_cost_routes' in business_data and len(business_data['top_cost_routes']) > 0:
        highest_route = business_data['top_cost_routes'][0]
        avg_cost = sum(r['avg_cost'] for r in business_data['top_cost_routes']) / len(business_data['top_cost_routes'])
        if highest_route['avg_cost'] > avg_cost * 1.2:
            insights.append({
                'type': 'optimization',
                'title': 'Route Cost Anomaly Detected',
                'description': f"Route {highest_route['route_id']} in {highest_route['region']} has costs ${highest_route['avg_cost']:.2f}, which is {((highest_route['avg_cost']/avg_cost - 1) * 100):.1f}% above average. Consider route optimization or carrier negotiation.",
                'impact': f"${(highest_route['avg_cost'] - avg_cost) * 30:.0f}/month potential savings"
            })
    
    # Analyze fuel prices
    if 'fuel_price_trend' in business_data:
        trend = business_data['fuel_price_trend']
        if abs(trend['change_pct']) > 5:
            direction = 'increased' if trend['change_pct'] > 0 else 'decreased'
            insights.append({
                'type': 'risk' if trend['change_pct'] > 0 else 'growth',
                'title': f'Fuel Price {direction.capitalize()}',
                'description': f"Fuel prices have {direction} by {abs(trend['change_pct']):.1f}% recently (${trend['recent_avg']:.2f}/L vs ${trend['previous_avg']:.2f}/L). {'Budget for increased logistics costs.' if trend['change_pct'] > 0 else 'Opportunity to lock in lower rates.'}",
                'impact': f"{'Risk' if trend['change_pct'] > 0 else 'Savings'}: ${abs(trend['change_pct']) * 1000:.0f}/month"
            })
    
    # Analyze regional performance
    if 'regional_performance' in business_data and len(business_data['regional_performance']) > 1:
        top_region = business_data['regional_performance'][0]
        total_revenue = sum(r['revenue'] for r in business_data['regional_performance'])
        share = (top_region['revenue'] / total_revenue * 100) if total_revenue > 0 else 0
        insights.append({
            'type': 'growth',
            'title': f'{top_region["region"]} Leading Performance',
            'description': f"{top_region['region']} accounts for {share:.1f}% of revenue (${top_region['revenue']:.0f}) with {top_region['orders']} orders. Consider expanding operations or applying successful strategies to other regions.",
            'impact': f"Potential {share/2:.0f}% revenue increase"
        })
    
    # Generic recommendation if not enough data
    if len(insights) < 4 and 'avg_order_value' in business_data:
        insights.append({
            'type': 'recommendation',
            'title': 'Order Value Optimization',
            'description': f"Current average order value is ${business_data['avg_order_value']:.2f}. Implement bundle pricing or minimum order incentives to increase order sizes by 15-20%.",
            'impact': f"${business_data['avg_order_value'] * 0.15 * business_data.get('total_orders', 0):.0f} additional revenue"
        })
    
    # Ensure we always return 4 insights
    while len(insights) < 4:
        insights.append({
            'type': 'recommendation',
            'title': 'Data Analysis Required',
            'description': 'Continue monitoring operations for additional optimization opportunities. More insights will appear as data patterns emerge.',
            'impact': 'Ongoing optimization'
        })
    
    return insights[:4]

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
    max_attempts = 30
    attempt = 0
    while attempt < max_attempts:
        response = athena.get_query_execution(QueryExecutionId=query_execution_id)
        status = response['QueryExecution']['Status']['State']
        
        if status in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
            break
        
        time.sleep(1)
        attempt += 1
    
    if status == 'SUCCEEDED':
        result = athena.get_query_results(QueryExecutionId=query_execution_id)
        return result
    else:
        reason = response['QueryExecution']['Status'].get('StateChangeReason', 'Unknown error')
        raise Exception(f"Query failed: {reason}")

def create_response(status_code, body):
    """Create API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        'body': json.dumps(body)
    }

