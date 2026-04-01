# Runbook: Stripe Webhook Failures

**Alarm:** `nexora-backend-{stage}-stripeWebhook-errors`  
**Severity:** High — failed webhooks mean orders stuck in PENDING  
**SLO impact:** Yes

---

## What fired

The `stripeWebhook` Lambda is returning errors or Stripe is not receiving a `2xx` response (visible in Stripe Dashboard → Webhooks → delivery logs).

---

## Immediate diagnosis

```bash
# Check Lambda logs for the webhook function
npx serverless logs -f stripeWebhook --stage dev --region us-east-1 --startTime 30m
```

Also check **Stripe Dashboard → Developers → Webhooks → your endpoint → Recent deliveries** for HTTP status codes.

---

## Common causes & fixes

| Symptom | Cause | Fix |
|---|---|---|
| `400 Invalid Stripe signature` | Wrong webhook secret in SSM | Re-upload correct secret (see below) |
| `500 Internal Server Error` | DynamoDB write failed | Check IAM permissions and table existence |
| Lambda timeout | Cold start + slow DynamoDB | Increase function timeout to 10s |
| Orders stuck in PENDING after payment | Webhook not reaching Lambda | Verify endpoint URL in Stripe Dashboard matches API GW URL |

### Re-uploading webhook secret

```powershell
$wh = Read-Host "Stripe Webhook Secret (whsec_...)" -AsSecureString
$whPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($wh))
aws ssm put-parameter --name "/nexora/dev/stripe/webhook_secret" `
  --value $whPlain --type SecureString --overwrite --region us-east-1
Remove-Variable wh, whPlain

# Then redeploy to pick up new SSM value
cd app/backend
npx serverless deploy --stage dev
```

### Manually reconcile stuck orders

If orders are stuck PENDING after a successful Stripe payment, manually update their status:

```bash
# Find the orderId from the Stripe session metadata in the webhook delivery log
aws dynamodb update-item \
  --table-name Products \
  --key '{"PK":{"S":"ORDER#ORDER_ID_HERE"},"SK":{"S":"DETAILS"}}' \
  --update-expression "SET #s = :paid" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":paid":{"S":"PAID"}}' \
  --region us-east-1
```

---

## Stripe test event

Trigger a test event from Stripe to validate the endpoint is healthy:

**Stripe Dashboard → Developers → Webhooks → your endpoint → Send test event → `checkout.session.completed`**

Expected: `200 OK` response with `{"message":"Webhook processed",...}` in delivery logs.

---

## Resolution checklist

- [ ] Root cause identified (signature, IAM, timeout, URL mismatch)
- [ ] Fix applied and Lambda redeployed if needed
- [ ] Test event from Stripe returns 200
- [ ] Stuck PENDING orders manually reconciled if any
- [ ] Alarm returned to OK
