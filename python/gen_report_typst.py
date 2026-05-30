"""Generate professional PDF report from JSON using Typst.

Usage: python gen_report_typst.py <report.json> <output.pdf>
"""
import json
import sys
import os
import subprocess
import re
from datetime import datetime


def load_template(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def escape_typst(text):
    """Escape special Typst characters."""
    if not text:
        return ''
    text = text.replace('\\', '\\\\')
    for ch in ['<', '>', '#', '$', '@', '~', '_', '*']:
        text = text.replace(ch, '\\' + ch)
    return text

def safe_text(text):
    """Make text safe for Typst by removing problematic sequences."""
    if not text:
        return ''
    # Remove any remaining HTML/XML tags
    text = re.sub(r'<[^>]*>', '', text)
    # Remove leading/trailing whitespace
    text = text.strip()
    # Escape Typst special chars
    text = escape_typst(text)
    # Replace Typst label syntax leftovers
    text = text.replace('\\\\<', '\\<')
    return text


def html_to_plain_text(html):
    """Convert HTML to safe plain text for Typst."""
    if not html:
        return ''
    text = html
    # Replace block-level tags with newlines
    text = re.sub(r'</?(?:p|div|h[1-6]|li|tr|br)[^>]*?>', '\n', text, flags=re.I)
    # Strip remaining tags
    text = re.sub(r'<[^>]*>', '', text)
    # Decode entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ').replace('&quot;', '"')
    # Collapse whitespace
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    # Escape Typst special characters
    text = escape_typst(text)
    return text.strip()


def build_sections(sections_data):
    """Build Typst content for all sections."""
    result = []
    for section in sections_data:
        title = section.get('title', 'Untitled')
        content = html_to_plain_text(section.get('content', ''))

        # Add section heading and content
        result.append(f'= {title}')
        result.append('')
        result.append(content)
        result.append('')

        # Add citation note if available
        citations = section.get('citations', [])
        if citations:
            cites_str = ', '.join(str(c) for c in citations)
            result.append(f'#text(size: 9pt, fill: rgb("#888888"), style: "italic")[本节引用来源: [{cites_str}]]')
            result.append('')

    return '\n'.join(result)


def build_references(refs):
    """Build the references section."""
    if not refs:
        return '#text(fill: rgb("#888888"))[暂无参考文献]'

    lines = []
    for ref in refs:
        idx = ref.get('index', '?')
        title = escape_typst(ref.get('title', 'Untitled'))
        url = ref.get('url', '')
        credibility = ref.get('credibility', 'B')
        freshness = ref.get('freshness', '')
        freshness_label = {
            'green': '有效',
            'yellow': '偏旧',
            'red': '过时',
        }.get(freshness, '')

        badges = []
        badges.append(f'(信源{credibility}级)')
        if freshness_label:
            badges.append(f'({freshness_label})')

        line = f'+ [{idx}] {title}'
        if badges:
            line += f'  #text(size: 9pt, fill: rgb("#888888"))[{" · ".join(badges)}]'
        if url:
            line += f'\n  #text(size: 8pt, fill: rgb("#2563eb"))[#link("{url}")]'

        lines.append(line)

    return '\n\n'.join(lines)


def generate(report_json_path, output_path, template_path=None):
    """Generate a professional PDF report using Typst."""
    # Load report data
    with open(report_json_path, 'r', encoding='utf-8') as f:
        report = json.load(f)

    # Load template
    if template_path is None:
        template_path = os.path.join(os.path.dirname(__file__), 'report_template.typ')
    template = load_template(template_path)

    # Build template variables
    meta = report.get('meta', {})
    sections = report.get('sections', [])
    refs = report.get('references', [])

    # Render sections
    sections_typst = build_sections(sections)

    # Render references
    references_typst = build_references(refs)

    # Fill template
    verified = str(meta.get('verifiedClaims', ''))
    single_source = str(meta.get('singleSourceClaims', ''))
    disputed = str(meta.get('disputedClaims', ''))

    typst_content = template\
        .replace('{{TITLE}}', escape_typst(report.get('title', '研究报告')))\
        .replace('{{TYPE}}', escape_typst(report.get('type', '深度报告')))\
        .replace('{{DATE}}', (meta.get('generatedAt', '') or datetime.now().isoformat())[:10])\
        .replace('{{SOURCES}}', str(meta.get('sourceCount', '')))\
        .replace('{{CITED}}', str(meta.get('citedCount', '')))\
        .replace('{{VERIFIED}}', verified)\
        .replace('{{SINGLE_SOURCE}}', single_source)\
        .replace('{{DISPUTED}}', disputed)\
        .replace('{{SECTIONS}}', sections_typst)\
        .replace('{{REFERENCES}}', references_typst)

    # Write Typst file
    typst_path = output_path.replace('.pdf', '.typ')
    with open(typst_path, 'w', encoding='utf-8') as f:
        f.write(typst_content)

    # Compile to PDF
    import subprocess as sp
    result = sp.run(
        ['typst', 'compile', typst_path, output_path],
        capture_output=True, timeout=30,
        env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'PYTHONUTF8': '1'},
    )

    if result.returncode != 0:
        stderr_str = result.stderr.decode('utf-8', errors='replace') if result.stderr else '(no output)'
        raise RuntimeError(f'Typst compilation failed (exit {result.returncode}):\n{stderr_str[:500]}')

    return output_path


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python gen_report_typst.py <report.json> <output.pdf>")
        sys.exit(1)

    report_json = sys.argv[1]
    output_pdf = sys.argv[2]

    try:
        result = generate(report_json, output_pdf)
        print(f"PDF saved: {result}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
