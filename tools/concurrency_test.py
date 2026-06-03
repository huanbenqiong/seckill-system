#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
秒杀系统并发压力测试脚本（零依赖，仅用标准库）
----------------------------------------------------------------
对网关读路径 /api/goods/list 做并发压测，测量：
  - 吞吐量 QPS
  - 成功率
  - 时延分布 P50 / P90 / P95 / P99 / Max
支持对多个并发档位做扫描（sweep），输出表格并写入 JSON 供 HTML 报告引用。

用法：
  python tools/concurrency_test.py
  python tools/concurrency_test.py --url http://localhost:8080/api/goods/list --requests 4000
"""
import argparse, json, time, statistics, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime


def one_request(url, timeout):
    """返回 (类别, 耗时ms)。类别: ok / limited(429) / error(5xx等) / timeout"""
    t0 = time.perf_counter()
    cat = "error"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            resp.read()
            cat = "ok" if 200 <= resp.status < 400 else "error"
    except urllib.error.HTTPError as e:
        cat = "limited" if e.code == 429 else "error"
    except Exception:
        cat = "timeout"
    return cat, (time.perf_counter() - t0) * 1000.0  # ms


def pct(sorted_vals, p):
    if not sorted_vals:
        return 0.0
    k = int(round((p / 100.0) * (len(sorted_vals) - 1)))
    return sorted_vals[k]


def run_level(url, concurrency, total, timeout):
    lat = []
    cnt = {"ok": 0, "limited": 0, "error": 0, "timeout": 0}
    oks = []  # 仅成功请求的时延
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futs = [ex.submit(one_request, url, timeout) for _ in range(total)]
        for f in as_completed(futs):
            cat, ms = f.result()
            lat.append(ms)
            cnt[cat] += 1
            if cat == "ok":
                oks.append(ms)
    wall = time.perf_counter() - start
    oks.sort()
    return {
        "concurrency": concurrency,
        "requests": total,
        "ok": cnt["ok"],
        "limited": cnt["limited"],
        "error": cnt["error"],
        "timeout": cnt["timeout"],
        "success_rate": round(cnt["ok"] / total * 100, 2),
        "wall_seconds": round(wall, 3),
        "qps": round(total / wall, 1) if wall > 0 else 0,          # 总处理速率
        "ok_qps": round(cnt["ok"] / wall, 1) if wall > 0 else 0,    # 成功业务吞吐
        "avg_ms": round(statistics.mean(oks), 2) if oks else 0,
        "p50_ms": round(pct(oks, 50), 2),
        "p90_ms": round(pct(oks, 90), 2),
        "p95_ms": round(pct(oks, 95), 2),
        "p99_ms": round(pct(oks, 99), 2),
        "max_ms": round(max(oks), 2) if oks else 0,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8080/api/goods/list")
    ap.add_argument("--requests", type=int, default=3000, help="每个并发档位的总请求数")
    ap.add_argument("--levels", default="20,50,100,200", help="并发档位，逗号分隔")
    ap.add_argument("--timeout", type=float, default=10.0)
    ap.add_argument("--out", default="tools/concurrency_result.json")
    args = ap.parse_args()

    levels = [int(x) for x in args.levels.split(",") if x.strip()]

    print("=" * 64)
    print(" 秒杀系统并发压力测试")
    print(f" 目标: {args.url}")
    print(f" 每档请求数: {args.requests}   并发档位: {levels}")
    print("=" * 64)

    # 预热
    print("预热中 ...")
    for _ in range(20):
        one_request(args.url, args.timeout)

    results = []
    print(f"\n{'并发':>5} {'OK-QPS':>9} {'成功':>7} {'限流429':>8} {'错误':>6} {'P95(ms)':>9} {'P99(ms)':>9}")
    print("-" * 70)
    for c in levels:
        r = run_level(args.url, c, args.requests, args.timeout)
        results.append(r)
        print(f"{r['concurrency']:>5} {r['ok_qps']:>9} {r['ok']:>7} {r['limited']:>8} "
              f"{r['error']+r['timeout']:>6} {r['p95_ms']:>9} {r['p99_ms']:>9}")
        time.sleep(0.5)

    peak = max(results, key=lambda x: x["ok_qps"])
    summary = {
        "url": args.url,
        "tested_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "peak_ok_qps": peak["ok_qps"],
        "peak_concurrency": peak["concurrency"],
        "total_errors": sum(r["error"] + r["timeout"] for r in results),
        "best_p95_ms": min(r["p95_ms"] for r in results if r["ok"] > 0),
        "levels": results,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("-" * 70)
    print(f"峰值成功吞吐: {peak['ok_qps']} QPS  @ 并发 {peak['concurrency']}")
    print(f"5xx/超时错误总数: {summary['total_errors']}（0 表示系统全程未崩溃）")
    print(f"结果已写入: {args.out}")


if __name__ == "__main__":
    main()
