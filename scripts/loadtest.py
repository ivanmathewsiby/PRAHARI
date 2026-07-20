"""
Small PRAHARI demo load test.

Runs concurrent incident submissions against the current backend CRUD endpoint.
Mit's /api/analyze ownership is intentionally not implemented here.
"""
import argparse
import concurrent.futures
import statistics
import time
import urllib.error
import urllib.request
import json


PAYLOAD = {
    "citizen_name": "Load Test Citizen",
    "phone_number": "9000000000",
    "transcript": "CBI warning. Do not tell family. Transfer Rs.85000 to cbi.verify@upi.",
    "location": "Load Test",
}


def post_incident(base_url: str) -> float:
    started = time.perf_counter()
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/incidents",
        data=json.dumps(PAYLOAD).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        if response.status >= 400:
            raise RuntimeError(f"HTTP {response.status}")
        response.read()
    return (time.perf_counter() - started) * 1000


def percentile(values, pct):
    if not values:
        return 0
    values = sorted(values)
    index = min(len(values) - 1, int(round((pct / 100) * (len(values) - 1))))
    return values[index]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--requests", type=int, default=100)
    parser.add_argument("--concurrency", type=int, default=20)
    args = parser.parse_args()

    latencies = []
    failures = 0
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [pool.submit(post_incident, args.url) for _ in range(args.requests)]
        for future in concurrent.futures.as_completed(futures):
            try:
                latencies.append(future.result())
            except (urllib.error.URLError, RuntimeError, TimeoutError) as exc:
                failures += 1
                print(f"request failed: {exc}")

    elapsed = time.perf_counter() - started
    print("PRAHARI load test")
    print(f"requests: {args.requests}")
    print(f"concurrency: {args.concurrency}")
    print(f"success: {len(latencies)}")
    print(f"failures: {failures}")
    print(f"throughput: {len(latencies) / elapsed:.2f} req/s")
    print(f"median latency: {statistics.median(latencies) if latencies else 0:.1f} ms")
    print(f"p95 latency: {percentile(latencies, 95):.1f} ms")


if __name__ == "__main__":
    main()
