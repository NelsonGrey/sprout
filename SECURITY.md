# Security Policy

## Supported Versions

This repository holds the Sprout Streak web and mobile client. Only the code currently deployed on each environment branch is supported — there is no long-term support for older commits.

| Branch | Environment | Status |
|---|---|---|
| `main` | Production | Supported |
| `staging` | Staging | Supported |
| `develop` | Development | Supported |

## Reporting a Vulnerability

This repository doesn't have a public issue tracker, so please don't report security concerns that way. Use one of:

- GitHub's [private vulnerability reporting](https://github.com/NelsonGrey/sprout/security/advisories/new) (enabled on this repo), or
- Email **security@nelsongrey.com** (or **support@nelsongrey.com**)

Either way, include:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof of concept if available
- Any relevant logs, request/response samples, or affected endpoints

You should get an acknowledgement within a few business days.

## Automated Dependency Scanning

Dependabot alerts and security updates, native GitHub secret scanning (with push protection), and code scanning (CodeQL) are all enabled on this repository. A gitleaks-based secret scan also runs in CI on every pull request. Avoid committing credentials or secrets regardless — runtime secrets are managed via Firebase Secret Manager / GitHub Actions secrets, never committed to source.
