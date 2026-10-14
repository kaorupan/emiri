#!/usr/bin/env python3
"""OGP画像（SNSでシェアされたときの画像）を作る：python3 tools/seo/ogp.py

  tools/seo/sections.json の占いごとに assets/img/ogp/<key>.jpg（1200×630）と、
  TOP・その他のページ用の assets/img/ogp/default.jpg を作る。
  日本語フォント（Noto Serif/Sans CJK）が必要なので、手元で実行して画像をコミットする（毎日の自動更新では作らない）。
  星のわんにゃん占いのタイプ写真（assets/img/wannyan/<slug>.webp）があれば、そのタイプ用の
  assets/img/ogp/wannyan-<slug>.jpg も作る。
"""
import json
import math
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/img/ogp"
FONTS = Path("/usr/share/fonts/opentype/noto")
W, H = 1200, 630
BG, CARD, GOLD, TEXT, MUTED, PURPLE = "#07050c", "#1c1427", "#e7c568", "#faf5ff", "#c3b8cf", "#a27cff"


def font(kind, size):
    return ImageFont.truetype(str(FONTS / kind), size, index=0)  # index 0 = JP


def background(seed):
    img = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG)
    g = ImageDraw.Draw(glow)
    g.ellipse((W * 0.55, -H * 0.5, W * 1.35, H * 0.75), fill="#2a1747")
    g.ellipse((-W * 0.3, H * 0.45, W * 0.45, H * 1.5), fill="#1a1230")
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(120)), 1)
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    for _ in range(140):
        x, y, r = rnd.uniform(0, W), rnd.uniform(0, H), rnd.choice([0.8, 1, 1, 1.4, 2])
        c = rnd.choice(["#ffffff", "#e9dcff", GOLD])
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    # 三日月
    cx, cy, R = 1040, 120, 54
    moon = Image.new("L", (W, H), 0)
    m = ImageDraw.Draw(moon)
    m.ellipse((cx - R, cy - R, cx + R, cy + R), fill=255)
    m.ellipse((cx - R + 26, cy - R - 12, cx + R + 26, cy + R - 12), fill=0)
    img.paste(Image.new("RGB", (W, H), GOLD), (0, 0), moon.filter(ImageFilter.GaussianBlur(0.6)))
    d.rounded_rectangle((28, 28, W - 28, H - 28), radius=30, outline="#5b4470", width=2)
    return img


def fit(text, kind, size, max_w):
    while size > 30:
        f = font(kind, size)
        if f.getlength(text) <= max_w:
            return f
        size -= 4
    return font(kind, size)


def centered(d, y, text, f, fill):
    w = f.getlength(text)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)


def card(name, catch, seed, photo=None):
    img = background(seed)
    d = ImageDraw.Draw(img)
    top = font("NotoSansCJK-Bold.ttc", 24)
    d.text((72, 66), "EMIRI  ·  無料占い", font=top, fill=GOLD)
    if photo:
        p = Image.open(photo).convert("RGB")
        s = 330
        p = p.resize((s, s))
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, s, s), fill=255)
        x, y = 92, (H - s) // 2 + 14
        ImageDraw.Draw(img).ellipse((x - 6, y - 6, x + s + 6, y + s + 6), fill=GOLD)
        img.paste(p, (x, y), mask)
        left, width = 480, W - 480 - 80
        nf = fit(name, "NotoSerifCJK-Bold.ttc", 72, width)
        lines = wrap(catch, font("NotoSansCJK-Regular.ttc", 34), width)
        d.text((left, 210), name, font=nf, fill=TEXT)
        d.line((left, 320, left + 120, 320), fill=GOLD, width=3)
        for i, line in enumerate(lines[:3]):
            d.text((left, 345 + i * 50), line, font=font("NotoSansCJK-Regular.ttc", 34), fill=MUTED)
    else:
        nf = fit(name, "NotoSerifCJK-Bold.ttc", 104, W - 220)
        centered(d, 196, name, nf, TEXT)
        y = 360
        d.line((W / 2 - 150, y, W / 2 - 22, y), fill=GOLD, width=2)
        d.line((W / 2 + 22, y, W / 2 + 150, y), fill=GOLD, width=2)
        d.polygon([(W / 2, y - 9), (W / 2 + 9, y), (W / 2, y + 9), (W / 2 - 9, y)], fill=GOLD)
        cf = fit(catch, "NotoSansCJK-Regular.ttc", 40, W - 200)
        centered(d, 396, catch, cf, MUTED)
    bf = font("NotoSerifCJK-Bold.ttc", 34)
    sf = font("NotoSansCJK-Regular.ttc", 24)
    d.text((72, H - 106), "えみり", font=bf, fill=GOLD)
    d.text((72 + bf.getlength("えみり") + 18, H - 96), "emiri-uranai.com", font=sf, fill=MUTED)
    return img


def wrap(text, f, width):
    lines, cur = [], ""
    for ch in text:
        if f.getlength(cur + ch) > width:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    return lines + ([cur] if cur else [])


def save(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / name, "JPEG", quality=86, optimize=True, progressive=True)


def main():
    conf = json.loads((ROOT / "tools/seo/sections.json").read_text())
    save(card("えみり", "登録不要の無料占いと、毎日の運勢の総合占いサイト", "default"), "default.jpg")
    for key, s in conf["sections"].items():
        save(card(s["name"], s["catch"], key), f"{key}.jpg")
    # わんにゃんのタイプ写真があれば、タイプごとの画像も
    photos = sorted((ROOT / "assets/img/wannyan").glob("*.webp")) if (ROOT / "assets/img/wannyan").exists() else []
    names = {}
    if photos:
        for f in (ROOT / "wannyan").glob("*/index.html"):
            m = re.search(r"<h1>([^<｜]+)", f.read_text())
            if m:
                names[f.parent.name] = m.group(1)
    for p in photos:
        if p.stem in names:
            save(card(names[p.stem], "星のわんにゃん占い｜生年月日で96タイプの犬・猫にたとえる", p.stem, photo=p), f"wannyan-{p.stem}.jpg")
    print(f"OGP画像：{len(conf['sections']) + 1 + len(photos)}枚")


if __name__ == "__main__":
    main()
