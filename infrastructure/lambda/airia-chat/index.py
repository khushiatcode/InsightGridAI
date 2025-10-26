import json
import os
import requests
from datetime import datetime

# Airia credentials
AIRIA_API_KEY = os.environ.get('AIRIA_API_KEY', '')
AIRIA_USER_ID = os.environ.get('AIRIA_USER_ID', '')
AIRIA_PIPELINE_URL = "https://api.airia.ai/v2/PipelineExecution/70ef9a9d-5eb5-44e8-873b-e8060f024791"

def handler(event, context):
    """
    Lambda function for Chat with Data - calls Airia directly without modifications
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {})
    
    try:
        body = json.loads(event.get('body', '{}'))
        message = body.get('message', '')
        
        if not message:
            return create_response(400, {'error': 'Message is required'})
        
        print(f"Calling Airia API directly with user message: {message}")
        
        # Call Airia directly - no prompt modifications
        response = call_airia_api(message)
        
        return create_response(200, {
            'message': message,
            'response': response,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': str(e), 'response': 'An error occurred. Please try again.'})

def call_airia_api(message):
    """Call Airia API with user message as-is with 90 second timeout"""
    try:
        print(f"Calling Airia API with message: {message}")
        
        payload = json.dumps({
            "userId": AIRIA_USER_ID,
            "userInput": message,  # Send exactly what user typed
            "asyncOutput": False
        })
        
        headers = {
            "X-API-KEY": AIRIA_API_KEY,
            "Content-Type": "application/json"
        }
        
        response = requests.post(AIRIA_PIPELINE_URL, headers=headers, data=payload, timeout=90)
        
        print(f"Airia response status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"✅ Success!")
            print(f"Airia response: {json.dumps(response_data)[:200]}")
            
            # Try to extract response from various possible keys
            ai_response = (
                response_data.get('output') or 
                response_data.get('result') or 
                response_data.get('response') or
                ''
            )
            
            if ai_response:
                return ai_response
            else:
                print(f"⚠️ No output in Airia response: {response_data}")
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
        return "Unable to connect to Airia service. Please check your network or try again later."
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return "An unexpected error occurred. Please try again later."

def create_response(status_code, body):
    """Create API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps(body)
    }

