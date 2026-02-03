from __future__ import annotations

from typing import Any, Iterable


def build_changes(mutations: Iterable[Any]) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    for mutation in mutations:
        changes.append(
            {
                "path": str(mutation.path),
                "before": mutation.before,
                "after": mutation.after,
            }
        )
    return changes
