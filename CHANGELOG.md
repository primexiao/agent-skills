# Changelog

This project follows semantic versioning per skill. Versions are recorded in
each `SKILL.md` and, when present, its `package.json`.

## Unreleased

### Repository

- Added Agent Skills/spec validation, routing and behavior eval corpora, CI,
  security policy, contributor guidance, and skills.sh groupings.
- Removed runtime self-update from every published skill.
- Added repository policy checks for bundled credentials, proxy bypass,
  symlinks, shell interpretation, missing resources, and catalog drift.

### model-radar 1.3.0

- Split query, output, and cache detail into progressive references.
- Added task-spend regression coverage and fail-closed CLI argument parsing.
- Replaced the unverified "open source" inference with an exact Hugging Face
  listing signal and explicit license verification requirement.
- Removed free-form provider descriptions from agent-facing model output.
- Moved mutable cache state out of the installed skill directory into the user
  cache, with an explicit override for restricted runtimes.

### invest 1.1.0

- Removed self-update and bundled fallback credentials; network calls now honor
  system proxy policy.
- Replaced expression `eval` with a bounded AST/Decimal calculator.
- Corrected primary-source deviation checks, A-share revenue labels, source
  timestamps, and circular market-cap verification.
- Added prompt-injection boundaries, optional persistence, and financial
  uncertainty rules.

### topic 1.1.0

- Removed self-update and added check-only mode, untrusted-content handling,
  filename-only secret scanning, symlink/path boundaries, portable scan fallback,
  and a stable INDEX schema.

### research-company 1.0.0

- Added explicit untrusted-source handling and routing boundaries against
  securities-investment tasks.
