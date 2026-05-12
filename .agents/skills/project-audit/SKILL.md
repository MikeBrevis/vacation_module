---
name: Project Cleanup & Audit
description: Guidelines for identifying and removing redundant files, dead code, and duplicated information within the repository to ensure maintainability and efficiency.
---

# Project Cleanup & Audit Skill

This skill provides a systematic approach to auditing the project for redundant, unused, or obsolete files and information. Use this skill when you need to "slim down" the repository or when the user identifies that there is clutter.

## Core Principles
1. **No Redundancy**: Information should have a single source of truth. Avoid duplicating logic or documentation across multiple files.
2. **Minimalism**: If a file or piece of code does not serve a current or documented future purpose, it should be removed.
3. **Safety First**: Always verify dependencies before deletion and ensure a clean git state exists for easy recovery.

## Audit Workflow

### 1. Identify Redundant Files
- **Duplicate Versions**: Look for files with suffixes like `_v2`, `_backup`, `_old`, or `_copy`.
- **Placeholder/Test Files**: Identify files created during experimentation that were never integrated (e.g., `test.js`, `dummy_data.json`).
- **Orphaned Files**: Find files that are not referenced by any other part of the application (e.g., unused images, CSS files not imported).

### 2. Identify Redundant Information
- **Duplicate Logic**: Search for code blocks (e.g., database connection strings, utility functions) that appear in multiple files and should be centralized.
- **Overlapping Documentation**: Check if `README.md`, `ARCHITECTURE.md`, or other markdown files contain conflicting or identical information.
- **Redundant Config**: Look for environment variables or configurations defined in multiple places (e.g., both `docker-compose.yml` and a `.env` file without clear overrides).

### 3. Verification & Cleanup
- **Dependency Check**: Use `grep_search` to confirm that a file name or specific function is not used anywhere else in the codebase before removing it.
- **Impact Analysis**: Determine if removing a file will break builds, CI/CD pipelines, or deployment configurations.
- **Staging**: Move files to a temporary `_trash` folder (outside the main source tree) if unsure, then delete after confirmation.

## Execution Steps
1. **List and Scan**: Use `list_dir` and `grep_search` to identify candidate files or code blocks for removal/consolidation.
2. **Generate Audit Report**: Create a markdown artifact (e.g., `audit_report.md`) listing all findings, the rationale for removal, and potential risks.
3. **User Review**: Present the report to the user and wait for explicit confirmation.
4. **Authorized Execution**: Only after receiving confirmation, proceed to:
    - **Remove**: Delete approved files.
    - **Consolidate**: Refactor approved logic.
5. **Final Commit**: Use the `git-commit` skill to document the authorized cleanup.

> [!IMPORTANT]
> **NEVER** delete or modify files based on an audit without the user's explicit consent for each specific change.



