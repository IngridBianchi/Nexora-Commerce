# Runbook: Lambda Latency SLO Breach

**Alarm:** `nexora-backend-{stage}-{function}-latency-p95`  
**Severity:** Medium  
**SLO:** `getProducts` p95 < 500 ms | `createOrder` p95 < 800 ms | `createCheckoutSession` p95 < 2000 ms

---

## What fired

The p95 duration of a Lambda function exceeded its SLO threshold for 3 consecutive 5-minute periods (15 min sustained breach).

---

## Immediate diagnosis

```bash
# View p95 latency for the last hour in CloudWatch Insights
aws logs start-query \
  --log-group-name /aws/lambda/nexora-backend-dev-getProducts \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'stats pct(@duration, 95) as p95, avg(@duration) as avg, count() as invocations by bin(5m)' \
  --region us-east-1
```

Or in AWS Console: **CloudWatch → Metrics → Lambda → By Function Name → Duration → p95**

Check for:
1. **Cold starts** — `@initDuration` present in logs → expected spike, monitor trend
2. **DynamoDB throttling** — look for `ProvisionedThroughputExceededException` in logs
3. **Stripe API latency** — check `createCheckoutSession` logs for Stripe call duration
4. **X-Ray trace** — open **X-Ray → Traces**, filter by function, identify slow segment

---

## Common causes & fixes

| Cause | Signal | Fix |
|---|---|---|
| DynamoDB throttling | `ProvisionedThroughputExceededException` | Switch table to on-demand billing mode or raise capacity |
| Stripe API slow | `createCheckoutSession` p95 > threshold | Transient — monitor. If sustained, check Stripe status page |
| Cold start spike | `@initDuration` in logs, low traffic | Expected — configure provisioned concurrency if SLO critical |
| N+1 DynamoDB queries | X-Ray trace shows many DynamoDB segments | Refactor to batch queries |
| Large payload scan | `Scan` on large table | Add pagination / filter pushdown |

---

## Resolution checklist

- [ ] Identify affected function and time window
- [ ] Check X-Ray trace for slow segment
- [ ] Apply fix or escalate
- [ ] Confirm alarm returns to OK (may take 15 min after fix)
- [ ] Document if SLO breached > 1 hour
