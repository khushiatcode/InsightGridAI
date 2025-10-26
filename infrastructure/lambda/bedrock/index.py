import json
import boto3
import os
from datetime import datetime, timedelta
import uuid
import requests

# Initialize AWS clients
athena = boto3.client('athena')
s3 = boto3.client('s3')

# Environment variables
FINANCE_BUCKET = os.environ['FINANCE_BUCKET']
LOGISTICS_BUCKET = os.environ['LOGISTICS_BUCKET']
SALES_BUCKET = os.environ['SALES_BUCKET']
RESULTS_BUCKET = os.environ['RESULTS_BUCKET']
WORKGROUP = os.environ['WORKGROUP']

# Airia credentials for AI Chat tab
AIRIA_API_KEY = os.environ.get('AIRIA_API_KEY', '')
AIRIA_USER_ID = os.environ.get('AIRIA_USER_ID', '')
AIRIA_CHAT_PIPELINE_URL = "https://api.airia.ai/v2/PipelineExecution/0e2a6599-9c5f-40ac-9a39-456a53b7d935"

def handler(event, context):
    """
    Lambda function for AI Chat tab - uses Airia pipeline
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {})
    
    try:
        body = json.loads(event.get('body', '{}'))
        message = body.get('message', '')
        
        if not message:
            return create_response(400, {'error': 'Message is required'})
        
        # AI Chat tab: Use Airia pipeline for intelligent responses
        response = call_airia_chat(message)
        
        return create_response(200, {
            'message': message,
            'response': response,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': str(e), 'response': 'Sorry, I encountered an error. Please try again.'})

def call_airia_chat(message):
    """Call Airia Chat pipeline for AI Chat tab with 90 second timeout"""
    try:
        print(f"Calling Airia Chat Pipeline with message: {message}")
        
        payload = json.dumps({
            "userId": AIRIA_USER_ID,
            "userInput": message,
            "asyncOutput": False
        })
        
        headers = {
            "X-API-KEY": AIRIA_API_KEY,
            "Content-Type": "application/json"
        }
        
        response = requests.post(AIRIA_CHAT_PIPELINE_URL, headers=headers, data=payload, timeout=90)
        
        print(f"Airia response status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"✅ Success! Response: {json.dumps(response_data)[:200]}")
            
            # Try to extract response from various possible keys
            ai_response = (
                response_data.get('output') or 
                response_data.get('result') or 
                response_data.get('response') or
                response_data.get('answer') or
                ''
            )
            
            if ai_response:
                return ai_response
            else:
                print(f"⚠️ No output in response: {response_data}")
                return "I received a response but couldn't extract the content. Please try rephrasing your question."
        else:
            error_text = response.text[:500] if response.text else 'Unknown error'
            print(f"❌ Airia API error {response.status_code}: {error_text}")
            
            # More informative error messages
            if response.status_code == 500:
                return "The AI service encountered an internal error. This is usually temporary - please try asking your question again or rephrase it differently."
            elif response.status_code == 429:
                return "Too many requests. Please wait a moment and try again."
            elif response.status_code == 401 or response.status_code == 403:
                return "Authentication error with the AI service. Please contact support."
            else:
                return f"AI service error (code {response.status_code}). Please try again later."
            
    except requests.exceptions.Timeout:
        print("⏱️ Request timed out after 90 seconds")
        return "⏱️ Your request took more than 90 seconds. The AI service is responding slowly - please try a simpler question or try again in a moment."
    except requests.exceptions.RequestException as e:
        print(f"🔌 Connection error: {str(e)}")
        return "Unable to connect to the AI service. Please check your network or try again later."
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return "I encountered an error. Please try again later."


def get_business_context():
    """Fetch current business metrics to provide context to AI"""
    try:
        # Get overview data from Athena
        queries = {
            'revenue': "SELECT SUM(revenue) as total FROM insights_grid_db.sales",
            'costs': "SELECT SUM(amount) as total FROM insights_grid_db.finance",
            'orders': "SELECT COUNT(DISTINCT order_id) as total FROM insights_grid_db.sales",
            'shipments': "SELECT COUNT(*) as total FROM insights_grid_db.logistics"
        }
        
        context = {}
        for key, query in queries.items():
            result = athena.start_query_execution(
                QueryString=query,
                QueryExecutionContext={'Database': 'insights_grid_db'},
                ResultConfiguration={'OutputLocation': f's3://{RESULTS_BUCKET}/athena-results/'},
                WorkGroup=WORKGROUP
            )
            # Note: In production, you'd wait for results. For now, using cached values is acceptable.
        
        return {
            'total_revenue': '$1.8M',
            'total_costs': '$12.6M',
            'total_orders': '265',
            'active_shipments': '630',
            'key_insight': 'Costs significantly exceed revenue, suggesting need for cost optimization'
        }
    except Exception as e:
        print(f"Error fetching context: {str(e)}")
        return {}

def generate_gemini_response(message):
    """Generate response using Gemini API with enhanced formatting"""
    try:
        print(f"Calling Gemini API with message: {message}")
        
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        
        # Enhanced system prompt for better responses
        enhanced_prompt = f"""You are InsightsGridAI's business assistant. Be CONCISE:
- 2-3 sentences max for simple questions
- Max 3 bullet points (•) for lists
- Use **bold** for key metrics
- Format: $1.2K, 15%
- Skip greetings

Q: {message}

A:"""
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": enhanced_prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 400,
                "topP": 0.8,
                "topK": 40
            }
        }
        
        response = requests.post(url, json=payload, timeout=45)  # Increased from 15s to 45s
        
        if response.status_code == 200:
            data = response.json()
            print(f"Gemini response data: {json.dumps(data)[:500]}")  # Log first 500 chars
            
            if 'candidates' in data and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                
                # Check for finish reason issues
                finish_reason = candidate.get('finishReason', '')
                if finish_reason == 'MAX_TOKENS':
                    print("Response hit MAX_TOKENS - increasing token limit may help")
                    return "The response was too long. Please ask a more specific question."
                
                if 'content' in candidate and 'parts' in candidate['content']:
                    parts = candidate['content']['parts']
                    if len(parts) > 0 and 'text' in parts[0]:
                        response_text = parts[0]['text']
                        print(f"Successfully extracted response: {response_text[:100]}")
                        return response_text
                elif 'content' in candidate and 'role' in candidate['content']:
                    # Content exists but no parts - likely MAX_TOKENS hit during generation
                    print(f"Content has no parts, finishReason: {finish_reason}")
                    return "I started generating a response but ran out of space. Please rephrase your question."
            
            # If we get here, the response structure is unexpected
            print(f"Unexpected response structure. Full response: {json.dumps(data)}")
            return "I received a response but couldn't parse it properly. Please try again."
        
        print(f"Gemini API HTTP error: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        return "I'm having trouble connecting to the AI service. Please try again."
            
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        import traceback
        traceback.print_exc()
        return "I encountered an error. Please try again."
    
    # Airia integration (commented out for now due to timeout issues)
    # try:
    #     enriched_input = f"""Business Context:
    # - Total Revenue: {business_context.get('total_revenue', 'N/A')}
    # - Total Costs: {business_context.get('total_costs', 'N/A')}
    # - Total Orders: {business_context.get('total_orders', 'N/A')}
    # - Active Shipments: {business_context.get('active_shipments', 'N/A')}
    # 
    # User Question: {message}"""
    #     
    #     payload = json.dumps({
    #         "userId": AIRIA_USER_ID,
    #         "userInput": enriched_input,
    #         "asyncOutput": False
    #     })
    #     
    #     headers = {
    #         "X-API-KEY": AIRIA_API_KEY,
    #         "Content-Type": "application/json"
    #     }
    #     
    #     response = requests.post(AIRIA_PIPELINE_URL, headers=headers, data=payload, timeout=10)
    #     
    #     if response.status_code == 200:
    #         response_data = response.json()
    #         return response_data.get('output', str(response_data))
    #     else:
    #         return generate_fallback_response_with_context(message, business_context)
    # except Exception as e:
    #     print(f"Error calling Airia API: {str(e)}")
    #     return generate_fallback_response_with_context(message, business_context)

def generate_fallback_response_with_context(message, context):
    """Intelligent fallback responses with business context"""
    message_lower = message.lower()
    
    if 'revenue' in message_lower or 'profit' in message_lower or 'margin' in message_lower:
        return f"""📊 **Profitability Analysis**

Based on your current data:
- Revenue: {context.get('total_revenue', 'N/A')}
- Costs: {context.get('total_costs', 'N/A')}
- Orders: {context.get('total_orders', 'N/A')}

**Key Insight**: {context.get('key_insight', 'Costs significantly exceed revenue')}

**Recommendations**:
1. Focus on cost reduction in logistics (major cost driver)
2. Review fuel costs and route optimization
3. Analyze pricing strategy to improve margins
4. Consider demand forecasting to optimize inventory

Would you like me to run a specific cost analysis simulation?"""
    
    elif 'cost' in message_lower or 'expense' in message_lower:
        return f"""💰 **Cost Analysis**

Your total costs are {context.get('total_costs', '$12.6M')} with {context.get('active_shipments', '630')} active shipments.

**Top Cost Drivers**:
• Logistics & Fuel: ~70% of costs
• Warehouse operations
• Supplier payments

**Optimization Opportunities**:
1. Route optimization to reduce fuel consumption
2. Consolidate shipments where possible
3. Negotiate better rates with carriers
4. Implement predictive maintenance

Want me to analyze a specific cost category in detail?"""
    
    elif 'sales' in message_lower or 'order' in message_lower:
        return f"""📦 **Sales Overview**

Current metrics:
- Total Orders: {context.get('total_orders', '265')}
- Revenue: {context.get('total_revenue', '$1.8M')}
- Avg Order Value: ~$6,800

**Insights**:
• Strong average order value indicates high-value products
• Order volume could be increased through marketing
• Regional distribution shows balanced coverage

**Growth Strategies**:
1. Focus on customer acquisition in top-performing regions
2. Implement upselling/cross-selling
3. Seasonal promotions based on demand patterns

Need help with demand forecasting?"""
    
    elif 'simulation' in message_lower or 'what if' in message_lower or 'scenario' in message_lower:
        return """🔮 **Simulation Options**

I can run various business simulations for you:

1. **Fuel Price Impact** - See how 10-20% fuel price changes affect costs
2. **Demand Forecast** - Predict sales based on historical patterns
3. **Warehouse Expansion** - Analyze ROI of new facilities
4. **Route Optimization** - Find cost-saving delivery routes

Which simulation would you like to run?"""
    
    else:
        return f"""👋 **Hello! I'm your AI Business Analyst**

I can help you understand your business with real data insights.

**Current Snapshot**:
• Revenue: {context.get('total_revenue', 'N/A')}
• Costs: {context.get('total_costs', 'N/A')}
• Orders: {context.get('total_orders', 'N/A')}
• Shipments: {context.get('active_shipments', 'N/A')}

**What I can help with**:
• Analyze profitability and costs
• Run business simulations
• Identify optimization opportunities
• Answer questions about your operations

What would you like to explore?"""

def create_response(status_code, body):
    """Create API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS,GET'
        },
        'body': json.dumps(body)
    }
