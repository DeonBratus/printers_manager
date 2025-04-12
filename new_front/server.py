# server.py
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import json
from urllib.parse import urlparse, parse_qs
import http.client
import socket
from datetime import datetime
import random

# Мок-данные для локального тестирования
MOCK_DATA = {
    'printers': [
        {'id': 1, 'name': 'Printer 1', 'status': 'idle', 'total_print_time': 120.5, 'total_downtime': 10.2},
        {'id': 2, 'name': 'Printer 2', 'status': 'printing', 'total_print_time': 85.3, 'total_downtime': 5.1},
        {'id': 3, 'name': 'Printer 3', 'status': 'waiting', 'total_print_time': 200.1, 'total_downtime': 15.8}
    ],
    'models': [
        {'id': 1, 'name': 'Model A', 'printing_time': 2.5},
        {'id': 2, 'name': 'Model B', 'printing_time': 4.2},
        {'id': 3, 'name': 'Model C', 'printing_time': 1.8}
    ],
    'printings': [
        {
            'id': 1, 
            'printer_id': 1, 
            'printer_name': 'Printer 1',
            'model_id': 1, 
            'model_name': 'Model A',
            'start_time': '2025-04-10T10:00:00', 
            'real_time_start': '2025-04-10T10:05:00',
            'real_time_stop': '2025-04-10T12:35:00',
            'status': 'completed',
            'printing_time': 2.5
        },
        {
            'id': 2, 
            'printer_id': 2, 
            'printer_name': 'Printer 2',
            'model_id': 2, 
            'model_name': 'Model B',
            'start_time': '2025-04-11T09:00:00', 
            'real_time_start': '2025-04-11T09:10:00',
            'real_time_stop': None,
            'status': 'printing',
            'printing_time': 4.2
        },
        {
            'id': 3, 
            'printer_id': 3, 
            'printer_name': 'Printer 3',
            'model_id': 3, 
            'model_name': 'Model C',
            'start_time': '2025-04-12T11:00:00', 
            'real_time_start': None,
            'real_time_stop': None,
            'status': 'waiting',
            'printing_time': 1.8
        }
    ]
}

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

        # Обработка мок-API
        if path.startswith('/api/') or path.startswith('/printers/') or path.startswith('/models/') or path.startswith('/printings/') or path in ['/printers/', '/models/', '/printings/', '/dashboard/data', '/reports/']:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Handling API request: {path}")
            
            # Использование локального мок-API вместо прокси
            if self.serve_mock_api(path):
                return
            
            # Если для этого пути нет мока, пробуем через прокси
            print(f"[{datetime.now().strftime('%H:%M:%S')}] No mock handler for {path}, trying proxy...")
            
            # Первая попытка - прямой путь
            result = self.proxy_to_backend(path, query_string)
            
            # Если получили 404, попробуем другие варианты путей
            if result == 404 and not path.startswith('/api/'):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Trying alternative API path with /api prefix")
                result = self.proxy_to_backend('/api' + path, query_string)
                
            # Если все еще 404, попробуем вариант без слэша в конце
            if result == 404 and path.endswith('/'):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Trying path without trailing slash")
                result = self.proxy_to_backend(path[:-1], query_string)
                
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
            backend_host = 'cabinet.xtunnel.ru'
            backend_port = 443
            use_https = True
            
            # Убираем префикс /api - попробуем прямые пути
            api_prefix = ''
            
            # Construct the full path with query string if present
            if query_string:
                full_path = f"{api_prefix}{path}?{query_string}"
            else:
                full_path = f"{api_prefix}{path}"
                
            # Create a connection to the backend
            if use_https:
                conn = http.client.HTTPSConnection(backend_host, backend_port)
            else:
                conn = http.client.HTTPConnection(backend_host, backend_port)
            
            # Forward the request headers
            headers = {k: v for k, v in self.headers.items()}
            
            # Set important headers that might be required by the backend
            headers['Host'] = backend_host
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            headers['Origin'] = f'https://{backend_host}'
            headers['Referer'] = f'https://{backend_host}/'
            
            # Make the request to the backend
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Proxying {self.command} to {backend_host}:{backend_port}{full_path}")
            conn.request(self.command, full_path, None, headers)
            
            # Get the response from the backend
            response = conn.getresponse()
            
            # Read the response content
            content = response.read()
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Backend responded with status: {response.status} for {full_path}")
            if len(content) < 1000:
                try:
                    decoded = content.decode('utf-8')
                    if decoded.strip():
                        print(f"Response content: {decoded[:200]}")
                except:
                    pass
                    
            # Forward the status code and headers from the backend
            self.send_response(response.status)
            
            # Forward all headers except those which would conflict with our own
            for header, value in response.getheaders():
                if header.lower() not in ('connection', 'keep-alive', 'content-length', 'transfer-encoding'):
                    self.send_header(header, value)
            
            # Add CORS headers to allow cross-origin requests
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Max-Age', '86400')
            
            self.end_headers()
            
            # Send the content back to the client
            self.wfile.write(content)
            
            # Close the connection to the backend
            conn.close()
            
            return response.status
            
        except (http.client.HTTPException, socket.error) as e:
            try:
                error_msg = str(e).encode('ascii', 'replace').decode('ascii')
                print(f"Error proxying to backend: {error_msg}")
                self.send_error(502, f"Error communicating with backend")
            except Exception as ex:
                print(f"Error handling proxy exception: {ex}")
                self.send_error(500, "Internal server error")
            return 404

    def do_POST(self):
        """Handle POST requests by proxying them to the backend"""
        # Parse the URL
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_string = parsed_url.query
        
        # Log the POST request for debugging
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Received POST request to {path}")
        
        # Проверяем, является ли это API-запросом
        if path.startswith('/api/') or path.startswith('/printers/') or path.startswith('/models/') or path.startswith('/printings/') or path in ['/printers/', '/models/', '/printings/', '/dashboard/data', '/reports/']:
            # Получаем данные запроса
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Пробуем обработать через мок-API
            if self.serve_mock_post_api(path, post_data):
                return
                
            # Если для этого пути нет мока, пробуем через прокси
            print(f"[{datetime.now().strftime('%H:%M:%S')}] No mock POST handler for {path}, trying proxy...")
            
            # Первая попытка - прямой путь
            result = self.proxy_post_to_backend(path, query_string, post_data)
            
            # Если получили 404, попробуем другие варианты путей
            if result == 404 and not path.startswith('/api/'):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Trying alternative API path with /api prefix")
                result = self.proxy_post_to_backend('/api' + path, query_string, post_data)
                
            # Если все еще 404, попробуем вариант без слэша в конце
            if result == 404 and path.endswith('/'):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Trying path without trailing slash")
                result = self.proxy_post_to_backend(path[:-1], query_string, post_data)
            
            return
        else:
            # Для не-API запросов обрабатываем стандартным образом
            return super().do_POST()
            
    def proxy_post_to_backend(self, path, query_string, post_data):
        """Proxies a POST request to the backend"""
        try:
            # Create a connection to the backend
            backend_host = 'cabinet.xtunnel.ru'
            backend_port = 443
            use_https = True
            
            # Убираем префикс /api
            api_prefix = ''
            
            # Construct the full path with query string if present
            if query_string:
                full_path = f"{api_prefix}{path}?{query_string}"
            else:
                full_path = f"{api_prefix}{path}"
                
            # Create a connection to the backend
            if use_https:
                conn = http.client.HTTPSConnection(backend_host, backend_port)
            else:
                conn = http.client.HTTPConnection(backend_host, backend_port)
            
            # Forward the request headers
            headers = {k: v for k, v in self.headers.items()}
            
            # Set important headers that might be required by the backend
            headers['Host'] = backend_host
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            headers['Origin'] = f'https://{backend_host}'
            headers['Referer'] = f'https://{backend_host}/'
            
            if 'content-length' in headers:
                headers['Content-Length'] = str(len(post_data))
            
            # Make the request to the backend
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Proxying POST request to {backend_host}:{backend_port}{full_path}")
            conn.request("POST", full_path, post_data, headers)
            
            # Get the response from the backend
            response = conn.getresponse()
            
            # Read the response content
            content = response.read()
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Backend responded with status: {response.status} for POST {full_path}")
            if len(content) < 1000:
                try:
                    decoded = content.decode('utf-8')
                    if decoded.strip():
                        print(f"Response content: {decoded[:200]}")
                except:
                    pass
            
            # Forward the status code and headers from the backend
            self.send_response(response.status)
            
            # Forward all headers except those which would conflict with our own
            for header, value in response.getheaders():
                if header.lower() not in ('connection', 'keep-alive', 'content-length', 'transfer-encoding'):
                    self.send_header(header, value)
            
            # Add CORS headers to allow cross-origin requests
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Max-Age', '86400')
            
            self.end_headers()
            
            # Send the content back to the client
            self.wfile.write(content)
            
            # Close the connection to the backend
            conn.close()
            
            return response.status
            
        except (http.client.HTTPException, socket.error) as e:
            try:
                error_msg = str(e).encode('ascii', 'replace').decode('ascii')
                print(f"Error proxying to backend: {error_msg}")
                self.send_error(502, f"Error communicating with backend")
            except Exception as ex:
                print(f"Error handling proxy exception: {ex}")
                self.send_error(500, "Internal server error")
            return 404

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_DELETE(self):
        """Обработка DELETE запросов"""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Received DELETE request to {path}")
        
        # Проверяем, является ли это API-запросом
        if path.startswith('/api/') or path.startswith('/printers/') or path.startswith('/models/') or path.startswith('/printings/'):
            # Пробуем обработать через мок-API
            if self.serve_mock_delete_api(path):
                return
                
            # Если мока нет, пробуем прокси
            print(f"[{datetime.now().strftime('%H:%M:%S')}] No mock DELETE handler for {path}, trying proxy...")
            
            # Тут можно добавить проксирование DELETE запросов на бэкенд
            # Пока просто возвращаем ошибку
            self.send_error(501, "DELETE not implemented for proxy")
            return
        else:
            self.send_error(405, "Method not allowed")
            
    def serve_mock_delete_api(self, path):
        """Обрабатывает DELETE запросы к мок-API"""
        try:
            # Проверяем путь на паттерн /resource/{id}
            parts = path.strip('/').split('/')
            if len(parts) != 2:
                return False
                
            resource, resource_id = parts
            try:
                resource_id = int(resource_id)
            except ValueError:
                return False
                
            # Обработка удаления принтеров
            if resource == 'printers':
                MOCK_DATA['printers'] = [p for p in MOCK_DATA['printers'] if p['id'] != resource_id]
                self.send_response(204)  # No Content
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Processed mock DELETE for printer {resource_id}")
                return True
                
            # Обработка удаления моделей
            elif resource == 'models':
                MOCK_DATA['models'] = [m for m in MOCK_DATA['models'] if m['id'] != resource_id]
                self.send_response(204)  # No Content
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Processed mock DELETE for model {resource_id}")
                return True
                
            # Обработка удаления заданий печати
            elif resource == 'printings':
                MOCK_DATA['printings'] = [p for p in MOCK_DATA['printings'] if p['id'] != resource_id]
                self.send_response(204)  # No Content
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Processed mock DELETE for printing {resource_id}")
                return True
                
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Error processing mock DELETE: {e}")
            
        return False

    def translate_path(self, path):
        # Remove leading slash if present
        if path.startswith('/'):
            path = path[1:]
            
        # Build full path from the current directory (which should be new_front)
        return os.path.join(os.getcwd(), path)

    def serve_mock_api(self, path):
        """Serve mock API data for local development"""
        # Обработка запросов к принтерам
        if path == '/printers/' or path == '/printers':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(MOCK_DATA['printers']).encode())
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Served mock data for {path}")
            return True
            
        # Обработка запросов к моделям
        elif path == '/models/' or path == '/models':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(MOCK_DATA['models']).encode())
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Served mock data for {path}")
            return True
            
        # Обработка запросов к истории печати
        elif path == '/printings/' or path == '/printings':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(MOCK_DATA['printings']).encode())
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Served mock data for {path}")
            return True
            
        # Обработка запросов для dashboard
        elif path == '/dashboard/data':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            dashboard_data = {
                'printers_status': {
                    'idle': 1,
                    'printing': 1,
                    'waiting': 1,
                    'error': 0
                },
                'today_completions': 2,
                'active_printings': 2
            }
            self.wfile.write(json.dumps(dashboard_data).encode())
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Served mock data for {path}")
            return True
            
        # Обработка запросов к отчетам
        elif path == '/reports/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            reports_data = {
                'efficiency': random.uniform(75, 95),
                'total_print_time': random.uniform(500, 1000),
                'total_prints': random.randint(50, 200),
                'monthly_stats': [
                    {'month': 'Январь', 'prints': random.randint(10, 30)},
                    {'month': 'Февраль', 'prints': random.randint(10, 30)},
                    {'month': 'Март', 'prints': random.randint(10, 30)},
                    {'month': 'Апрель', 'prints': random.randint(10, 30)}
                ]
            }
            self.wfile.write(json.dumps(reports_data).encode())
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Served mock data for {path}")
            return True
            
        # Если нет обработчика для этого пути
        return False

    def serve_mock_post_api(self, path, post_data):
        """Обрабатывает POST запросы к мок-API"""
        try:
            # Пытаемся декодировать JSON данные
            data = json.loads(post_data.decode('utf-8'))
            print(f"[{datetime.now().strftime('%H:%M:%S')}] POST data: {data}")
            
            # Эмуляция создания/обновления принтеров
            if path == '/printers/' or path == '/printers':
                if 'id' in data:
                    # Обновление существующего
                    for i, printer in enumerate(MOCK_DATA['printers']):
                        if printer['id'] == data['id']:
                            MOCK_DATA['printers'][i] = data
                            break
                else:
                    # Создание нового
                    new_id = max([p['id'] for p in MOCK_DATA['printers']]) + 1
                    data['id'] = new_id
                    MOCK_DATA['printers'].append(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Processed mock POST for {path}")
                return True
                
            # Эмуляция создания/обновления моделей
            elif path == '/models/' or path == '/models':
                if 'id' in data:
                    # Обновление существующего
                    for i, model in enumerate(MOCK_DATA['models']):
                        if model['id'] == data['id']:
                            MOCK_DATA['models'][i] = data
                            break
                else:
                    # Создание нового
                    new_id = max([m['id'] for m in MOCK_DATA['models']]) + 1
                    data['id'] = new_id
                    MOCK_DATA['models'].append(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Processed mock POST for {path}")
                return True
                
            # Эмуляция создания/обновления заданий печати
            elif path == '/printings/' or path == '/printings':
                if 'id' in data:
                    # Обновление существующего
                    for i, printing in enumerate(MOCK_DATA['printings']):
                        if printing['id'] == data['id']:
                            MOCK_DATA['printings'][i] = data
                            break
                else:
                    # Создание нового
                    new_id = max([p['id'] for p in MOCK_DATA['printings']]) + 1
                    data['id'] = new_id
                    MOCK_DATA['printings'].append(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Processed mock POST for {path}")
                return True
                
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Error processing mock POST: {e}")
        
        return False

def run_server(port=3000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, FrontendHandler)
    print(f"Server running at http://localhost:{port}")
    print(f"Serving files from: {os.getcwd()}")
    print(f"Using mock API for development. API requests will return test data.")
    print(f"Fallback proxy to: https://cabinet.xtunnel.ru (currently not working)")
    print(f"IMPORTANT: Make sure to access the app via http://localhost:{port} to use the proxy server")
    httpd.serve_forever()

if __name__ == '__main__':
    import sys
    port = 80  # Используем порт 80 по умолчанию
    try:
        if len(sys.argv) > 1:
            port = int(sys.argv[1])
        run_server(port)
    except Exception as e:
        print(f"Error starting server: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")