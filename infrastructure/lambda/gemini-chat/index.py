import json
import os
import requests

# SECURITY: Never commit real credentials! Set as environment variable
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

def handler(event, context):
    """Simple Gemini chat handler"""
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {})
    
    try:
        body = json.loads(event.get('body', '{}'))
        message = body.get('message', '')
        
        if not message:
            return create_response(400, {'error': 'Message is required'})
        
        print(f"Gemini chat request: {message}")
        
        # Call Gemini API
        response = call_gemini(message)
        
        return create_response(200, {
            'response': response
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': str(e), 'response': 'Sorry, I encountered an error. Please try again.'})

def call_gemini(message):
    """Call Gemini API"""
    try:
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": message
                }]
            }]
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            # Extract text from Gemini response
            if 'candidates' in data and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    parts = candidate['content']['parts']
                    if len(parts) > 0 and 'text' in parts[0]:
                        return parts[0]['text']
            
            return "I received your message but couldn't generate a proper response."
        else:
            print(f"Gemini API error: {response.status_code} - {response.text}")
            return "I'm having trouble connecting to the AI service. Please try again."
            
    except Exception as e:
        print(f"Error calling Gemini: {str(e)}")
        return "I encountered an error while processing your request. Please try again."

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

