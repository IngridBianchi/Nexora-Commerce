# Runbook: Lambda Errors Alarm

**Alarm:** `nexora-backend-{stage}-{function}-errors`  
**Severity:** High  
**SLO impact:** Yes — any Lambda error counts against error budget

---

## What fired

A Lambda function returned an unhandled exception (AWS `Errors` metric ≥ 1 in a 5-minute window). This is a runtime crash, **not** a 4xx validation error — those are handled gracefully by the code.

---

## Immediate diagnosis

```bash
# Replace FUNCTION_NAME with: getProducts | createOrder | createCheckoutSession | stripeWebhook
npx serverless logs -f FUNCTION_NAME --stage dev --region us-east-1 --startTime 15m | grep -E '"level":"ERROR"|errorMessage'
```

Or in AWS Console: **CloudWatch → Log groups → `/aws/lambda/nexora-backend-dev-FUNCTION_NAME`**  
Filter: `{ $.level = "ERROR" }`

---

## Common causes & fixes

| Symptom in logs | Likely cause | Action |
|---|---|---|
| `AccessDeniedException` on DynamoDB | IAM role missing permission | Add action to `serverless.yml` IAM block and redeploy |
| `ResourceNotFoundException` | Table name env var wrong | Check `PRODUCTS_TABLE` / `ORDERS_TABLE` in Lambda env |
| `StripeAuthenticationError` | Stripe key invalid or rotated | Re-upload key to SSM: `aws ssm put-parameter --name "/nexora/dev/stripe/secret_key" --value NEW_KEY --type SecureString --overwrite` then redeploy |
| `Cannot read properties of undefined` | Code bug — check release | Roll back: `npx serverless rollback --stage dev` |
| Cold start timeout | Lambda timeout too low | Increase `timeout:` in `serverless.yml` for that function |

---

## Escalation

If errors persist > 15 min after fix, page on-call engineer and open a postmortem issue.

---

## Resolution checklist

- [ ] Root cause identified in CloudWatch logs
- [ ] Fix deployed or rolled back
- [ ] Alarm returned to OK state
- [ ] Issue documented in `/docs/postmortems/` if duration > 30 min
