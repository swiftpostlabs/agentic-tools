"""Gemini policy file rendering."""


def build_ai_exclude_content(
    *, protected_files: list[str], excluded_files: list[str], policy_label: str
) -> str:
    lines: list[str] = [
        "# ==============================================================================",
        "# AI EXCLUSION FILE",
        f"# Generated from {policy_label}",
        "# Protected files are sensitive; excluded files are mostly noise or generated output.",
        "# ==============================================================================",
        "",
        "# --- 1. Protected files ---",
    ]

    lines.extend(protected_files)
    lines.append("")
    lines.append("# --- 2. Excluded noise / generated output ---")
    lines.extend(excluded_files)
    lines.append("")
    return "\n".join(lines)
