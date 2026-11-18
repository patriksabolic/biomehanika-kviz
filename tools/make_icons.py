"""Izrada ikona icons/icon-192.png i icon-512.png bez vanjskih paketa.

Pokretanje iz mape projekta:  python tools/make_icons.py
Crta slovo "B" na tamnoplavoj podlozi (sadržaj unutar sigurne zone za maskable ikone).
"""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BG = (18, 24, 33)
ACCENT = (79, 157, 255)
FG = (238, 242, 247)
SS = 4  # supersampling za glatke rubove


def in_circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def in_bowl(x, y, x0, y0, y1, xr, inner):
    """Polukružna 'trbušina' slova B: od lijevog ruba x0 do polukruga sa središtem (xr, sredina)."""
    cy = (y0 + y1) / 2
    outer = (y1 - y0) / 2
    if x < x0:
        return False
    inside_outer = (x <= xr and y0 <= y <= y1) or (x > xr and in_circle(x, y, xr, cy, outer))
    inside_inner = (x <= xr and cy - inner < y < cy + inner) or (x > xr and in_circle(x, y, xr, cy, inner))
    return inside_outer and not inside_inner


def shade(u, v):
    """u, v u rasponu 0..1; vraća boju piksela."""
    # podloga s krugom (akcent)
    if in_circle(u, v, 0.5, 0.5, 0.40):
        color = ACCENT
    else:
        color = BG
    stem = 0.33 <= u <= 0.43 and 0.27 <= v <= 0.73
    upper = in_bowl(u, v, 0.38, 0.27, 0.51, 0.52, 0.06)
    lower = in_bowl(u, v, 0.38, 0.49, 0.73, 0.54, 0.06)
    if stem or upper or lower:
        color = FG
    return color


def make_png(size):
    rows = bytearray()
    for py in range(size):
        rows.append(0)
        for px in range(size):
            acc = [0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    c = shade((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size)
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
            n = SS * SS
            rows.extend((acc[0] // n, acc[1] // n, acc[2] // n))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")


def main():
    out = ROOT / "icons"
    out.mkdir(exist_ok=True)
    for size in (192, 512):
        (out / f"icon-{size}.png").write_bytes(make_png(size))
        print(f"icons/icon-{size}.png")


if __name__ == "__main__":
    main()
