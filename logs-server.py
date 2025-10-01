#!/usr/bin/env python3
"""
Simple web server to view Nginx access logs in a friendly interface
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import re
from collections import Counter

class LogAnalyzer:
    def __init__(self, log_file='/var/log/nginx/access.log'):
        self.log_file = log_file
        
    def parse_nginx_log_line(self, line):
        """Parse a single Nginx log line"""
        pattern = r'(\S+) - - \[(.*?)\] "(.*?)" (\d+) (\d+) "(.*?)" "(.*?)"'
        match = re.match(pattern, line)
        
        if match:
            ip, timestamp, request, status, bytes_sent, referrer, user_agent = match.groups()
            method, path, protocol = request.split() if len(request.split()) == 3 else ('', '', '')
            
            return {
                'ip': ip,
                'timestamp': timestamp,
                'method': method,
                'path': path,
                'status': int(status),
                'bytes': int(bytes_sent),
                'referrer': referrer,
                'user_agent': user_agent
            }
        return None
    
    def get_recent_logs(self, limit=100):
        """Get recent log entries"""
        logs = []
        try:
            with open(self.log_file, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines[-limit:]):
                    parsed = self.parse_nginx_log_line(line.strip())
                    if parsed:
                        logs.append(parsed)
        except FileNotFoundError:
            pass
        return logs
    
    def get_stats(self):
        """Generate statistics from logs"""
        logs = self.get_recent_logs(1000)
        
        if not logs:
            return {
                'total_requests': 0,
                'unique_ips': 0,
                'top_ips': [],
                'top_pages': [],
                'recent_visitors': []
            }
        
        ips = [log['ip'] for log in logs]
        paths = [log['path'] for log in logs if not log['path'].endswith(('.ico', '.png', '.jpg', '.css', '.js'))]
        
        ip_counts = Counter(ips)
        page_counts = Counter(paths)
        
        return {
            'total_requests': len(logs),
            'unique_ips': len(set(ips)),
            'top_ips': ip_counts.most_common(10),
            'top_pages': page_counts.most_common(10),
            'recent_visitors': logs[:20]
        }

class LogViewerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        analyzer = LogAnalyzer()
        
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            html = self.get_dashboard_html()
            self.wfile.write(html.encode())
            
        elif self.path == '/api/stats':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            stats = analyzer.get_stats()
            self.wfile.write(json.dumps(stats).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def get_dashboard_html(self):
        """Generate the dashboard HTML"""
        return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nginx Logs Viewer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 12px rgba(0,0,0,0.15);
        }
        
        .stat-card h3 {
            color: #667eea;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .stat-card .number {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
        }
        
        .section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #667eea;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .ip-address {
            font-family: 'Courier New', monospace;
            color: #764ba2;
            font-weight: 500;
        }
        
        .timestamp {
            color: #888;
            font-size: 0.9em;
        }
        
        .refresh-btn {
            background: white;
            color: #667eea;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s;
        }
        
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: white;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Nginx Logs Viewer</h1>
            <p>omartaha.ca Traffic Insights</p>
            <button class="refresh-btn" onclick="loadStats()">🔄 Refresh</button>
        </header>
        
        <div id="content">
            <div class="loading">Loading logs...</div>
        </div>
    </div>
    
    <script>
        function loadStats() {
            fetch('/api/stats')
                .then(response => response.json())
                .then(data => {
                    displayStats(data);
                })
                .catch(error => {
                    console.error('Error loading stats:', error);
                    document.getElementById('content').innerHTML = 
                        '<div class="loading">Error loading data. Please try again.</div>';
                });
        }
        
        function displayStats(data) {
            let html = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Requests</h3>
                        <div class="number">${data.total_requests.toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Unique Visitors</h3>
                        <div class="number">${data.unique_ips.toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Top Pages</h3>
                        <div class="number">${data.top_pages.length}</div>
                    </div>
                </div>
            `;
            
            // Top IPs
            html += `
                <div class="section">
                    <h2>👥 Top Visitors by IP</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>IP Address</th>
                                <th>Visits</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.top_ips.forEach(([ip, count], index) => {
                const percentage = ((count / data.total_requests) * 100).toFixed(1);
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="ip-address">${ip}</td>
                        <td>${count}</td>
                        <td>${percentage}%</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            // Top Pages
            html += `
                <div class="section">
                    <h2>📄 Most Visited Pages</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Page</th>
                                <th>Visits</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.top_pages.forEach(([page, count]) => {
                html += `
                    <tr>
                        <td>${page}</td>
                        <td>${count}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            // Recent visitors
            html += `
                <div class="section">
                    <h2>🕐 Recent Visitors</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>IP</th>
                                <th>Page</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.recent_visitors.forEach(visitor => {
                html += `
                    <tr>
                        <td class="timestamp">${visitor.timestamp}</td>
                        <td class="ip-address">${visitor.ip}</td>
                        <td>${visitor.path}</td>
                        <td>${visitor.status}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            document.getElementById('content').innerHTML = html;
        }
        
        // Auto-refresh every 30 seconds
        setInterval(loadStats, 30000);
        
        // Initial load
        loadStats();
    </script>
</body>
</html>'''

def run_server(port=9000):
    server = HTTPServer(('127.0.0.1', port), LogViewerHandler)
    print(f'📊 Nginx Logs Viewer running at http://localhost:{port}')
    print(f'Press Ctrl+C to stop')
    server.serve_forever()

if __name__ == '__main__':
    run_server()
