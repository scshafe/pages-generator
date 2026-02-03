from __future__ import annotations

from typing import Any, Iterable


def build_undo(mutations: Iterable[Any]) -> list[dict[str, Any]]:
    undo: list[dict[str, Any]] = []
    for mutation in mutations:
        undo.append(
            {
                "path": str(mutation.path),
                "before": mutation.after,
                "after": mutation.before,
            }
        )
    return undo
