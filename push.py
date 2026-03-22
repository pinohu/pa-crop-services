#!/usr/bin/env python3
"""
PA CROP Services — Quick Push Helper
Usage: python3 push.py "your commit message"
       python3 push.py public/index.html "update homepage"
       python3 push.py  # pushes all modified files with auto message
"""
import sys, os, urllib.request, json, base64, glob, time

TOKEN = "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"
REPO = "pinohu/pa-crop-services"

def get_sha(path):
    url = f"https://api.github.com/repos/{REPO}/contents/{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"token {TOKEN}"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r).get("sha", "")
    except:
        return ""

def push_file(local_path, remote_path, message):
    with open(local_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    sha = get_sha(remote_path)
    body = {"message": message, "content": content}
    if sha:
        body["sha"] = sha
    url = f"https://api.github.com/repos/{REPO}/contents/{remote_path}"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="PUT",
        headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            commit = json.load(r).get("commit", {}).get("sha", "")[:10]
            print(f"  ✅ {remote_path} [{commit}]")
            return True
    except Exception as e:
        print(f"  ❌ {remote_path}: {e}")
        return False

args = sys.argv[1:]
if len(args) == 0:
    # Push all html, js, and md files
    files = glob.glob("public/**/*.html", recursive=True) + \
            glob.glob("public/**/*.js", recursive=True) + \
            glob.glob("api/*.js") + \
            glob.glob("context/*.md")
    msg = f"Update {len(files)} files"
    for f in files:
        push_file(f, f, msg)
        time.sleep(0.3)
elif len(args) == 1:
    # Single message, push everything
    msg = args[0]
    files = glob.glob("public/**/*.html", recursive=True) + glob.glob("api/*.js")
    for f in files:
        push_file(f, f, msg)
        time.sleep(0.3)
elif len(args) == 2:
    # push.py file.html "message"
    push_file(args[0], args[0], args[1])
else:
    print("Usage: python3 push.py [file] [message]")
