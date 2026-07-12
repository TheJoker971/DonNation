# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| main / feature branches | active development |

## Reporting a Vulnerability

Please report security issues privately to the project maintainers (course project — contact via your usual team channel).

Do not open public issues for undisclosed vulnerabilities.

## Practices

- Secrets must stay in `.env` files (never committed).
- Rotate `JWT_SECRET`, `WALLET_ENCRYPTION_KEY`, and Stripe keys before production.
- Association/admin password reset tokens expire after 1 hour.
