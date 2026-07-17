# Contributing to AliExpress Receipt Downloader

Thank you for your interest in contributing! This document explains how to contribute to this project.

## Quick Start

1. **Fork** this repository
2. **Clone** your fork locally
3. **Create a branch** for your change (`feature/xxx` or `fix/xxx`)
4. **Make your changes**
5. **Test** the extension in Chrome (Load Unpacked)
6. **Commit** with a clear message
7. **Push** to your fork
8. **Open a Pull Request** to `main`

## Pull Request Rules

- All PRs require **at least 1 approval** before merge
- PR must have a clear description of what changed and why
- Keep PRs focused — one feature or fix per PR
- Test your changes before submitting

## Development Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/TRDEFI/ali-invoice-extension.git
   ```

2. Open Chrome → `chrome://extensions`

3. Enable "Developer mode"

4. Click "Load unpacked" → select the cloned folder

5. Make changes to the code, reload the extension in Chrome to test

## Code Style

- JavaScript (no TypeScript, no build tools)
- No external dependencies — all code is bundled locally
- Bilingual strings (EN/TR) with slash separator format
- Dark theme with TRDEFI branding

## What We Accept

- Bug fixes
- New features (with prior discussion via Issue)
- Performance improvements
- Documentation improvements
- UI/UX enhancements

## What We Don't Accept

- Code that collects user data without consent
- Analytics or tracking code
- Changes to the license system without discussion
- Large refactors without prior approval

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser version
- Extension version

## Questions?

Open an issue or contact info@trdefi.com
