# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 1.0.x | Yes |

## Reporting a Vulnerability

Please do not open a public issue for security problems.

Use GitHub Security Advisories in this repository:

1. Open the repository **Security** tab.
2. Choose **Report a vulnerability**.
3. Include reproduction steps, affected endpoints, and expected impact.

We will acknowledge the report within 3 business days and coordinate a fix and disclosure timeline.

## Scope

In scope:

- Tenant isolation bypass
- Authentication and authorization flaws
- Plan or feature gate bypass
- XSS, injection, path traversal, unsafe file upload
- Webhook signature or payment state issues
- Sensitive data exposure

Out of scope:

- Demo accounts and seeded data
- Rate limits on local development instances
- Findings that require a compromised host or browser extension

## Handling Secrets

Never commit `.env`, database files, uploads, API keys, or payment credentials. Use the deployment platform's secret manager. If a secret is exposed, rotate it immediately.
