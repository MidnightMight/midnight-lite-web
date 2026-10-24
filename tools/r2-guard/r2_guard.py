#!/usr/bin/env python3
"""R2 usage guard for the route planner's map tiles.

Run hourly (systemd timer). Reads this month's R2 operation counts from Cloudflare's GraphQL analytics, then:
  - at WARN (default 70 %) of a free-tier allowance: sends one notification;
  - at PAUSE (default 90 %): turns off the bucket's custom domain, so the page falls back to OpenStreetMap tiles;
  - in a new month: turns the domain back on (only if this script turned it off).
Free tier (account-wide): Class A 1M, Class B 10M operations a month.

Config: ~/.config/r2-guard.env (chmod 600), lines KEY=value:
  CLOUDFLARE_API_TOKEN   token with Account Analytics: Read and Workers R2 Storage: Edit
  CLOUDFLARE_ACCOUNT_ID  account id
  R2_BUCKET, R2_DOMAIN   e.g. midnight-lite-tiles, tiles.midnight-lite.com
  NOTIFY_URL             optional: plain-text POST (e.g. an ntfy topic URL)
  WARN, PAUSE            optional fractions (0.7, 0.9)
Usage: r2_guard.py [--status] [--dry-run] [--off | --on]   (--off/--on switch the tiles domain by hand)
"""
import datetime as dt, json, os, sys, urllib.request

API = "https://api.cloudflare.com/client/v4"
FREE = {"A": 1_000_000, "B": 10_000_000}
# https://developers.cloudflare.com/r2/pricing/ : anything not listed here or in FREE_OPS counts as Class A
CLASS_B = {"HeadBucket", "HeadObject", "GetObject", "UsageSummary", "GetBucketEncryption", "GetBucketLocation",
           "GetBucketCors", "GetBucketLifecycleConfiguration"}
FREE_OPS = {"DeleteObject", "DeleteBucket", "AbortMultipartUpload"}
CONF = os.path.expanduser("~/.config/r2-guard.env")
STATE = os.path.expanduser("~/.local/state/r2-guard.json")


def env():
    c = {}
    with open(CONF) as f:
        for line in f:
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.strip().split("=", 1)
                c[k] = v.strip().strip('"')
    return c


def call(c, method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {c['CLOUDFLARE_API_TOKEN']}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.load(r)
    if out.get("errors"):
        raise RuntimeError(out["errors"])
    return out


def usage(c, start, end):
    q = """query($a: String!, $s: Time!, $e: Time!) { viewer { accounts(filter: {accountTag: $a}) {
      r2OperationsAdaptiveGroups(limit: 10000, filter: {datetime_geq: $s, datetime_leq: $e}) { sum { requests } dimensions { actionType } } } } }"""
    out = call(c, "POST", "/graphql", {"query": q, "variables": {"a": c["CLOUDFLARE_ACCOUNT_ID"], "s": start, "e": end}})
    n = {"A": 0, "B": 0}
    for g in out["data"]["viewer"]["accounts"][0]["r2OperationsAdaptiveGroups"]:
        t = g["dimensions"]["actionType"]
        if t not in FREE_OPS:
            n["B" if t in CLASS_B else "A"] += g["sum"]["requests"]
    return n


def set_domain(c, on):
    call(c, "PUT", f"/accounts/{c['CLOUDFLARE_ACCOUNT_ID']}/r2/buckets/{c['R2_BUCKET']}/domains/custom/{c['R2_DOMAIN']}", {"enabled": on})


def notify(c, text):
    print(text)
    if c.get("NOTIFY_URL"):
        try:
            urllib.request.urlopen(urllib.request.Request(c["NOTIFY_URL"], data=text.encode(), headers={"Title": "R2 tiles guard"}), timeout=15)
        except Exception as e:  # a failed notification mustn't stop the guard
            print("notify failed:", e)


def main():
    status, dry = "--status" in sys.argv, "--dry-run" in sys.argv
    if not os.path.exists(CONF):
        print(f"not configured ({CONF} missing)")
        return
    c = env()
    if "--off" in sys.argv or "--on" in sys.argv:
        on = "--on" in sys.argv
        set_domain(c, on)
        print(f"{c['R2_DOMAIN']} turned {'on' if on else 'off'}")
        return
    warn, pause = float(c.get("WARN", 0.7)), float(c.get("PAUSE", 0.9))
    now = dt.datetime.now(dt.timezone.utc)
    month = now.strftime("%Y-%m")
    try:
        st = json.load(open(STATE))
    except (OSError, ValueError):
        st = {}
    if st.get("month") != month:   # new month: undo our own pause, reset the warning
        if st.get("paused") and not dry:
            set_domain(c, True)
            notify(c, f"New month: {c['R2_DOMAIN']} is back on (the map uses your own tiles again).")
        st = {"month": month, "warned": False, "paused": False}
    n = usage(c, now.strftime("%Y-%m-01T00:00:00Z"), now.strftime("%Y-%m-%dT%H:%M:%SZ"))
    frac = max(n["A"] / FREE["A"], n["B"] / FREE["B"])
    line = f"{month}: Class A {n['A']:,} / {FREE['A']:,}, Class B {n['B']:,} / {FREE['B']:,} ({frac:.0%} of the free tier)"
    print(line + (" [paused]" if st["paused"] else ""))
    if status:
        return
    if frac >= pause and not st["paused"]:
        if not dry:
            set_domain(c, False)
        st["paused"] = True
        notify(c, f"{line}. Paused {c['R2_DOMAIN']} for the rest of the month; the planner uses OpenStreetMap tiles meanwhile.")
    elif frac >= warn and not st["warned"]:
        st["warned"] = True
        notify(c, f"{line}. Heads up: it pauses at {pause:.0%}.")
    if not dry:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        json.dump(st, open(STATE, "w"))


if __name__ == "__main__":
    main()
