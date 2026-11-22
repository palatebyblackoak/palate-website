"""Build the Spanish homepage (es/index.html) from index.html + tools/es.json.

Run after any change to index.html:   python3 tools/build_es.py
Strings with no translation stay in English and are listed at the end, so new copy
can be added to tools/es.json. Client review quotes are left in the clients' own words.
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.palatemarketing.com/"
src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
es = json.load(open(os.path.join(ROOT, "tools", "es.json"), encoding="utf-8"))
missing = []

def norm(t):
    return " ".join(html.unescape(t).split())

def esc_text(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def tr(t, record=True):
    key = norm(t)
    if key in es:
        return es[key]
    if record and any(c.isalpha() for c in key) and key not in missing:
        missing.append(key)
    return None

# 1. split into script/style blocks (left alone, JS handled separately) and markup
parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>|<svg\b.*?</svg>)", src, flags=re.S | re.I)
out = []
for part in parts:
    if re.match(r"<(script|style|svg)\b", part, re.I):
        out.append(part); continue
    # text between tags
    def text_sub(m):
        raw = m.group(1)
        if not raw.strip():
            return m.group(0)
        t = tr(raw)
        if t is None:
            return m.group(0)
        lead = raw[:len(raw) - len(raw.lstrip())]; trail = raw[len(raw.rstrip()):]
        return ">" + lead + esc_text(t) + trail + "<"
    part = re.sub(r">([^<>]+)<", text_sub, part)
    # text sitting right after an <svg>…</svg> block (e.g. "Watch the 3-min video")
    def lead_sub(m):
        raw = m.group(1); t = tr(raw) if raw.strip() else None
        if t is None: return m.group(0)
        lead = raw[:len(raw) - len(raw.lstrip())]; trail = raw[len(raw.rstrip()):]
        return lead + esc_text(t) + trail + "<"
    part = re.sub(r"^([^<>]+)<", lead_sub, part)
    # translatable attributes
    def attr_sub(m):
        name, q, val = m.group(1), m.group(2), m.group(3)
        t = tr(val)
        if t is None:
            return m.group(0)
        return f'{name}={q}{html.escape(t, quote=True)}{q}'
    part = re.sub(r'\b(alt|aria-label|title|placeholder)=(["\'])(.*?)\2', attr_sub, part)
    part = re.sub(r'(<meta\s+(?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)"\s+content)=(["\'])(.*?)\2',
                  lambda m: m.group(1) + "=" + m.group(2) + html.escape(es.get(norm(m.group(3)), html.unescape(m.group(3))), quote=True) + m.group(2), part)
    out.append(part)
s = "".join(out)

# 2. testimonials stay in English: drop them from the missing list
s_quotes = set(norm(q) for q in re.findall(r'<blockquote class="tst-quote[^"]*">(.*?)</blockquote>', src, re.S))
missing = [m for m in missing if m not in s_quotes]

# 3. strings that live inside JavaScript
JS = [
    ('isRev ? "Revenue" : "Engagement"', 'isRev ? "Ventas" : "Interacción"'),
    ('See how we did it <i>', 'Mira cómo lo hicimos <i>'),
    ('". Open case study"', '". Abrir caso de éxito"'),
    ("'Close <span aria-hidden=\"true\">×</span>'", "'Cerrar <span aria-hidden=\"true\">×</span>'"),
    ('const names = ["Consulting", "Content", "Creative", "Reach"];', 'const names = ["Consultoría", "Contenido", "Creativo", "Alcance"];'),
    ('fn.innerHTML = "Full House ✓";', 'fn.innerHTML = "Full House ✓";'),
]
for a, b in JS:
    if a not in s:
        print("warning: JS string not found:", a)
    s = s.replace(a, b)

# 4. language, URLs, paths
s = s.replace('<html lang="en">', '<html lang="es">', 1)
s = s.replace(f'<link rel="canonical" href="{SITE}" />', f'<link rel="canonical" href="{SITE}es/" />', 1)
s = s.replace(f'<meta property="og:url" content="{SITE}" />', f'<meta property="og:url" content="{SITE}es/" />\n  <meta property="og:locale" content="es_US" />', 1)
s = re.sub(r'\b(src|href|poster|data-img|data-src)="media/', r'\1="../media/', s)
s = re.sub(r"url\((['\"]?)media/", r"url(\1../media/", s)
s = s.replace('href="#hero"', 'href="#hero"')
# language switch: ES is the current page
s = s.replace('<a class="lang-en on" href="/" hreflang="en" lang="en">EN</a><a class="lang-es" href="/es/" hreflang="es" lang="es">ES</a>',
              '<a class="lang-en" href="/" hreflang="en" lang="en">EN</a><a class="lang-es on" href="/es/" hreflang="es" lang="es">ES</a>')

# 5. FAQ structured data rebuilt from the translated questions
faq = re.findall(r'<summary>(.*?)<span class="faq-mark".*?</summary>\s*<p>(.*?)</p>', s, re.S)
items = [{"@type": "Question", "name": html.unescape(re.sub("<[^>]+>", "", q)).strip(),
          "acceptedAnswer": {"@type": "Answer", "text": html.unescape(re.sub("<[^>]+>", "", a)).strip()}} for q, a in faq]
ld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": "es", "mainEntity": items}, ensure_ascii=False)
s = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>',
           lambda m: '<script type="application/ld+json">' + ld + '</script>', s, count=1, flags=re.S)

os.makedirs(os.path.join(ROOT, "es"), exist_ok=True)
open(os.path.join(ROOT, "es", "index.html"), "w", encoding="utf-8").write(s)
print(f"built es/index.html ({len(es)} translations)")
if missing:
    print(f"{len(missing)} strings still in English (add them to tools/es.json if they should be translated):")
    for m in missing:
        print("  -", m[:90])
