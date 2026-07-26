# Contributing to Conflux

Thank you for your interest in contributing to Conflux!

## Development Workflow

1. Fork the repository and create a feature branch (`git checkout -b feat/my-feature`).
2. Run backend tests:
   ```bash
   python backend/manage.py test apps.accounts apps.files apps.folders apps.storage
   ```
3. Run frontend typecheck & build:
   ```bash
   npm --prefix frontend run build
   ```
4. Commit your changes using conventional commit formats:
   - `feat(scope): description`
   - `fix(scope): description`
   - `style(scope): description`
5. Open a Pull Request against the `main` branch.
