import requests
import json
import spacy

# Load the trained SpaCy model
nlp = spacy.load('en_core_web_sm')

class APIAgent:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.apis = {}
        self._fetch_api_schema()
    
    def _fetch_api_schema(self):
        """Fetch API schema from FastAPI's OpenAPI endpoint"""
        try:
            response = requests.get(f"{self.base_url}/openapi.json")
            if response.status_code == 200:
                schema = response.json()
                # Convert OpenAPI paths to our API format
                components = schema.get('components', {})
                schemas = components.get('schemas', {})
                for path, path_info in schema.get('paths', {}).items():
                    # Extract API name from the first meaningful part of the path
                    path_parts = [p for p in path.split('/') if p]
                    api_name = path_parts[0] if path_parts else 'default'
                    
                    for method, operation in path_info.items():
                        if api_name not in self.apis:
                            self.apis[api_name] = {
                                'base_url': self.base_url,
                                'endpoints': {},
                                'parameters': {}
                            }
                        
                        # Extract endpoint information
                        endpoint_name = path_parts[-1] if len(path_parts) > 1 else 'root'
                        self.apis[api_name]['endpoints'][endpoint_name] = {
                            'path': path,
                            'method': method.upper(),
                            'summary': operation.get('summary', ''),
                            'operation_id': operation.get('operationId', '')
                        }
                        # Extract request body parameters from components
                        if 'requestBody' in operation:
                            content = operation['requestBody'].get('content', {})
                            if 'application/json' in content:
                                body_schema = content['application/json'].get('schema', {})
                                if '$ref' in body_schema:
                                    schema_name = body_schema['$ref'].split('/')[-1]
                                    if schema_name in schemas:
                                        properties = schemas[schema_name].get('properties', {})
                                        required_props = schemas[schema_name].get('required', [])
                                        
                                        for prop_name, prop_info in properties.items():
                                            prop_type = prop_info.get('type', 'string')
                                            if 'anyOf' in prop_info:
                                                prop_type = [opt.get('type') for opt in prop_info['anyOf']]
                                            
                                            self.apis[api_name]['parameters'][prop_name] = {
                                                'type': prop_type,
                                                'required': prop_name in required_props,
                                                'format': prop_info.get('format'),
                                                'default': prop_info.get('default')
                                            }
            else:
                print(f"Failed to fetch API schema: Status code {response.status_code}")
        except Exception as e:
            print(f"Error fetching API schema: {str(e)}")

    def decide_api(self, text):
        """Use NLP to determine which API to use based on user text"""
        doc = nlp(text)
        
        # For each entity in the text
        for ent in doc.ents:
            # If it's a known API
            if ent.text.lower() in self.apis:
                return ent.text.lower()
            
        # If no direct match found, try to match with available API tags
        text_lower = text.lower()
        for api_name in self.apis.keys():
            if api_name in text_lower:
                return api_name
                
        return None

    def get_api_details(self, api_name):
        """Get details for a specific API"""
        if api_name in self.apis:
            return self.apis[api_name]
        return None

    def call_api(self, api_name, endpoint, method="GET", payload=None, headers=None):
        """Make an API call to the specified service"""
        if api_name not in self.apis:
            raise ValueError(f"Unknown API: {api_name}")

        api_config = self.apis[api_name]
        
        if endpoint not in api_config['endpoints']:
            raise ValueError(f"Unknown endpoint for {api_name}: {endpoint}")
            
        endpoint_info = api_config['endpoints'][endpoint]
        url = f"{self.base_url}{endpoint_info['path']}"
        
        method = method.lower()
        if method == "post":
            response = requests.post(url, json=payload, headers=headers)
        elif method == "get":
            response = requests.get(url, params=payload, headers=headers)
        elif method == "put":
            response = requests.put(url, json=payload, headers=headers)
        elif method == "delete":
            response = requests.delete(url, json=payload, headers=headers)
        else:
            raise ValueError("Invalid HTTP method.")

        if response.status_code in (200, 201):
            return response.json()
        return None

def main():
    # Initialize with your FastAPI backend URL
    agent = APIAgent("http://localhost:8000")
    # text = "Login to the website using benaka@talktoeve.com as email and benaka@eve as password"
    text = input("Enter text: ")
    api_name = agent.decide_api(text)
    
    if api_name:
        print(f"Selected API: {api_name}")
        api_details = agent.get_api_details(api_name)
        print(f"API Details: {json.dumps(api_details, indent=2)}")
        
        # Extract endpoint and method from API details
        # For demonstration, let's use the first endpoint found
        if api_details and 'endpoints' in api_details:
            endpoint = next(iter(api_details['endpoints']))
            method = api_details['endpoints'][endpoint]['method']
            
            # Extract parameters from text based on API parameters
            payload = {}
            if 'parameters' in api_details:
                print(f"Available API parameters: {api_details['parameters']}")
                # Extract email and password from text (this should be made more robust)
                import re
                # Updated regex patterns to better match the text format
                email_match = re.search(r'using\s+(\S+@\S+)\s+as\s+email', text)
                password_match = re.search(r'and\s+(\S+)\s+as\s+password', text)
                
                if 'email' in api_details['parameters'] and email_match:
                    payload['email'] = email_match.group(1)
                if 'password' in api_details['parameters'] and password_match:
                    payload['password'] = password_match.group(1)
                
                # Add any other parameters that match between API requirements and text
                for param in api_details['parameters']:
                    if param not in payload:  # Only look for params not already found
                        param_match = re.search(fr'(\S+)\s+as\s+{param}', text)
                        if param_match:
                            payload[param] = param_match.group(1)
            
            try:
                print(f"Making API call to endpoint: {endpoint} with method: {method}")
                print(f"Payload: {json.dumps(payload, indent=2)}")
                response = agent.call_api(
                    api_name=api_name,
                    endpoint=endpoint,
                    method=method,
                    payload=payload
                )
                if response:
                    print("API Call Successful!")
                    print(f"Response: {json.dumps(response, indent=2)}")
                else:
                    print("API Call failed or returned no data")
            except Exception as e:
                print(f"Error making API call: {str(e)}")
    else:
        print('Sorry, could not understand what service you needed.')


if __name__ == "__main__":
    main()