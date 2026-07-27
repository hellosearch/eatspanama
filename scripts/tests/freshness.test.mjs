import { monthsSince, freshnessOf } from "../../src/lib/freshness.ts";
const cases = [
  ["2026-07", "2026-07-19", 0, "fresh"],
  ["2026-06", "2026-07-19", 1, "fresh"],
  ["2026-04", "2026-07-19", 3, "aging"],
  ["2026-02", "2026-07-19", 5, "aging"],
  ["2026-01", "2026-07-19", 6, "stale"],
  ["2025-07", "2026-07-19", 12, "stale"],
  ["2026-12", "2027-03-01", 3, "aging"],
  [undefined, "2026-07-19", null, "stale"],
  ["garbage", "2026-07-19", null, "stale"],
  ["2026-13", "2026-07-19", null, "stale"],
  ["2026-08", "2026-07-19", 0, "fresh"],
];
let fail = 0;
for (const [stamp, nowStr, wantM, wantL] of cases) {
  const now = new Date(nowStr + "T12:00:00");
  const m = monthsSince(stamp, now), l = freshnessOf(stamp, now);
  const ok = m === wantM && l === wantL;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${String(stamp)} @ ${nowStr} -> months=${m} (want ${wantM}), ${l} (want ${wantL})`);
}
console.log(fail ? `\n${fail} FAILURES` : "\nall passed");
process.exit(fail ? 1 : 0);
