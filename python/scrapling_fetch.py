"""Fetch and extract clean content from URLs.
Uses httpx (browser-like TLS) + lxml (fast parsing).

Usage: python scrapling_fetch.py <url>
Returns JSON with title, text, domain, published date.
"""
import sys
import json
import re
from urllib.parse import urlparse

# Force UTF-8 output (Windows console uses GBK by default)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

from lxml import html as lxml_html


def extract_date(html_str):
    """Try to find publish date from metadata or common patterns."""
    patterns = [
        r'"datePublished"[":\s]*["\'](\d{4}-\d{2}-\d{2})',
        r'"article:published_time"[^>]*content="([^"]*)',
        r'<time[^>]*datetime="([^"]*)',
        r'"pubdate"[":\s]*["\']([^"]*)',
        r'<meta[^>]*name="[^"]*date[^"]*"[^>]*content="([^"]*)',
        r'<span[^>]*class="[^"]*date[^"]*"[^>]*>(\d{4}-\d{2}-\d{2})',
    ]
    for p in patterns:
        m = re.search(p, html_str, re.I)
        if m:
            val = m.group(1)[:10]
            if val and val[0] in '12':  # reasonable year
                return val
    return None


def clean_text(node):
    """Extract clean text from lxml node, removing scripts/styles."""
    # Remove script, style, nav, footer
    for tag in node.xpath('//script|//style|//nav|//footer|//iframe|//noscript'):
        tag.getparent().remove(tag)

    text = node.text_content()
    text = re.sub(r'\n\s*\n', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def fetch_content(url):
    """Fetch URL and extract structured content."""
    result = {
        'url': url,
        'title': '',
        'text': '',
        'domain': '',
        'published_at': None,
        'error': None,
    }

    try:
        parsed = urlparse(url)
        result['domain'] = parsed.netloc.replace('www.', '')

        # Fetch with browser-like headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
        }

        if HAS_HTTPX:
            with httpx.Client(timeout=15, follow_redirects=True) as client:
                resp = client.get(url, headers=headers)
                html_str = resp.text
        else:
            import urllib.request
            req = urllib.request.Request(url, headers=headers)
            resp = urllib.request.urlopen(req, timeout=10)
            html_str = resp.read().decode('utf-8', errors='ignore')

        # Parse with lxml
        doc = lxml_html.fromstring(html_str)

        # Extract title
        title_els = doc.xpath('//title/text()')
        if title_els:
            result['title'] = title_els[0].strip()
        else:
            h1_els = doc.xpath('//h1//text()')
            if h1_els:
                result['title'] = ''.join(h1_els).strip()[:200]

        # Extract main content text
        body = doc.xpath('//body')
        if body:
            text = clean_text(body[0])
            result['text'] = text[:8000]
        else:
            result['text'] = clean_text(doc)[:8000]

        # Date extraction
        result['published_at'] = extract_date(html_str)

    except Exception as e:
        result['error'] = str(e)[:300]
        # Last resort fallback
        try:
            import urllib.request
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            resp = urllib.request.urlopen(req, timeout=10)
            html_str = resp.read().decode('utf-8', errors='ignore')
            text = re.sub(r'<[^>]*>', ' ', html_str)
            text = re.sub(r'\s+', ' ', text)
            result['text'] = text[:4000]
        except Exception:
            pass

    return result


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: python scrapling_fetch.py <url>'}))
        sys.exit(1)

    url = sys.argv[1]
    result = fetch_content(url)
    print(json.dumps(result, ensure_ascii=False))
