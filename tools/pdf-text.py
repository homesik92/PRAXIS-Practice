#!/usr/bin/env python3
"""Extract text from a PDF, in page order, with no third-party dependencies.

Why this exists
---------------
The ETS Study Companions under `Knowledge-Guides/` are the source of every bank's
*blueprint* -- category names, question counts, time limits, weightings. Reading them
needs a PDF-to-text step, and this machine has none: `pdftotext`, `pdftoppm`, `mutool`,
`qpdf`, `gs`, PyMuPDF, pypdf, pdfminer and PyObjC/Quartz are all absent, and installing
poppler is unattractive on the session owner's toolchain. Rather than add a dependency
to a project that deliberately has none (D-3), this reads the PDF directly.

Written for Phase 7.3, where comparing 5436 (General Science) against 5485 (Physical
Science) at bullet depth is what showed the overlap was ~half rather than "a small
difference" -- a category-name comparison would have missed that 5485 has no chemical
equilibrium content at all.

⚠ ETS COPYRIGHT RULE -- read before using this on a study companion.
    Take the blueprint, never the content. Use this to read "Test at a Glance" and
    "Content Topics"; stop before the sample-question sections. Extracted prose must
    not be pasted into a bank, a doc, or a question -- see CLAUDE.md. This tool makes
    the PDFs *readable*, which makes the rule easier to break by accident, not harder.
    The PDFs themselves stay gitignored and never reach GitHub.

What it handles
---------------
* PDF 1.5+ cross-reference and **object streams** (`/ObjStm`). This is the part that
  matters: without it the 5436 guide reports zero pages, because all 53 of them live
  inside 37 compressed object streams.
* `FlateDecode` content streams.
* Real page order, by walking the page tree from the catalog rather than trusting
  object numbering.
* Per-font `/Differences` encodings, which is what keeps subset-embedded fonts from
  coming out as mojibake.

What it does not handle: **encrypted PDFs** -- `Knowledge-Guides/5165-Mathematics.pdf`
is one, and the other four study companions are not -- scanned/image-only pages (there
is no OCR here), and exotic filters (LZW, JBIG2, CCITT). Encryption is detected and
reported as an error rather than returned as a document full of blank pages. Layout
fidelity is approximate: it recovers reading order well enough to read a blueprint
table, not to reproduce a page.

Usage
-----
    python3 tools/pdf-text.py <file.pdf>                 # whole document
    python3 tools/pdf-text.py <file.pdf> --pages 3-18    # a page range (1-based)
    python3 tools/pdf-text.py --self-test                # verify the parser itself
"""

import argparse
import re
import sys
import zlib

# --- inflate ------------------------------------------------------------------------


def inflate(data):
    """zlib-decompress, tolerating streams with trailing junk or a missing checksum."""
    try:
        return zlib.decompress(data)
    except zlib.error:
        try:
            return zlib.decompressobj().decompress(data)
        except zlib.error:
            return b""


def stream_payload(body):
    """The bytes between `stream`/`endstream`, inflated when Flate-encoded."""
    i = body.find(b"stream")
    if i < 0:
        return b""
    start = i + len(b"stream")
    if body[start:start + 2] == b"\r\n":
        start += 2
    elif body[start:start + 1] in (b"\n", b"\r"):
        start += 1
    end = body.find(b"endstream", start)
    raw = body[start:end if end >= 0 else len(body)]
    return inflate(raw) if b"/FlateDecode" in body else raw


# --- object index -------------------------------------------------------------------

OBJ_RE = re.compile(rb"(\d+)\s+(\d+)\s+obj\b(.*?)\bendobj", re.S)


def index_objects(raw):
    """Map object number -> body, including objects packed inside /ObjStm streams."""
    objects = {int(m.group(1)): m.group(3) for m in OBJ_RE.finditer(raw)}

    # PDF 1.5+ packs most non-stream objects into compressed object streams. Each holds
    # a header of "objnum offset" pairs within the first /First bytes, then the bodies.
    for body in list(objects.values()):
        if not re.search(rb"/Type\s*/ObjStm", body):
            continue
        n_match = re.search(rb"/N\s+(\d+)", body)
        first_match = re.search(rb"/First\s+(\d+)", body)
        if not (n_match and first_match):
            continue
        data = stream_payload(body)
        if not data:
            continue
        count, first = int(n_match.group(1)), int(first_match.group(1))
        header = data[:first].split()
        pairs = [
            (int(header[k]), int(header[k + 1]))
            for k in range(0, min(len(header) - 1, 2 * count), 2)
        ]
        for idx, (objnum, offset) in enumerate(pairs):
            end = first + pairs[idx + 1][1] if idx + 1 < len(pairs) else len(data)
            objects.setdefault(objnum, data[first + offset:end])
    return objects


def page_order(objects):
    """Page bodies in document order, via the catalog's page tree."""
    root = None
    for body in objects.values():
        if re.search(rb"/Type\s*/Catalog", body):
            m = re.search(rb"/Pages\s+(\d+)\s+0\s+R", body)
            if m:
                root = int(m.group(1))
                break

    order = []
    seen = set()

    def walk(num, depth=0):
        if depth > 64 or num in seen or num not in objects:
            return
        seen.add(num)
        body = objects[num]
        # `/Type /Pages` must not match here -- \b prevents it, since "Pages" continues
        # the word.
        if re.search(rb"/Type\s*/Page\b", body):
            order.append(num)
            return
        kids = re.search(rb"/Kids\s*\[(.*?)\]", body, re.S)
        if kids:
            for kid in re.findall(rb"(\d+)\s+0\s+R", kids.group(1)):
                walk(int(kid), depth + 1)

    if root is not None:
        walk(root)
    if not order:  # malformed or missing catalog -- fall back to object order
        order = sorted(n for n, b in objects.items() if re.search(rb"/Type\s*/Page\b", b))
    return order


# --- font /Differences encoding -----------------------------------------------------

GLYPH_NAMES = {
    "space": " ", "hyphen": "-", "period": ".", "comma": ",", "colon": ":",
    "semicolon": ";", "quoteright": "’", "quoteleft": "‘",
    "quotedblright": "”", "quotedblleft": "“", "endash": "–",
    "emdash": "—", "bullet": "•", "percent": "%", "parenleft": "(",
    "parenright": ")", "slash": "/", "ampersand": "&", "question": "?",
    "exclam": "!", "quotesingle": "'", "quotedbl": '"', "plus": "+",
    "equal": "=", "underscore": "_", "asterisk": "*", "degree": "°",
}


def glyph_to_char(name):
    if name in GLYPH_NAMES:
        return GLYPH_NAMES[name]
    if re.fullmatch(r"uni[0-9A-Fa-f]{4}", name):
        return chr(int(name[3:], 16))
    return name if len(name) == 1 else ""


def font_maps(page_body, objects):
    """Per-font {char code -> character} tables, for fonts declaring /Differences."""
    blob = page_body
    ref = re.search(rb"/Resources\s+(\d+)\s+0\s+R", page_body)
    if ref:
        blob = objects.get(int(ref.group(1)), page_body)

    fonts = re.search(rb"/Font\s*<<(.*?)>>", blob, re.S)
    if not fonts:
        return {}

    maps = {}
    for name, num in re.findall(rb"/([^\s/]+)\s+(\d+)\s+0\s+R", fonts.group(1)):
        font_body = objects.get(int(num), b"")
        enc_ref = re.search(rb"/Encoding\s+(\d+)\s+0\s+R", font_body)
        enc_body = objects.get(int(enc_ref.group(1)), b"") if enc_ref else font_body
        diff = re.search(rb"/Differences\s*\[(.*?)\]", enc_body, re.S)
        if not diff:
            continue
        table, code = {}, 0
        for number, glyph in re.findall(rb"(\d+)|/([^\s/\]]+)", diff.group(1)):
            if number:
                code = int(number)
            else:
                table[code] = glyph_to_char(glyph.decode("latin-1"))
                code += 1
        maps[name.decode("latin-1")] = table
    return maps


# --- text operators -----------------------------------------------------------------

ESCAPES = {0x6E: "\n", 0x72: "\r", 0x74: "\t", 0x62: "\b", 0x66: "\f",
           0x28: "(", 0x29: ")", 0x5C: "\\"}


def decode_literal(raw):
    """Decode a PDF literal string body, resolving backslash and octal escapes."""
    out, i = [], 0
    while i < len(raw):
        char = raw[i]
        if char != 0x5C:
            out.append(chr(char))
            i += 1
            continue
        i += 1
        if i >= len(raw):
            break
        nxt = raw[i]
        if nxt in ESCAPES:
            out.append(ESCAPES[nxt])
            i += 1
        elif 0x30 <= nxt <= 0x37:
            digits = ""
            while i < len(raw) and len(digits) < 3 and 0x30 <= raw[i] <= 0x37:
                digits += chr(raw[i])
                i += 1
            out.append(chr(int(digits, 8)))
        else:
            out.append(chr(nxt))
            i += 1
    return "".join(out)


BREAK_OPS = re.compile(rb"\b(TD|Td|T\*|TJ|Tj|ET)\b")
FONT_OP = re.compile(rb"/([^\s/\[\]<>()]+)\s+[\d.]+\s+Tf")


def extract_text(content, maps):
    """Pull show-text operands out of a content stream, inserting line breaks."""
    out, current_font = [], None

    def emit(text):
        table = maps.get(current_font) if current_font else None
        return "".join(table.get(ord(c), c) for c in text) if table else text

    i, n = 0, len(content)
    while i < n:
        byte = content[i:i + 1]

        if byte == b"/":
            m = FONT_OP.match(content, i)
            if m:
                current_font = m.group(1).decode("latin-1")

        if byte == b"(":
            depth, j = 1, i + 1
            while j < n and depth:
                if content[j:j + 1] == b"\\":
                    j += 2
                    continue
                if content[j:j + 1] == b"(":
                    depth += 1
                elif content[j:j + 1] == b")":
                    depth -= 1
                j += 1
            out.append(emit(decode_literal(content[i + 1:j - 1])))
            i = j
            continue

        if byte == b"<" and content[i:i + 2] != b"<<":
            j = content.find(b">", i)
            if j > 0:
                hexdigits = re.sub(rb"\s", b"", content[i + 1:j])
                try:
                    out.append(emit("".join(
                        chr(int(hexdigits[k:k + 2], 16))
                        for k in range(0, len(hexdigits) - 1, 2)
                    )))
                except ValueError:
                    pass
                i = j + 1
                continue

        m = BREAK_OPS.match(content, i)
        if m:
            if m.group(1) in (b"TD", b"Td", b"T*", b"ET"):
                out.append("\n")
            i += len(m.group(1))
            continue

        i += 1
    return "".join(out)


def page_text(num, objects):
    body = objects[num]
    chunks = []
    single = re.search(rb"/Contents\s+(\d+)\s+0\s+R", body)
    if single:
        chunks.append(stream_payload(objects.get(int(single.group(1)), b"")))
    else:
        array = re.search(rb"/Contents\s*\[(.*?)\]", body, re.S)
        if array:
            for ref in re.findall(rb"(\d+)\s+0\s+R", array.group(1)):
                chunks.append(stream_payload(objects.get(int(ref), b"")))
    raw = extract_text(b"\n".join(chunks), font_maps(body, objects))
    lines = (re.sub(r"[ \t]+", " ", line).strip() for line in raw.split("\n"))
    return "\n".join(line for line in lines if line)


ENCRYPT_RE = re.compile(rb"/Encrypt\s+\d+\s+0\s+R")


def is_encrypted(raw):
    """True when the trailer names an /Encrypt dictionary.

    Encrypted streams do not inflate, so every page would come back empty. Reporting
    that as "no text" would be a silent failure -- the caller would reasonably read it
    as "this page has no text" rather than "this tool cannot read this file".
    Of the study companions, 5165 is encrypted and the other four are not.
    """
    return bool(ENCRYPT_RE.search(raw))


class EncryptedPDF(Exception):
    pass


def extract(path, first=None, last=None):
    raw = open(path, "rb").read()
    if is_encrypted(raw):
        raise EncryptedPDF(path)
    objects = index_objects(raw)
    pages = page_order(objects)
    lo = max(1, first or 1)
    hi = min(len(pages), last or len(pages))
    return pages, [(i + 1, page_text(pages[i], objects)) for i in range(lo - 1, hi)]


# --- self-test ----------------------------------------------------------------------


def _build_pdf(use_object_stream):
    """Build a minimal single-page PDF in memory, optionally packing the page tree
    into an /ObjStm -- the PDF 1.5+ layout that made the real guides parse as empty."""
    content = b"BT /F1 12 Tf (Content Topics) Tj 0 -14 Td (Nature of Science) Tj ET"
    deflated = zlib.compress(content)
    stream_obj = (
        b"4 0 obj\n<< /Length " + str(len(deflated)).encode() +
        b" /Filter /FlateDecode >>\nstream\n" + deflated + b"\nendstream\nendobj\n"
    )

    bodies = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        2: b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        3: b"<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>",
    }

    if not use_object_stream:
        plain = b"".join(
            str(n).encode() + b" 0 obj\n" + b + b"\nendobj\n" for n, b in bodies.items()
        )
        return b"%PDF-1.4\n" + plain + stream_obj

    payload, header, offset = b"", "", 0
    for num, body in bodies.items():
        header += f"{num} {offset} "
        payload += body + b" "
        offset = len(payload)
    header_bytes = header.encode()
    data = header_bytes + payload
    deflated_objstm = zlib.compress(data)
    objstm = (
        b"5 0 obj\n<< /Type /ObjStm /N 3 /First " + str(len(header_bytes)).encode() +
        b" /Length " + str(len(deflated_objstm)).encode() +
        b" /Filter /FlateDecode >>\nstream\n" + deflated_objstm + b"\nendstream\nendobj\n"
    )
    return b"%PDF-1.5\n" + objstm + stream_obj


def self_test():
    failures = []

    def check(name, condition, detail=""):
        print(f"{'PASS ' if condition else 'FAIL '} {name}")
        if not condition:
            failures.append(f"{name}{': ' + detail if detail else ''}")

    for label, use_objstm in (("plain objects", False), ("/ObjStm objects", True)):
        raw = _build_pdf(use_objstm)
        objects = index_objects(raw)
        pages = page_order(objects)
        check(f"{label}: exactly one page found", len(pages) == 1, f"got {len(pages)}")
        if not pages:
            continue
        text = page_text(pages[0], objects)
        check(f"{label}: recovers first text run", "Content Topics" in text, repr(text))
        check(f"{label}: recovers second text run", "Nature of Science" in text, repr(text))
        check(f"{label}: inserts a line break between runs",
              "Content Topics\nNature of Science" in text, repr(text))

    check("a /Type /Pages node is not mistaken for a /Type /Page",
          not re.search(rb"/Type\s*/Page\b", b"<< /Type /Pages /Count 1 >>"))
    check("literal-string octal escapes decode", decode_literal(rb"A\101B") == "AAB")
    check("literal-string escapes decode", decode_literal(rb"a\(b\)c") == "a(b)c")
    check("glyph names map to characters", glyph_to_char("emdash") == "—")
    check("uniXXXX glyph names map to characters", glyph_to_char("uni00B0") == "°")
    check("inflate tolerates undecodable bytes", inflate(b"not-really-zlib") == b"")
    check("an /Encrypt trailer entry is detected",
          is_encrypted(b"trailer\n<< /Root 1 0 R /Encrypt 9 0 R >>"))
    check("an unencrypted trailer is not flagged",
          not is_encrypted(b"trailer\n<< /Root 1 0 R /Size 12 >>"))

    print(f"\n{'FAILED' if failures else 'OK'} -- {len(failures)} failure(s)")
    return 1 if failures else 0


# --- CLI ----------------------------------------------------------------------------


def parse_range(text):
    if not text:
        return None, None
    m = re.fullmatch(r"(\d+)(?:-(\d+))?", text.strip())
    if not m:
        raise argparse.ArgumentTypeError(f"bad page range {text!r}; expected N or N-M")
    lo = int(m.group(1))
    return lo, int(m.group(2)) if m.group(2) else lo


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Extract text from a PDF with no third-party dependencies.",
        epilog="Blueprint use only on the ETS study companions -- see the module "
               "docstring and CLAUDE.md's copyright rule.",
    )
    parser.add_argument("pdf", nargs="?", help="path to a PDF file")
    parser.add_argument("--pages", help="1-based page or range, e.g. 5 or 3-18")
    parser.add_argument("--self-test", action="store_true",
                        help="verify the parser against PDFs built in memory")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()
    if not args.pdf:
        parser.error("a PDF path is required (or use --self-test)")

    first, last = parse_range(args.pages)
    try:
        pages, extracted = extract(args.pdf, first, last)
    except EncryptedPDF as e:
        print(
            f"ERROR: {e} is an encrypted PDF.\n"
            "Its streams cannot be inflated, so every page would come back empty --\n"
            "reported as an error rather than as a document with no text.\n"
            "This tool does not implement PDF decryption (RC4/AES); use a viewer to\n"
            "read it, or re-save an unencrypted copy.",
            file=sys.stderr,
        )
        return 2
    shown = f"{extracted[0][0]}-{extracted[-1][0]}" if extracted else "none"
    print(f"[{len(pages)} pages total; showing {shown}]", file=sys.stderr)
    for number, text in extracted:
        print(f"\n=============== PAGE {number} ===============")
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
