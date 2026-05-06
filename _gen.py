import os, base64
paths = ["contracts/ReaperCoin.sol","website/index.html","scripts/deploy.js","hardhat.config.js","test/ReaperCoin.test.js","package.json","README.md"]
files = {}
for p in paths:
    if os.path.exists(p):
        with open(p,'r',encoding='utf-8') as f:
            files[p] = f.read()
out = open('setup_project.py','w',encoding='utf-8')
out.write('\"\"\"\nsetup_project.py - Reaper Project File Generator\nRun: python setup_project.py\nWrites all project files for the Reaper token project.\n\"\"\"\nimport os, base64\n\nBASE_DIR = os.path.dirname(os.path.abspath(__file__))\nos.chdir(BASE_DIR)\n\nfiles = {}\n\n')
for p, content in files.items():
    enc = base64.b64encode(content.encode('utf-8')).decode('ascii')
    out.write(f'files["{p}"] = "{enc}"\n\n')
out.write('\nfor path, data in files.items():\n    d = os.path.dirname(path)\n    if d:\n        os.makedirs(d, exist_ok=True)\n    with open(path, "w", encoding="utf-8") as f:\n        f.write(base64.b64decode(data).decode("utf-8"))\n    print(f"Written: {path}")\n\nprint("\\nAll files written successfully!")\n')
out.close()
print("setup_project.py generated successfully!")
