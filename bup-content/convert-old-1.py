import re
import sys
from bs4 import BeautifulSoup, NavigableString, Tag

# ── Load file ─────────────────────────────────────────────────────────────────

input_file = sys.argv[1] if len(sys.argv) > 1 else "2024-07-23.html"
stem = input_file.rsplit(".", 1)[0]
output_file = stem + ".md"

with open(input_file, encoding="utf-8") as f:
    soup = BeautifulSoup(f, "html.parser")

# Old archived HTML uses div[is="element-tab-simple"] as the tab wrapper
root_el = soup.find("div", attrs={"is": "element-tab-simple"})
if root_el is None:
    raise ValueError("div[is='element-tab-simple'] not found in " + input_file)

tab_panes = root_el.find_all("div", class_="tab-pane")
root = tab_panes[0] if tab_panes else root_el

# ── Helpers ───────────────────────────────────────────────────────────────────

def ws(text):
    return re.sub(r"\s+", " ", text).strip()

def elem_text(el):
    parts = []
    for child in el.children:
        if isinstance(child, NavigableString):
            parts.append(str(child))
        elif isinstance(child, Tag):
            if "math-tex" in child.get("class", []):
                parts.append(f"${child.get_text()}$")
            else:
                parts.append(elem_text(child))
    return "".join(parts)

def anchor_title(a):
    parts = []
    for child in a.children:
        if isinstance(child, NavigableString):
            parts.append(str(child))
        elif isinstance(child, Tag) and child.name not in ("i", "img"):
            parts.append(elem_text(child))
    return ws("".join(parts)).rstrip(". ").rstrip(".")

def italic_lead(p):
    for child in p.children:
        if isinstance(child, NavigableString):
            if str(child).strip():
                return False
        elif isinstance(child, Tag):
            return child.name == "i"
    return False

def text_after_first_tag(p):
    parts = []
    past_first = False
    for child in p.children:
        if not past_first:
            if isinstance(child, Tag):
                past_first = True
            continue
        if isinstance(child, NavigableString):
            parts.append(str(child))
        elif isinstance(child, Tag):
            if "math-tex" in child.get("class", []):
                parts.append(f"${child.get_text()}$")
            else:
                parts.append(elem_text(child))
    return "".join(parts)

# ── Emission ──────────────────────────────────────────────────────────────────

def emit_para(p, out):
    if italic_lead(p):
        first_i = next(c for c in p.children if isinstance(c, Tag))
        heading = ws(first_i.get_text()).rstrip(".").rstrip()
        if heading:
            out.append(f"#### {heading}\n\n")
        rest = ws(text_after_first_tag(p))
        if rest:
            out.append(f"{rest}\n\n")
    else:
        text = ws(elem_text(p))
        if text:
            out.append(f"{text}\n\n")

def process_content(div, level, out):
    nested = div.find_all("div", class_="collapse-simple", recursive=False)
    if nested:
        for acc in nested:
            process_accordion(acc, level, out)
    else:
        for child in div.children:
            if isinstance(child, Tag) and child.name == "p":
                emit_para(child, out)
            elif isinstance(child, NavigableString):
                text = ws(str(child))
                if text:
                    out.append(f"{text}\n\n")

def process_accordion(acc, level, out):
    a = acc.find("a", recursive=False)
    if a:
        strong = a.find("strong")
        title = ws(strong.get_text()) if strong else anchor_title(a)
        if title:
            h = "#" * min(level, 4)
            out.append(f"{h} {title}\n\n")
    collapse = acc.find("div", class_="collapse", recursive=False)
    if collapse:
        content = collapse.find("div", recursive=False)
        if content:
            process_content(content, level + 1, out)

# ── Convert ───────────────────────────────────────────────────────────────────

out = []
for kl_div in root.select("div.is-clas > div.mb-3.collapse-simple"):
    a = kl_div.find("a", recursive=False)
    if not a:
        continue
    title = anchor_title(a)
    if not title:
        continue
    out.append(f"# {title}\n\n")
    collapse = kl_div.find("div", class_="collapse", recursive=False)
    if collapse:
        content = collapse.find("div", recursive=False)
        if content:
            process_content(content, 2, out)

md = re.sub(r"\n{3,}", "\n\n", "".join(out)).strip()
md = md.replace("\\(", "").replace("\\)", "")
with open(output_file, "w", encoding="utf-8") as f:
    f.write(md)
print(f"Saved to {output_file}")
