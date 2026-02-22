# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AgentMarKB, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please use one of the following methods:

1. **GitHub Security Advisories** — Report via the [Security Advisories](https://github.com/carlotorniai/agentmarkb/security/advisories/new) page on GitHub (preferred)
2. **Email** — Contact the maintainer directly

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected components (extension code, native host, content scripts)
- Potential impact
- Suggested fix (if any)

### Scope

The following components are in scope:

- **Chrome extension code** — service worker, popup, options page, content scripts
- **Native messaging host** — `kb_host.py` and install/uninstall scripts
- **Content scripts** — platform-specific extractors and injected libraries
- **Build/install scripts** — `install.sh`, `generate_icons.py`

### Response Timeline

- **Acknowledgment** — Within 48 hours
- **Initial assessment** — Within 1 week
- **Fix and disclosure** — Coordinated with the reporter

## Security Considerations

AgentMarKB is designed to be local-first and privacy-respecting:

- No data is sent to external servers
- The native host only accesses paths explicitly configured by the user
- Content scripts only run on pages the user actively visits
- No telemetry, analytics, or tracking
- File operations use atomic writes and file locking to prevent corruption
