# KijaniKiosk Capstone -- Track A: Infrastructure-First

## What is this?

Extends KijaniKiosk's `kk-payments` service into a multi-environment, monitored, production-approaching system. A `kijani-staging` namespace, provisioned by Terraform and configured by Ansible, sits isolated from the existing `kijani-project` production namespace. A Jenkins pipeline deploys to staging automatically, runs a smoke test, and only offers a human approval gate before production deployment. A three-function serverless receipt chain (`kk-receipts` -> `kk-processor` -> `kk-notifier`) fires on every successful payment, proving the async processing path required by both capstone tracks.

## Architecture

```
PR merge -> Jenkins: Deploy to Staging (auto) -> Smoke Test
         -> Approval Gate (input step, submitter: giovess) -> Deploy to Production

kijani-staging namespace (Terraform: kubernetes provider + kubernetes_namespace
                           Ansible: kubernetes.core.k8s, ConfigMap)
  |-- kk-payments (2 replicas, probes, resource limits)
       |-- writes receipt JSON to MinIO bucket (kijani-payments-receipts-staging)
       `-- triggers the receipt chain via direct HTTP call:
            kk-receipts (writes to S3/MinIO)
              `-- kk-processor (logs processed record)
                   `-- kk-notifier (logs chain completion)

kijani-project namespace (existing, Week 9) -- production target for the same
                           kk-payments Deployment/Service, gated by the
                           Jenkins approval step
```

Every arrow above is a real, tested connection -- see `docs/screenshots/` for the approval gate in action and the commit history for each function's individual verification.

## Prerequisites

- Ubuntu 22.04+ host (built and tested on Ubuntu 26.04)
- VirtualBox + Vagrant (for the underlying KijaniKiosk VM environment from prior weeks)
- Minikube (docker driver) -- `minikube start --driver=docker`
- kubectl
- Terraform ~> 1.x with the `hashicorp/kubernetes` provider
- Ansible with the `kubernetes.core` collection (`ansible-galaxy collection install kubernetes.core`) and the Python `kubernetes` client (`pip install kubernetes --break-system-packages`)
- Docker (for Jenkins and MinIO containers)
- Node.js 20+ (Node 22 used in development; `serverless.yml` targets `nodejs20.x`)
- Serverless Framework **v3** specifically -- `npm install -g serverless@3`. v4 requires an account login even for local `invoke local`/`offline` commands, which is unnecessary friction for a fully local dev workflow.
- MinIO running locally as the S3-compatible backend (`docker run` with `minioadmin`/`minioadmin` credentials, or reuse the existing `minio` container from earlier course weeks)

## Setup

```bash
git clone https://github.com/GIOVESS/kijani-capstone.git
cd kijani-capstone

# Infrastructure layer
cd terraform
terraform init
terraform apply -auto-approve
cd ..
ansible-playbook ansible/playbook.yml

# Runtime layer
kubectl apply -f k8s/kk-payments-deployment.yaml
kubectl apply -f k8s/kk-payments-service.yaml
kubectl rollout status deployment/kk-payments -n kijani-staging

# Serverless chain
cd serverless
npm install -g serverless@3
cd kk-receipts && npm install && cd ..
cd kk-processor && npm install && cd ..
cd kk-notifier && npm install && cd ..
```

**Known manual step (not yet IaC-managed):** Jenkins needs `kubectl` installed inside the container and a flattened kubeconfig copied to `/var/jenkins_home/.kube/config`, plus the container attached to Minikube's Docker network (`docker network connect minikube jenkins-local`). This is documented as a Production Gap -- see below.

## How to run the pipeline

1. Push a commit to `main` on this repository.
2. Trigger the Jenkins job `kijani-capstone-pipeline` (Build Now, or SCM polling if configured).
3. Pipeline stages run in order: **Deploy to Staging** -> **Smoke Test** -> **Approve Production Deployment** (pauses here) -> **Deploy to Production**.
4. At the approval stage, a named Jenkins user (`giovess`) must enter an `APPROVAL_REASON` and click Deploy. The pipeline will not proceed without this.

## How to verify it works

```bash
# Confirm staging namespace and pods
kubectl get namespace kijani-staging
kubectl get pods -n kijani-staging

# Confirm the ConfigMap has the staging-specific DB_HOST
kubectl get configmap kk-payments-config -n kijani-staging -o yaml

# Fire the full serverless chain (from serverless/)
serverless invoke local --function generateReceipt \
  --data '{"body":"{\"orderId\":\"ORD-VERIFY\",\"amount\":100}"}'
# Expected: receipt.generated -> processor.notified in this terminal,
# and (if `serverless offline start --httpPort 3002 --lambdaPort 3003 --host 0.0.0.0`
# is running in another terminal) processor.received -> receipt.processed
# -> chain.complete -> notifier.notified in that terminal.
```

Pipeline success criteria: `kubectl rollout status` returns exit 0 after every merge to `main`, and the approval gate correctly blocks the "Deploy to Production" stage until a named user provides an `APPROVAL_REASON`.

## Known limitations

- **Jenkins-to-cluster authentication is hand-provisioned, not IaC-managed.** The kubeconfig copied into the Jenkins container will go stale if `minikube delete && minikube start` is ever run (cluster certs rotate). Production fix: a Kubernetes ServiceAccount token or a proper CI credential-injection step, not a copied admin kubeconfig.
- **Serverless chain trigger is direct HTTP invocation, not S3 event notification.** MinIO's `notify_webhook` target accepted `enable=on` via `mc admin config set` but the setting didn't persist on the named target across repeated attempts in this MinIO version -- a config-persistence issue, not a networking one (endpoint connectivity was independently confirmed). Direct chaining (`kk-receipts` calls `kk-processor` calls `kk-notifier` via plain HTTP) was substituted; documented in `docs/ai-governance-log.md` Entry 1. Trade-off: no dead-letter queue or retry if a downstream function is unavailable at call time.
- **The applying Terraform credential (local kubeconfig) has unscoped cluster-admin access**, not a purpose-scoped ServiceAccount -- flagged in the governance log Entry 2 as a least-privilege gap.
- **No Prometheus alerting configured yet** -- Track A allows a log-based error-rate alternative (Week 7 pattern); not yet implemented in this repository as of this commit.
- **Terraform state is local**, not backed by the MinIO S3-compatible backend used in earlier course weeks -- acceptable for a single-developer capstone build, not production-appropriate for a team.
