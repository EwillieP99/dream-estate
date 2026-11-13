"""Render each exterior from the front and back."""
import sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).parent
out = root / "shots"; out.mkdir(exist_ok=True)
jobs = sys.argv[1:] or ["A-front-sunset", "A-back-sunset", "B-front-sunset", "B-back-sunset", "C-front-sunset", "C-back-sunset"]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"])
    page = b.new_page(viewport={"width": 1440, "height": 860})
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if "GL Driver" not in m.text else None)
    page.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
    page.goto((root / "dist" / "index.html").as_uri())
    page.wait_for_timeout(5000)
    for j in jobs:
        ext, view, time = j.split(":")
        cam = {"front": "mansion", "back": "back"}.get(view)
        if cam:
            page.evaluate(f"__estate.setExterior('{ext}'); __estate.setTime('{time}'); __estate.go('{cam}', true)")
        else:
            x, y, z, tx, ty, tz = view.split(",")
            page.evaluate(f"__estate.setExterior('{ext}'); __estate.setTime('{time}'); __estate.flyTo([{x},{y},{z}],[{tx},{ty},{tz}],0)")
        page.wait_for_timeout(3500)
        page.screenshot(path=str(out / f"ext-{ext}-{view if cam else 'custom'}-{time}.png"))
    print("\n".join(logs[:20]) or "no console output")
    b.close()
