/**
 * Load Test Script for Slipper8s
 *
 * Simulates concurrent users hitting the leaderboard and other endpoints.
 * Spec requirement: "Simulate 1,000 simultaneous leaderboard requests before launch."
 *
 * Usage:
 *   npx tsx scripts/load-test.ts [baseUrl] [concurrency]
 *
 * Examples:
 *   npx tsx scripts/load-test.ts                              # defaults: localhost:3000, 100 concurrent
 *   npx tsx scripts/load-test.ts https://slipper8s.vercel.app 1000
 */

const BASE_URL = process.argv[2] || "http://localhost:3000"
const CONCURRENCY = parseInt(process.argv[3] || "100", 10)

interface TestResult {
  endpoint: string
  status: number
  latencyMs: number
  error?: string
}

async function fetchWithTiming(url: string): Promise<TestResult> {
  const start = performance.now()
  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    })
    const latencyMs = Math.round(performance.now() - start)
    return { endpoint: url, status: res.status, latencyMs }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    return {
      endpoint: url,
      status: 0,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

async function runTest(label: string, url: string, count: number) {
  console.log(`\n🔄 ${label}: ${count} concurrent requests to ${url}`)
  const start = performance.now()

  const results = await Promise.all(
    Array.from({ length: count }, () => fetchWithTiming(url))
  )

  const totalMs = Math.round(performance.now() - start)
  const latencies = results.map((r) => r.latencyMs)
  const successes = results.filter((r) => r.status >= 200 && r.status < 300)
  const failures = results.filter((r) => r.status < 200 || r.status >= 300)
  const errors = results.filter((r) => r.error)

  console.log(`   ✅ ${successes.length}/${count} succeeded (${failures.length} failed, ${errors.length} network errors)`)
  console.log(`   ⏱  Total wall time: ${totalMs}ms`)
  console.log(`   📊 Latency — min: ${Math.min(...latencies)}ms | p50: ${percentile(latencies, 50)}ms | p95: ${percentile(latencies, 95)}ms | p99: ${percentile(latencies, 99)}ms | max: ${Math.max(...latencies)}ms`)
  console.log(`   📈 Throughput: ${Math.round((count / totalMs) * 1000)} req/s`)

  if (errors.length > 0) {
    const uniqueErrors = [...new Set(errors.map((e) => e.error))]
    console.log(`   ⚠️  Errors: ${uniqueErrors.slice(0, 3).join(", ")}`)
  }

  return { label, count, totalMs, successes: successes.length, failures: failures.length, latencies }
}

async function main() {
  console.log("=" .repeat(60))
  console.log("  Slipper8s Load Test")
  console.log(`  Target: ${BASE_URL}`)
  console.log(`  Concurrency: ${CONCURRENCY}`)
  console.log("=" .repeat(60))

  // Warmup
  console.log("\n⏳ Warming up...")
  await fetch(`${BASE_URL}/api/settings`).catch(() => {})

  const results = []

  // Test 1: Leaderboard API (critical path — spec says 1,000 simultaneous)
  results.push(await runTest("Leaderboard API", `${BASE_URL}/api/leaderboard`, CONCURRENCY))

  // Test 2: Settings API (lightweight, frequent)
  results.push(await runTest("Settings API", `${BASE_URL}/api/settings`, Math.min(CONCURRENCY, 500)))

  // Test 3: Teams API
  results.push(await runTest("Teams API", `${BASE_URL}/api/teams`, Math.min(CONCURRENCY, 200)))

  // Test 4: Landing page (static, should be fastest)
  results.push(await runTest("Landing Page", BASE_URL, Math.min(CONCURRENCY, 200)))

  // Test 5: Scores API
  results.push(await runTest("Scores API", `${BASE_URL}/api/scores`, Math.min(CONCURRENCY, 200)))

  // Summary
  console.log("\n" + "=" .repeat(60))
  console.log("  SUMMARY")
  console.log("=" .repeat(60))

  let allPassed = true
  for (const r of results) {
    const successRate = Math.round((r.successes / r.count) * 100)
    const p95 = percentile(r.latencies, 95)
    const status = successRate >= 95 && p95 < 5000 ? "✅ PASS" : "❌ FAIL"
    if (status.includes("FAIL")) allPassed = false
    console.log(`  ${status}  ${r.label}: ${successRate}% success, p95=${p95}ms`)
  }

  console.log("\n" + (allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"))
  console.log(`  Criteria: ≥95% success rate, p95 < 5000ms`)

  process.exit(allPassed ? 0 : 1)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
