# Test Plan — Self-Review

No peer reviewer was available within the submission window; this is a documented self-review per the course's stated fallback, run from a fresh clone with no pre-set environment state.

## Fresh setup
- Clone the repo into a directory that has never seen it before.
- Follow README.md Setup section exactly as written, no prior knowledge assumed.

## Happy path
- terraform apply -> ansible-playbook -> kubectl apply -> kubectl rollout status
- Trigger Jenkins pipeline, confirm staging deploy -> smoke test -> approval gate pause.

## Failure path
- Deliberately omit a step from the README (e.g. skip `terraform init`) and confirm the error message a reviewer would see is informative enough to self-correct.

## AI governance check
- Read docs/ai-governance-log.md as a skeptical reviewer: does each entry's "what it got wrong" field describe a real, specific gap, or is it vague/generic?
