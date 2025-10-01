#!/usr/bin/env python3
"""
Simple web server to view Nginx access logs and track visitor sources 
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import re
from datetime import datetime
from collections import Counter, defaultdict
from urllib.parse import parse_qs, urlparse
import os

class LogAnalyzer:
    def __init__(self, log_file='/var/log/nginx/access.log', sources_file='/var/www/omartaha.ca/html/sources.txt'):
        self.log_file = log_file
        self.sources_file = sources_file
        
    def parse_nginx_log_line(self, line):
        """Parse a single Nginx log line"""
        # Nginx log format: IP - - [timestamp] "METHOD PATH HTTP/1.1" status bytes "referrer" "user-agent"
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
    
    def get_sources(self):
        """Get tracked sources from custom tracking"""
        sources = defaultdict(int)
        try:
            if os.path.exists(self.sources_file):
                with open(self.sources_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            try:
                                data = json.loads(line)
                                source = data.get('source', 'direct')
                                sources[source] += 1
                            except json.JSONDecodeError:
                                pass
        except FileNotFoundError:
            pass
        
        return dict(sources)
    
    def log_source(self, ip, source, referrer, user_agent):
        """Log a visitor source"""
        try:
            os.makedirs(os.path.dirname(self.sources_file), exist_ok=True)
            with open(self.sources_file, 'a') as f:
                data = {
                    'timestamp': datetime.now().isoformat(),
                    'ip': ip,
                    'source': source,
                    'referrer': referrer,
                    'user_agent': user_agent
                }
                f.write(json.dumps(data) + '\n')
        except Exception as e:
            print(f"Error logging source: {e}")

class LogViewerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        analyzer = LogAnalyzer()
        
        if self.path == '/' or self.path.startswith('/?'):
            # Serve the dashboard
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            html = self.get_dashboard_html()
            self.wfile.write(html.encode())
            
        elif self.path == '/api/stats':
            # API endpoint for stats
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            stats = analyzer.get_stats()
            sources = analyzer.get_sources()
            stats['sources'] = sources
            
            self.wfile.write(json.dumps(stats).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/track':
            # Track visitor source
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode())
                analyzer = LogAnalyzer()
                analyzer.log_source(
                    self.client_address[0],
                    data.get('source', 'direct'),
                    data.get('referrer', ''),
                    data.get('user_agent', '')
                )
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def get_dashboard_html(self):
        """Generate the dashboard HTML"""
        return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>omartaha.ca - Analytics Dashboard</title>
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
        
        .source-tag {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            background: #667eea;
            color: white;
            font-size: 0.85em;
            font-weight: 500;
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
        
        .chart-container {
            margin: 20px 0;
        }
        
        .bar {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            height: 30px;
            margin: 10px 0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            color: white;
            font-weight: 500;
            transition: width 0.5s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Analytics Dashboard</h1>
            <p>omartaha.ca Traffic Insights</p>
            <button class="refresh-btn" onclick="loadStats()">🔄 Refresh Data</button>
        </header>
        
        <div id="content">
            <div class="loading">Loading analytics...</div>
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
            const maxCount = data.top_ips.length > 0 ? data.top_ips[0][1] : 1;
            
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
            
            // Sources section
            if (data.sources && Object.keys(data.sources).length > 0) {
                html += `
                    <div class="section">
                        <h2>🎯 Traffic Sources</h2>
                        <div class="chart-container">
                `;
                
                const sortedSources = Object.entries(data.sources).sort((a, b) => b[1] - a[1]);
                const maxSourceCount = sortedSources[0][1];
                
                sortedSources.forEach(([source, count]) => {
                    const width = (count / maxSourceCount) * 100;
                    html += `
                        <div class="bar" style="width: ${width}%">
                            ${source}: ${count} visits
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
            
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
    server = HTTPServer(('0.0.0.0', port), LogViewerHandler)
    print(f'📊 Analytics Dashboard running at http://localhost:{port}')
    print(f'🔒 Make sure to secure this with authentication in production!')
    print(f'Press Ctrl+C to stop')
    server.serve_forever()

if __name__ == '__main__':
    run_server()
