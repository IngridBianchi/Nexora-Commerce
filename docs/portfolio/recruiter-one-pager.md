# Nexora Commerce - Recruiter One Pager

## 60-second pitch

Nexora Commerce is a production-style serverless e-commerce system designed to show engineering maturity, not just UI output. It includes real payments with Stripe, idempotent reconciliation, security controls, observability with SLOs, and multi-stage CI/CD promotion flow.

This project is attractive for recruiter screens because it demonstrates end-to-end ownership across product, backend architecture, reliability, security, and delivery operations.

## Why this stands out in interviews

- End-to-end scope: frontend, backend, cloud infra, CI/CD, observability, and security hardening.
- Real-world failure handling: payment retries, duplicate webhook events, and operational runbooks.
- Measurable engineering outcomes: explicit KPIs, SLOs, error budget, and documented MTTR drill.
- Strong technical communication: ADRs, postmortems, release checklist, and platform docs.

## High-value achievements (recruiter focus)

### 1) Payments done correctly (not demo-only)

- Stripe Checkout integrated with signed webhook verification.
- Idempotency in session creation and reconciliation to avoid duplicate state mutation.
- Order status lifecycle implemented (`PENDING`, `PAID`, `CANCELLED`).
- Consistency test suite executed in CI for payment-critical paths.

Evidence:
- [ADR-0001 Stripe checkout integration](../adr/0001-stripe-checkout-integration.md)
- [Phase 2 payments consistency evidence](../evidence/phase-2-payments-consistency.md)

### 2) Reliability and operations mindset

- SLO and error budget defined for critical endpoints.
- CloudWatch alarms, EMF metrics, X-Ray traces, and Sentry integration.
- Incident drill performed and documented with MTTR of 18 minutes.
- Runbooks prepared for Lambda errors, latency breaches, and webhook failures.

Evidence:
- [ADR-0003 observability strategy](../adr/0003-observability-strategy.md)
- [SLO and error budget](../observability/slo-error-budget.md)
- [Operational dashboard](../observability/dashboard-operativo.md)
- [Postmortem drill](../postmortems/2026-03-31-stripe-webhook-invalid-signature-drill.md)

### 3) Security as a feature

- OWASP ASVS checklist adapted to project scope.
- Threat model, input validation matrix, and secrets rotation policy documented.
- CI security gates: CodeQL, npm audit (high threshold), gitleaks.

Evidence:
- [OWASP ASVS checklist](../security/owasp-asvs-checklist.md)
- [Threat model](../security/threat-model.md)
- [Input validation matrix](../security/input-validation-matrix.md)
- [Secrets rotation policy](../security/secrets-rotation-policy.md)

### 4) Platform scalability and delivery discipline

- Multi-stage environments (`dev`, `stage`, `prod`) with promotion flow.
- Release checklist and rollback procedure versioned in docs.
- API versioning and migration strategy documented.

Evidence:
- [API versioning and migrations](../platform/api-versioning-and-migrations.md)
- [Release checklist](../release-checklist.md)
- [Phase 5 platform scalability evidence](../evidence/phase-5-platform-scalability.md)

## KPI snapshot for recruiters

| KPI | Result |
|---|---|
| Backend tests | 21 |
| Frontend unit tests | 28 |
| Incident drill MTTR | 18 min |
| Dev/demo monthly cost | ~3 USD |
| Promotion flow | dev -> stage -> prod |
| Payment consistency gate in CI | Implemented |

## Architecture and cost efficiency

- Backend architecture: Lambda + API Gateway + DynamoDB with clean layered design.
- Cloud cost optimized for demo and early-stage traffic while preserving production-like reliability controls.

Evidence:
- [ADR-0002 backend architecture](../adr/0002-backend-architecture.md)
- [AWS cost estimate](../platform/aws-cost-estimate.md)

## How to evaluate this project in 10 minutes

1. Read the portfolio summary in [README](../../README.md).
2. Review architecture and decisions in ADRs.
3. Open payments consistency and observability evidence docs.
4. Check CI workflows for quality, security, and coverage gates.

## Interview-ready narrative

If asked "what did you build and why does it matter?":

"I built a full serverless commerce system that behaves like a production workload. I focused on reliability and correctness in payment flows, including webhook signature verification and idempotent reconciliation. I added SLOs, alarms, runbooks, and a documented incident drill to prove operational readiness, then enforced quality and security through CI gates. The result is a low-cost but high-maturity platform suitable for both demos and real engineering discussions."