# Contributing to AgentMarKB

Thank you for your interest in contributing to AgentMarKB! This document provides guidelines and instructions for contributing to this project.

## How to Report Bugs

If you find a bug, please open an issue using the **Bug Report** issue template on GitHub. Include the following details:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected behavior vs. actual behavior
- Your Chrome version, macOS version, and Python version
- Any relevant console output from `chrome://extensions/` (service worker logs) or the native host

Please search existing issues first to avoid duplicates.

## How to Request Features

Feature requests are welcome. Please open an issue using the **Feature Request** issue template on GitHub. Describe:

- The problem you are trying to solve
- Your proposed solution or idea
- Any alternatives you have considered
- Whether you would be willing to work on implementing it

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/carlotorniai/agentmarkb.git
   cd agentmarkb
   ```

2. **Load the extension in Chrome:**

   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked** and select the cloned repository folder
   - Copy the extension ID displayed on the extensions page

3. **Install the native messaging host:**

   ```bash
   cd native-host && ./install.sh
   ```

   This registers the native messaging host with Chrome so the extension can read and write local files. You will need Python 3 and `PyYAML` installed (`pip3 install pyyaml`).

4. **Verify the connection:**

   Open the extension's Options page and click "Test Connection" to confirm the native host is working.

## Code Style

There is no linter or formatter configured yet. Please follow the patterns and conventions already present in the codebase:

- Use `const` and `let` (not `var`) in JavaScript
- Use `async/await` for asynchronous operations
- Keep functions focused and reasonably short
- Add comments for non-obvious logic
- Follow the existing message-passing patterns for communication between popup, service worker, content scripts, and native host

## Pull Request Process

1. **Fork** the repository on GitHub
2. **Create a branch** from `main` for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and commit them with clear, descriptive commit messages
4. **Test your changes** manually by loading the unpacked extension in Chrome
5. **Push** your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** against the `main` branch of this repository
7. In the PR description, explain what your changes do and why

A maintainer will review your PR and may request changes before merging. Please be patient and responsive to feedback.

## Questions?

If you have questions about contributing, feel free to open a discussion or issue on GitHub.
