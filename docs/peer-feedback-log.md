# Testing & Feedback Log — Self-Review

No peer reviewer was available within the submission window. Per the course's documented fallback, this is a self-review conducted from a fresh clone (`~/self-review-clone/kijani-capstone`, never touched by the original build), following README.md's Setup section exactly as written. Test plan: docs/test-plan.md.

---

## Issue 1: Terraform state collision on a second clone

**Severity:** Blocks setup

**Issue:** Running `terraform apply -auto-approve` from a fresh clone against the same real Minikube cluster fails with `Error: namespaces "kijani-staging" already exists`. The fresh clone has its own empty local Terraform state, unaware the namespace already exists from the original clone's earlier apply.

**Root cause:** Terraform state is local (`terraform/terraform.tfstate`, gitignored, correctly excluded from version control) rather than backed by a shared remote backend. Two clones — or two team members — working against the same cluster will always collide this way. Already named as a Known Limitation in README.md ("Terraform state is local... not production-appropriate for a team") but not previously demonstrated as a concrete failure.

**Resolution:** Documented here as a known, accepted limitation rather than fixed, since implementing a remote state backend (e.g. MinIO as an S3-compatible backend, following the pattern from Week 4) is out of scope for the remaining build time. Noted explicitly for the Production Gaps slide.

**Evidence:** Full terminal output captured in this session; `terraform apply` error text: `Error: namespaces "kijani-staging" already exists`, `with kubernetes_namespace.staging, on main.tf line 14`.

---

## Issue 2: MinIO receipts bucket is not created by any setup step

**Severity:** Blocks functionality

**Issue:** README.md lists "MinIO running locally as the S3-compatible backend" as a prerequisite but never instructs the reader to create the `kijani-payments-receipts-staging` bucket. A fresh-clone reviewer following the README exactly would hit a `NoSuchBucket` error the first time `kk-receipts` attempts to write a receipt, with no guidance on how to fix it.

**Root cause:** The bucket was created manually and interactively earlier in the build session (`mc mb local/kijani-payments-receipts-staging`) and never added back into the documented setup sequence.

**Resolution:** Add the `mc mb` command to README.md's Setup section, in the MinIO prerequisite step, before the serverless chain is exercised.

**Evidence:** Traced by inspection of README.md Setup section against the actual commands run earlier in this session (not independently reproduced with a real NoSuchBucket error, since the bucket already exists on the shared MinIO instance both clones point at — same underlying cause as Issue 1).

---

## Issue 3: `serverless offline` unusable after following README setup exactly

**Severity:** Blocks functionality (for the verification step specifically)

**Issue:** README.md's Setup section only runs `npm install` inside each function subdirectory (`kk-receipts/`, `kk-processor/`, `kk-notifier/`). It never runs `npm install` at the `serverless/` root, which is where `serverless-offline` — declared as a plugin in `serverless.yml` and required by the "How to verify it works" section's chain test — actually lives as a devDependency. Running `serverless offline start` after following the README exactly fails: `Serverless plugin "serverless-offline" not found.`

**Root cause:** README.md's Setup steps were written to match the individual `npm install` commands run during development, without accounting for the root-level `package.json` added when `serverless-offline` was installed as a devDependency.

**Resolution:** Add `npm install` at the `serverless/` root to README.md's Setup section, before the per-function install steps.

**Evidence:** Reproduced directly in this self-review session. Full error: `Serverless plugin "serverless-offline" not found. Make sure it's installed and listed in the "plugins" section of your serverless config file.`

---

## Summary

Three issues found, all in documentation/setup completeness rather than the underlying infrastructure or application logic. All three are honest gaps between what was actually done during development (interactively, with tribal knowledge) and what the README instructs a fresh reader to do. At least one (Issue 3) will be resolved and committed before submission with a GitHub Issue reference, per the minimum-improvement requirement.
