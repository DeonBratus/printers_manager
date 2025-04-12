# server.py
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import json
from urllib.parse import urlparse, parse_qs
import http.client
import socket

class FrontendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Define correct MIME types for our files
        self.extensions_map = {
            **SimpleHTTPRequestHandler.extensions_map,
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '': 'application/octet-stream',
        }
        super().__init__(*args, **kwargs)

    def do_GET(self):
        # Parse the URL
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)
        query_string = parsed_url.query

        # Proxy API requests to the backend
        if path.startswith('/api/') or path in ['/printers/', '/models/', '/printings/', '/dashboard/data', '/reports/']:
            self.proxy_to_backend(path, query_string)
            return

        # Special case for missing logo
        if path == '/images/logo.png':
            self.send_response(200)
            self.send_header('Content-type', 'image/png')
            self.end_headers()
            # Return an empty PNG (1x1 transparent pixel)
            self.wfile.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
            return

        # Special case for serving favicon.ico directly
        elif path == '/favicon.ico':
            self.send_response(200)
            self.send_header('Content-type', 'image/x-icon')
            self.end_headers()
            # Return a simple 1x1 transparent icon
            self.wfile.write(b'\x00\x00\x01\x00\x01\x00\x01\x01\x00\x00\x01\x00\x18\x00\x30\x00\x00\x00\x16\x00\x00\x00\x28\x00\x00\x00\x01\x00\x00\x00\x02\x00\x00\x00\x01\x00\x18\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\x00\x00\x00\x00\x00')
            return

        # Handle root path - serve index.html
        if path == '/' or path == '':
            self.path = '/templates/index.html'
        else:
            # Handle component requests
            if path.startswith('/templates/components/'):
                # Компоненты обрабатываются напрямую
                self.path = path
            # Properly handle static file paths
            elif path.startswith('/static/'):
                # For compatibility with backend paths
                if path.startswith('/static/js/'):
                    self.path = path.replace('/static/js/', '/js/')
                elif path.startswith('/static/styles/') or path.startswith('/static/css/'):
                    self.path = path.replace('/static/styles/', '/styles/').replace('/static/css/', '/styles/')
                elif path.startswith('/static/images/'):
                    self.path = path.replace('/static/images/', '/images/')
                else:
                    # Remove leading '/static/' and keep the rest
                    self.path = path.replace('/static/', '/')
            elif path.startswith('/js/'):
                self.path = path
            elif path.startswith('/styles/'):
                self.path = path
            elif path.startswith('/images/'):
                self.path = path
            elif path.endswith('.html'):
                # Handle template requests
                if not path.startswith('/templates/'):
                    self.path = f'/templates{path}'
                else:
                    self.path = path
            else:
                # Handle other file paths directly
                self.path = path

        try:
            return SimpleHTTPRequestHandler.do_GET(self)
        except Exception as e:
            print(f"Error serving {self.path}: {e}")
            self.send_error(404, f"File not found: {self.path}")

    def proxy_to_backend(self, path, query_string):
        """Proxies a request to the backend"""
        try:
            # Create a connection to the backend
            backend_host = 'localhost'
            backend_port = 8000
            
            # Construct the full path with query string if present
            if query_string:
                full_path = f"{path}?{query_string}"
            else:
                full_path = path
                
            # Create a connection to the backend
            conn = http.client.HTTPConnection(backend_host, backend_port)
            
            # Forward the request headers
            headers = {k: v for k, v in self.headers.items()}
            
            # Make the request to the backend
            conn.request("GET", full_path, headers=headers)
            
            # Get the response from the backend
            response = conn.getresponse()
            
            # Read the response content
            content = response.read()
            
            # Forward the status code and headers from the backend
            self.send_response(response.status)
            
            # Forward all headers except those which would conflict with our own
            for header, value in response.getheaders():
                if header.lower() not in ('connection', 'keep-alive', 'content-length', 'transfer-encoding'):
                    self.send_header(header, value)
            
            # Add CORS headers to allow cross-origin requests
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            
            self.end_headers()
            
            # Send the content back to the client
            self.wfile.write(content)
            
            # Close the connection to the backend
            conn.close()
            
        except (http.client.HTTPException, socket.error) as e:
            print(f"Error proxying to backend: {str(e)}")
            self.send_error(502, f"Error communicating with backend: {str(e)}")

    def do_POST(self):
        """Handle POST requests by proxying them to the backend"""
        # Parse the URL
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_string = parsed_url.query
        
        # Read the content of the POST request
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            # Create a connection to the backend
            backend_host = 'localhost'
            backend_port = 8000
            
            # Construct the full path with query string if present
            if query_string:
                full_path = f"{path}?{query_string}"
            else:
                full_path = path
                
            # Create a connection to the backend
            conn = http.client.HTTPConnection(backend_host, backend_port)
            
            # Forward the request headers
            headers = {k: v for k, v in self.headers.items()}
            
            # Make the request to the backend
            conn.request("POST", full_path, body=post_data, headers=headers)
            
            # Get the response from the backend
            response = conn.getresponse()
            
            # Read the response content
            content = response.read()
            
            # Forward the status code and headers from the backend
            self.send_response(response.status)
            
            # Forward all headers except those which would conflict with our own
            for header, value in response.getheaders():
                if header.lower() not in ('connection', 'keep-alive', 'content-length', 'transfer-encoding'):
                    self.send_header(header, value)
            
            # Add CORS headers to allow cross-origin requests
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            
            self.end_headers()
            
            # Send the content back to the client
            self.wfile.write(content)
            
            # Close the connection to the backend
            conn.close()
            
        except (http.client.HTTPException, socket.error) as e:
            print(f"Error proxying to backend: {str(e)}")
            self.send_error(502, f"Error communicating with backend: {str(e)}")

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def translate_path(self, path):
        # Remove leading slash if present
        if path.startswith('/'):
            path = path[1:]
            
        # Build full path from the current directory (which should be new_front)
        return os.path.join(os.getcwd(), path)

def run_server(port=3000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, FrontendHandler)
    print(f"Server running at http://localhost:{port}")
    print(f"Serving files from: {os.getcwd()}")
    print(f"Proxying API requests to: http://localhost:3000")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()