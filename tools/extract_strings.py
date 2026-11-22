"""List every translatable string on index.html (text nodes + key attributes)."""
import json, sys
from html.parser import HTMLParser
SKIP = {"script", "style", "svg"}
ATTRS = {"alt", "aria-label", "title", "placeholder", "content"}
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.stack = []; s.out = []
    def handle_starttag(s, tag, attrs):
        if tag not in ("br", "img", "meta", "link", "input", "source", "path", "circle", "polyline", "line", "rect"): s.stack.append(tag)
        a = dict(attrs)
        for k, v in attrs:
            if k in ATTRS and v and any(c.isalpha() for c in v):
                if k == "content" and a.get("name") not in ("description", "twitter:title", "twitter:description") and a.get("property") not in ("og:title", "og:description"): continue
                s.out.append(v.strip())
    def handle_startendtag(s, tag, attrs): s.handle_starttag(tag, attrs); s.stack and tag in ("br",) and None
    def handle_endtag(s, tag):
        if tag in s.stack:
            while s.stack and s.stack.pop() != tag: pass
    def handle_data(s, d):
        if any(t in SKIP for t in s.stack): return
        t = " ".join(d.split())
        if t and any(c.isalpha() for c in t): s.out.append(t)
p = P(); p.feed(open(sys.argv[1]).read())
seen = []
for x in p.out:
    if x not in seen: seen.append(x)
json.dump(seen, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
print(len(seen), "strings,", sum(len(x) for x in seen), "chars")
