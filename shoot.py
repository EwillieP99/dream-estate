"""Render the built page in headless Chrome and save screenshots for review."""
import sys, pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).parent
out = root / "shots"
out.mkdir(exist_ok=True)
shots = sys.argv[1:] or ["mansion", "estate", "pool", "waterfall", "gate", "farm", "explode", "night", "day"]

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"])
    page = b.new_page(viewport={"width": 1440, "height": 860})
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
    page.goto((root / "dist" / "index.html").as_uri())
    page.wait_for_timeout(4000)
    for s in shots:
        if s == "explode":
            page.evaluate("__estate.setTime('sunset'); __estate.setExplode(true)")
            page.wait_for_timeout(5000)
        elif s in ("night", "day"):
            view = 'pool' if s == 'night' else 'mansion'
            page.evaluate(f"__estate.setExplode(false); __estate.setTime('{s}'); __estate.go('{view}', true)")
            page.wait_for_timeout(3000)
        else:
            page.evaluate(f"__estate.go('{s}', true)")
            page.wait_for_timeout(2500)
        page.screenshot(path=str(out / f"{s}.png"))
    print("\n".join(logs[:30]) or "no console output")
    b.close()
