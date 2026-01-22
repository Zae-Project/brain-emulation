# Security Policy

## Project Status

Brain Emulation is currently in **research phase** (pre-v1.0). While we take security seriously, this project is intended for educational and research purposes, not production deployment.

---

## Supported Versions

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| main    | :white_check_mark: | Active development |
| < 1.0   | :x:                | Pre-release, no security guarantees |

**Note**: Once v1.0 is released, we will establish a formal security update policy.

---

## Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities. **Please do not open public GitHub issues for security concerns.**

### How to Report

**Email**: [security@todosloscobardesdelvalle.com](mailto:security@todosloscobardesdelvalle.com)

**Subject Line**: `[SECURITY] Brain Emulation - Brief Description`

### What to Include

Please provide:

1. **Description**: Clear description of the vulnerability
2. **Impact**: What could an attacker achieve?
3. **Reproduction Steps**: Step-by-step instructions to reproduce
4. **Affected Components**: Which files/modules are affected
5. **Suggested Fix** (optional): If you have ideas for mitigation
6. **Your Contact Info**: For follow-up questions

### Example Report

```
Subject: [SECURITY] Brain Emulation - WebSocket Command Injection

Description:
The WebSocket server in server.py does not validate command types,
allowing arbitrary JSON commands to be executed.

Impact:
An attacker could inject malicious commands to manipulate network
parameters or cause denial of service.

Reproduction:
1. Connect to WebSocket server at ws://localhost:9001
2. Send: {"cmd": "__import__", "value": "os"}
3. Server executes arbitrary Python code

Affected Components:
- server.py, lines 238-350 (WebSocket handler)

Suggested Fix:
Implement command whitelist and JSON schema validation.
```

---

## Response Timeline

- **Acknowledgment**: Within **48 hours** of report
- **Initial Assessment**: Within **1 week**
- **Fix Development**: Depends on severity (see below)
- **Public Disclosure**: **90 days** after patch release (coordinated disclosure)

### Severity Levels

| Severity | Fix Timeline | Example |
|----------|--------------|---------|
| **Critical** | 7 days | Remote code execution, data exfiltration |
| **High** | 30 days | Authentication bypass, privilege escalation |
| **Medium** | 60 days | Information disclosure, denial of service |
| **Low** | 90 days | Minor configuration issues, non-exploitable bugs |

---

## Security Considerations

### Current Security Features

✅ **What We Have**:
- WebSocket server with localhost binding by default
- Basic input validation for network parameters
- JSON message format for structured communication

❌ **What We're Missing** (known limitations):
- No authentication mechanism for WebSocket connections
- No rate limiting for commands
- No encryption for WebSocket traffic (use WSS in production)
- No input sanitization for JSON commands
- No audit logging
- No session management

### Known Limitations

This project is a **research tool** with the following security limitations:

1. **No Authentication**: WebSocket server accepts all connections
   - **Risk**: Anyone on localhost can connect and control the simulation
   - **Mitigation**: Do not expose the server to untrusted networks

2. **No Input Validation**: Commands are not fully validated
   - **Risk**: Malformed JSON could crash the server
   - **Mitigation**: Use only trusted clients

3. **No Rate Limiting**: No protection against DoS attacks
   - **Risk**: Rapid command injection could overwhelm the server
   - **Mitigation**: Deploy behind a proxy with rate limiting

4. **No Encryption**: Data transmitted in plaintext
   - **Risk**: Network eavesdropping possible
   - **Mitigation**: Use WSS (WebSocket Secure) for sensitive deployments

### Threat Model

**What we protect against**:
- Accidental misconfigurations
- Basic input validation errors
- Unintended network exposure

**What we DON'T protect against** (not in scope for research phase):
- Determined attackers with network access
- Insider threats
- Social engineering
- Physical access attacks
- Supply chain attacks

---

## Secure Deployment Recommendations

If you must deploy this in a less-trusted environment:

### 1. Network Isolation

```bash
# Bind only to localhost (default)
# server.py line 397: websockets.serve(handler, "127.0.0.1", 9001)

# Do NOT expose to 0.0.0.0 without authentication
```

### 2. Use WSS (WebSocket Secure)

```python
import ssl

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain('cert.pem', 'key.pem')

await websockets.serve(handler, "127.0.0.1", 9001, ssl=ssl_context)
```

### 3. Implement Rate Limiting

```python
from collections import defaultdict
import time

rate_limiter = defaultdict(list)

def check_rate_limit(client_id, max_requests=10, window=1.0):
    now = time.time()
    # Remove old requests outside window
    rate_limiter[client_id] = [t for t in rate_limiter[client_id] if now - t < window]

    if len(rate_limiter[client_id]) >= max_requests:
        return False  # Rate limit exceeded

    rate_limiter[client_id].append(now)
    return True
```

### 4. Add Authentication

```python
import secrets

API_KEYS = {"your-secret-key-here"}

async def authenticate(websocket):
    auth_msg = await websocket.recv()
    auth_data = json.loads(auth_msg)
    return auth_data.get("api_key") in API_KEYS
```

---

## Security Roadmap

Planned security improvements for future versions:

### v0.9 (Pre-release hardening)
- [ ] JSON schema validation for all commands
- [ ] Rate limiting implementation
- [ ] Basic API key authentication
- [ ] Audit logging for all commands

### v1.0 (Production-ready)
- [ ] WSS (TLS/SSL) support
- [ ] Session management
- [ ] Role-based access control (RBAC)
- [ ] Comprehensive input sanitization
- [ ] Security documentation and threat modeling

### v1.5 (Advanced security)
- [ ] JWT-based authentication
- [ ] OAuth2 integration
- [ ] Intrusion detection system
- [ ] Security audit trail
- [ ] Automated vulnerability scanning

---

## Responsible Disclosure

We follow a **coordinated disclosure** policy:

1. **Report received** → We acknowledge within 48 hours
2. **Vulnerability confirmed** → We develop a fix
3. **Patch released** → We notify you before public release
4. **Public disclosure** → 90 days after patch, or earlier with agreement

### Recognition

Security researchers who responsibly disclose vulnerabilities will be:
- Credited in CONTRIBUTORS.md (with permission)
- Acknowledged in release notes
- Listed in a Security Hall of Fame (coming soon)

---

## Security Best Practices

If you're using this project:

### For Researchers

✅ **Do**:
- Run the server on localhost only
- Use trusted networks
- Keep dependencies updated (`pip install --upgrade`)
- Review code before running

❌ **Don't**:
- Expose the WebSocket server to the internet
- Use this in production systems
- Process untrusted user input
- Connect to untrusted WebSocket servers

### For Developers

✅ **Do**:
- Validate all inputs
- Use parameterized queries (if adding database)
- Follow principle of least privilege
- Add tests for security-critical code
- Use safe deserialization methods

❌ **Don't**:
- Use `eval()` or `exec()` on user input
- Trust client-side validation alone
- Store secrets in code or git
- Ignore security warnings from tools

---

## Dependency Security

We use automated tools to monitor dependencies:

- **Dependabot**: Automated dependency updates
- **Safety**: Python dependency vulnerability scanner
- **Bandit**: Python code security scanner

See `.github/workflows/test.yml` for our CI/CD security checks.

---

## Questions?

For security questions (non-vulnerability):
- Open a GitHub Discussion: https://github.com/Zae-Project/brain-emulation/discussions
- Tag with `security` label

For vulnerabilities:
- Email: security@todosloscobardesdelvalle.com

---

**Last Updated**: January 22, 2026
**Version**: 1.0.0
**Next Review**: March 2026
