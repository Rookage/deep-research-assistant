"""Generate charts and diagrams for research reports.

Usage: python gen_charts.py <chart_config.json> <output_dir>
Reads chart definitions from JSON, outputs PNG/SVG files.

Chart types: bar, line, pie, radar, timeline, flowchart, comparison_table
"""
import json
import sys
import os
import subprocess
import re
import base64
from datetime import datetime


def escape_js(s):
    """Escape string for JS template literal."""
    if not s:
        return ''
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$')


def generate_echarts_chart(chart_config, output_path):
    """Generate a chart using ECharts via Node.js."""
    title = escape_js(chart_config.get('title', 'Chart'))
    chart_type = chart_config.get('type', 'bar')
    categories = chart_config.get('categories', [])
    series = chart_config.get('series', [])
    width = chart_config.get('width', 800)
    height = chart_config.get('height', 500)

    # Build ECharts option
    option = {
        'title': {'text': title, 'left': 'center', 'textStyle': {'fontSize': 16}},
        'tooltip': {},
        'legend': {'bottom': 0},
        'xAxis': {'type': 'category', 'data': categories, 'axisLabel': {'rotate': 30}},
        'yAxis': {'type': 'value'},
        'series': [],
    }

    for s in series:
        s_config = {
            'name': s.get('name', ''),
            'type': chart_type,
            'data': s.get('data', []),
            'itemStyle': {},
        }
        if chart_type == 'line':
            s_config['smooth'] = True
            s_config['lineStyle'] = {'width': 2}
        if chart_type == 'pie':
            option.pop('xAxis', None)
            option.pop('yAxis', None)
            s_config['radius'] = '60%'
            s_config['data'] = [{'name': c, 'value': v} for c, v in zip(categories, s.get('data', []))]
        option['series'].append(s_config)

    option_json = json.dumps(option, ensure_ascii=False)

    # Node.js script to render ECharts to PNG
    node_script = f'''
const echarts = require('echarts');
const { createCanvas } = require('canvas');
const fs = require('fs');

// Set up canvas
const canvas = createCanvas({width}, {height});
const chart = echarts.init(canvas);
chart.setOption({option_json});

// Render and save
const buf = canvas.toBuffer('image/png');
fs.writeFileSync('{output_path.replace(chr(92), chr(47))}', buf);
console.log('Chart saved: {os.path.basename(output_path)}');
chart.dispose();
'''

    # Write script to temp file
    script_path = output_path + '.js'
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(node_script)

    try:
        result = subprocess.run(
            ['node', script_path],
            capture_output=True, text=True, timeout=15,
            env={**os.environ, 'PYTHONIOENCODING': 'utf-8'},
            encoding='utf-8', errors='replace',
        )
        if result.returncode != 0:
            print(f'  [Chart] ECharts failed: {result.stderr[:200]}', file=sys.stderr)
            return None
        os.unlink(script_path)
        return output_path
    except Exception as e:
        print(f'  [Chart] Error: {e}', file=sys.stderr)
        return None


def generate_mermaid_diagram(diagram_code, output_path):
    """Generate a diagram from Mermaid syntax using mermaid-cli."""
    mermaid_path = output_path.replace('.png', '.mmd')
    with open(mermaid_path, 'w', encoding='utf-8') as f:
        f.write(diagram_code)

    try:
        result = subprocess.run(
            ['mmdc', '-i', mermaid_path, '-o', output_path, '-w', '800', '-b', 'white'],
            capture_output=True, text=True, timeout=30,
            env={**os.environ, 'PYTHONIOENCODING': 'utf-8'},
            encoding='utf-8', errors='replace',
        )
        if result.returncode != 0:
            print(f'  [Mermaid] mmdc failed: {result.stderr[:200]}', file=sys.stderr)
            return None
        os.unlink(mermaid_path)
        return output_path
    except FileNotFoundError:
        print('  [Mermaid] mmdc not installed, skipping diagram', file=sys.stderr)
        return None
    except Exception as e:
        print(f'  [Mermaid] Error: {e}', file=sys.stderr)
        return None


def generate_comparison_table(table_config, output_path):
    """Generate a comparison table as SVG."""
    title = escape_js(table_config.get('title', 'Comparison'))
    headers = table_config.get('headers', [])
    rows = table_config.get('rows', [])

    if not headers or not rows:
        return None

    # Build HTML table and convert to SVG
    html = f'''<div style="font-family: SimSun, Microsoft YaHei, Arial, sans-serif; padding: 16px;">
<h3 style="text-align:center; color:#1e293b;">{title}</h3>
<table style="width:100%; border-collapse:collapse; font-size:11pt;">
<thead><tr style="background:#2563eb; color:#fff;">
{''.join(f'<th style="padding:8px 12px; text-align:left; border:1px solid #ddd;">{h}</th>' for h in headers)}
</tr></thead>
<tbody>
{''.join('<tr>' + ''.join(f'<td style="padding:8px 12px; border:1px solid #ddd;">{cell}</td>' for cell in row) + '</tr>' for row in rows)}
</tbody></table></div>'''

    html_path = output_path.replace('.svg', '.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(f'<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>{html}</body></html>')

    # Try to convert to image using node.js (puppeteer or simpler approach)
    return html_path


def generate_all(config_path, output_dir):
    """Generate all charts from config file."""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    os.makedirs(output_dir, exist_ok=True)
    results = []

    charts = config.get('charts', [])
    for i, chart in enumerate(charts):
        chart_type = chart.get('type', 'bar')
        output_name = f'chart_{i+1}_{chart_type}.png'
        output_path = os.path.join(output_dir, output_name)

        print(f'  Generating chart {i+1}/{len(charts)}: {chart.get("title", chart_type)}')

        if chart_type in ('bar', 'line', 'pie', 'radar'):
            result = generate_echarts_chart(chart, output_path)
        elif chart_type == 'flowchart' or chart_type == 'timeline':
            diagram_code = chart.get('mermaid', '')
            result = generate_mermaid_diagram(diagram_code, output_path)
        elif chart_type == 'comparison_table':
            result = generate_comparison_table(chart, output_path.replace('.png', '.svg'))
        else:
            result = None

        if result:
            results.append({
                'title': chart.get('title', ''),
                'type': chart_type,
                'path': result,
            })
        else:
            # Fallback: create a simple text representation
            results.append({
                'title': chart.get('title', ''),
                'type': chart_type,
                'path': None,
                'error': 'Chart generation not available',
            })

    return results


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python gen_charts.py <chart_config.json> <output_dir>")
        print("Config format:")
        print(json.dumps({
            "charts": [
                {
                    "type": "bar",
                    "title": "Market Share by Brand",
                    "categories": ["BYD", "NIO", "XPeng", "Others"],
                    "series": [{"name": "2025", "data": [22, 18, 15, 45]}]
                },
                {
                    "type": "flowchart",
                    "title": "Research Process",
                    "mermaid": "graph LR\n  A[Start] --> B[Search]\n  B --> C[Verify]"
                }
            ]
        }, indent=2, ensure_ascii=False))
        sys.exit(1)

    config_path = sys.argv[1]
    output_dir = sys.argv[2]
    results = generate_all(config_path, output_dir)
    print(json.dumps(results, ensure_ascii=False))
