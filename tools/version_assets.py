"""Tag every file the page loads with a fingerprint of its contents.

    python3 tools/version_assets.py

GitHub Pages lets phones reuse a saved copy of each file for 10 minutes (some
in-app browsers keep them longer), so a changed picture that keeps its name can
still show the old version. This rewrites assets/..., styles.css and script.js
references in site/index.html and site/styles.css to end in ?v=<fingerprint>.
The fingerprint only changes when the file does, so run it before every
publish (it is safe to run repeatedly).
"""
import hashlib
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
REF = re.compile(r'(?P<path>assets/[A-Za-z0-9._-]+|styles\.css|script\.js)(?:\?v=[0-9a-f]+)?(?=["\')\s])')


def fingerprint(match):
    path = match.group("path")
    target = SITE / path
    if not target.is_file():
        return match.group(0)
    return f"{path}?v={hashlib.md5(target.read_bytes()).hexdigest()[:8]}"


def main():
    for name in ("styles.css", "index.html"):  # css first: index.html fingerprints it
        page = SITE / name
        before = page.read_text()
        after = REF.sub(fingerprint, before)
        if after != before:
            page.write_text(after)
        print(f"{name}: {len(REF.findall(after))} references tagged")


if __name__ == "__main__":
    main()
