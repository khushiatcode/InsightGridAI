import json
import os
import requests
from datetime import datetime

# Airia credentials
AIRIA_API_KEY = os.environ.get('AIRIA_API_KEY', 'ak-Mzc2MjA0Mjk5NXwxNzYxNDI1NDc5MzU1fHRpLVUyRnVkR0VnUTJ4aGNtRWdWVzVwZG1WeWMybDBlUzFQY0dWdUlGSmxaMmx6ZEhKaGRHbHZiaTFRY205bVpYTnphVzl1WVd4Zk5EaGtaRGd3WWpZdFpXSXpZaTAwWmpOakxXSmpObU10WkRWbU5qTmxabVJoWmpCbHwxfDE2ODU5MTYyNDEg')
AIRIA_USER_ID = os.environ.get('AIRIA_USER_ID', '019a1ca8-be4d-7f6a-8bf4-63d7ff1db5b5')
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
    """Call Airia API with user message as-is (no modifications)"""
    try:
        payload = json.dumps({
            "userId": AIRIA_USER_ID,
            "userInput": message,  # Send exactly what user typed
            "asyncOutput": False
        })
        
        headers = {
            "X-API-KEY": AIRIA_API_KEY,
            "Content-Type": "application/json"
        }
        
        response = requests.post(AIRIA_PIPELINE_URL, headers=headers, data=payload, timeout=25)
        
        print(f"Airia response status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
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
                print(f"No output in Airia response: {response_data}")
                return "I received a response but couldn't extract the content. Please try rephrasing your question."
        else:
            error_text = response.text[:200] if response.text else 'Unknown error'
            print(f"Airia API error {response.status_code}: {error_text}")
            return f"Airia service returned an error. Please try again or contact support."
            
    except requests.exceptions.Timeout:
        print("Airia API timeout after 25 seconds")
        return "⏱️ Your request is taking longer than expected. The Airia pipeline may need optimization."
    except requests.exceptions.RequestException as e:
        print(f"Airia API request error: {str(e)}")
        return "Unable to connect to Airia service. Please check your network or try again later."
    except Exception as e:
        print(f"Unexpected error calling Airia: {str(e)}")
        import traceback
        traceback.print_exc()
        return "An unexpected error occurred. Please try again."

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

