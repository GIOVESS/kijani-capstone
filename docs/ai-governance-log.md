# AI Governance Log

Entries follow the Week 10 eight-field format. Every entry names what the AI got wrong — a correct-only entry is not a complete entry.

---

## Entry 1: MinIO webhook notification troubleshooting

**Date:** 2026-08-14

**Tool used:** Claude (Sonnet, via claude.ai)

**Task description:** Wire kk-receipts to trigger kk-processor automatically on S3 object creation, using MinIO's `notify_webhook` bucket-event system as the local equivalent of AWS S3 event notifications.

**What was provided to the AI:** Terminal output from each `mc admin config set`, `mc admin config get`, `mc event add`, and `docker` command run against the MinIO container, plus a stated time constraint ("finish in the next few hours").

**What the AI produced:** A sequence of `mc admin config set` commands to configure `notify_webhook:primary` (endpoint, then `enable=on`), instructions to restart the container and re-check config state, an ARN guess (`arn:minio:sqs::primary:webhook`) for `mc event add`, and diagnostic steps (checking `ss`, `lsof`, Docker network gateways) when earlier attempts failed with connection-refused and EADDRINUSE errors.

**What it got right:** Correctly diagnosed two real infrastructure bugs along the way: (1) `serverless offline` was bound to `127.0.0.1` only, invisible to Docker containers, fixed with `--host 0.0.0.0`; (2) `serverless.yml` declared `nodejs18.x` but the host runs Node 22, causing `serverless-offline`'s local runtime emulation to fail — fixed by aligning `provider.runtime` to `nodejs20.x`. Both fixes were correct and necessary regardless of the webhook path's outcome.

**What it got wrong:** The AI assumed MinIO's `notify_webhook:primary enable=on` field would persist the way `endpoint` did, based on typical MinIO config-set semantics, and spent multiple round-trips debugging around that assumption before recognizing the field simply wasn't sticking on the named target in this MinIO version — a possible version-specific quirk that wasn't investigated further before pivoting. The ARN guess (`arn:minio:sqs::primary:webhook`) was never actually validated as correct, since the `enable` blocker was hit first; it may or may not have been right.

**What you changed before applying the output:** Abandoned the webhook-notification approach entirely under time pressure rather than continuing to debug the `enable` field, and had the AI redesign the trigger mechanism as direct HTTP chaining (kk-receipts calls kk-processor calls kk-notifier via plain HTTP POST, no MinIO event system involved). This was a deliberate scope change, not a bug fix — verified working end-to-end immediately after the pivot, five log lines confirming all three functions fired correctly in sequence.

---

## Entry 2: Six-point governance checklist applied to terraform/main.tf

**Date:** 2026-08-14

**Tool used:** Claude (Sonnet, via claude.ai)

**Task description:** Apply the Week 10 six-point governance checklist to the Terraform module (terraform/main.tf, variables.tf, outputs.tf) that provisions the kijani-staging namespace, ahead of using it as production-adjacent infrastructure.

**What was provided to the AI:** The full contents of main.tf, variables.tf, and outputs.tf as written earlier in this build session.

**What the AI produced:**

| Control | Assessed | Finding |
|---|---|---|
| 1. Least privilege | Gap | `kubeconfig_path` defaults to `~/.kube/config`, which for a Minikube cluster carries cluster-admin credentials with no scoping. Terraform apply runs with full cluster privileges to create one namespace. |
| 2. Encryption at rest/transit | N/A | No data-at-rest resource is created (a Namespace has no storage). Transit encryption depends on the kubeconfig's TLS settings, which this module doesn't configure or verify. |
| 3. No hardcoded secrets | Pass | No credentials appear in any .tf file; the kubeconfig path is parameterized, not embedded. |
| 4. Naming and tagging | Pass | Namespace name (`kijani-staging`) follows the environment-prefixed convention; `environment` and `managed-by` labels are present. |
| 5. Auditability and logging | Gap | No audit trail beyond Terraform's own state file records namespace creation. No Kubernetes audit-log configuration is referenced or assumed. |
| 6. Data residency | N/A | Local Minikube cluster; no cloud region or jurisdictional boundary applies. |

**What it got right:** Naming/tagging and secrets-handling assessments are accurate and specific — the module genuinely has no hardcoded values and does follow the naming table from the docs.

**What it got wrong:** The first draft of this checklist marked control 1 (least privilege) as N/A on the reasoning that "a namespace resource has no IAM policy attached," missing that the *credential used to apply the module* (the local kubeconfig) is the actual privilege surface, not the resource itself. This is a meaningful miss: the checklist exists to catch exactly this kind of scope creep, and treating "no IAM block in this file" as equivalent to "no privilege concern" would have let a real gap through unflagged.

**What you changed before applying the output:** Corrected control 1 from N/A to Gap, with the specific finding above about `~/.kube/config` carrying unscoped cluster-admin access rather than a purpose-scoped ServiceAccount token.

