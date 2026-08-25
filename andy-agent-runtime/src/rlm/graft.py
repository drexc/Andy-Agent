"""Graft Context Engine for Andy Agent RLM.

Provides high-speed, zero-token structural codebase indexing, skeletons,
dependency/callers graphs, architecture maps, and blast radius analysis.
"""

from __future__ import annotations

import ast
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


DEFAULT_IGNORES = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".turbo",
    ".cache",
    "venv",
    ".venv",
    "kernel-venv",
    ".andy",
    ".prime",
    ".gemini",
    "__pycache__",
}


@dataclass
class CodeSymbol:
    name: str
    kind: str
    line: int
    signature: str
    docstring: str | None = None
    exported: bool = True
    parent: str | None = None
    calls: list[str] = field(default_factory=list)


def _scan_files(root_dir: str = ".") -> list[Path]:
    root = Path(root_dir).resolve()
    matched: list[Path] = []

    for path in root.rglob("*"):
        if any(part in DEFAULT_IGNORES or part.startswith(".") for part in path.parts):
            continue
        if path.is_file() and path.suffix.lower() in {
            ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".go", ".rs", ".java", ".c", ".cpp", ".json"
        }:
            matched.append(path)

    return matched


def skeleton(file_path: str, max_lines: int = 150) -> str:
    """Generate a high-density skeleton of a file (signatures/types only, omitting bodies)."""
    p = Path(file_path).resolve()
    if not p.exists():
        return f"// File not found: {file_path}"

    try:
        content = p.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"// Error reading {file_path}: {e}"

    ext = p.suffix.lower()
    if ext == ".py":
        return _python_skeleton(p, content)
    else:
        return _ts_generic_skeleton(p, content)


def _python_skeleton(path: Path, content: str) -> str:
    try:
        tree = ast.parse(content)
    except Exception:
        return _ts_generic_skeleton(path, content)

    out = [f"# === SKELETON: {path.name} (python) ===\n"]

    # Imports
    imports = []
    for node in tree.body:
        if isinstance(node, ast.Import):
            imports.append(f"import {', '.join(alias.name for alias in node.names)}")
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            imports.append(f"from {mod} import {', '.join(alias.name for alias in node.names)}")

    if imports:
        out.append("# --- Imports ---")
        out.extend(imports[:10])
        if len(imports) > 10:
            out.append(f"# ... and {len(imports) - 10} more imports")
        out.append("")

    # Classes and Functions
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            bases = [ast.unparse(b) for b in node.bases]
            base_str = f"({', '.join(bases)})" if bases else ""
            out.append(f"class {node.name}{base_str}:")
            doc = ast.get_docstring(node)
            if doc:
                out.append(f'    """{doc.strip()}"""')

            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    is_async = "async " if isinstance(item, ast.AsyncFunctionDef) else ""
                    args = ast.unparse(item.args)
                    ret = f" -> {ast.unparse(item.returns)}" if item.returns else ""
                    out.append(f"    {is_async}def {item.name}({args}){ret}: ...")
            out.append("")

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            is_async = "async " if isinstance(node, ast.AsyncFunctionDef) else ""
            args = ast.unparse(node.args)
            ret = f" -> {ast.unparse(node.returns)}" if node.returns else ""
            doc = ast.get_docstring(node)
            out.append(f"{is_async}def {node.name}({args}){ret}:")
            if doc:
                out.append(f'    """{doc.strip()}"""')
            out.append("    ...")
            out.append("")

    return "\n".join(out)


def _ts_generic_skeleton(path: Path, content: str) -> str:
    lines = content.splitlines()
    out = [f"// === SKELETON: {path.name} ===\n"]

    in_comment = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Keep imports, interfaces, types, class headers, function headers, exports
        if (
            stripped.startswith("import ")
            or stripped.startswith("export interface ")
            or stripped.startswith("interface ")
            or stripped.startswith("export type ")
            or stripped.startswith("type ")
            or stripped.startswith("export enum ")
            or stripped.startswith("export class ")
            or stripped.startswith("class ")
            or stripped.startswith("export function ")
            or stripped.startswith("export const ")
            or stripped.startswith("export default ")
            or re.match(r"^\s*(public|private|protected|async)?\s*(function|def|fn)\s+", stripped)
        ):
            # Clean trailing braces
            clean = re.sub(r"\s*\{.*$", " { /* ... */ }", line)
            out.append(clean)

    return "\n".join(out)


def map(root_dir: str = ".", max_files: int = 50) -> str:
    """Generate an architecture map and cluster overview of the codebase."""
    files = _scan_files(root_dir)
    clusters: dict[str, list[Path]] = {}

    for f in files:
        rel = f.relative_to(Path(root_dir).resolve())
        parts = rel.parts
        cluster_name = f"{parts[0]}/{parts[1]}" if len(parts) > 2 else parts[0]
        clusters.setdefault(cluster_name, []).append(f)

    out = ["# [Graft RLM Engine] Codebase Map"]
    out.append(f"- **Total Files**: {len(files)}")
    out.append("")

    out.append("## Module Clusters")
    for name, cluster_files in sorted(clusters.items()):
        out.append(f"### Dir: `{name}/` ({len(cluster_files)} files)")
        for f in cluster_files[:15]:
            rel = f.relative_to(Path(root_dir).resolve())
            out.append(f"  - `{rel}`")
        if len(cluster_files) > 15:
            out.append(f"  - ... ({len(cluster_files) - 15} more files)")
        out.append("")

    return "\n".join(out)


def grep(query: str, root_dir: str = ".", max_results: int = 25) -> str:
    """Perform symbol-aware regex grep across indexed files."""
    files = _scan_files(root_dir)
    pattern = re.compile(query, re.IGNORECASE)
    matches_by_file: dict[str, list[tuple[int, str]]] = {}
    total = 0

    for f in files:
        if total >= max_results:
            break
        try:
            lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
            for idx, line in enumerate(lines):
                if pattern.search(line):
                    rel = str(f.relative_to(Path(root_dir).resolve()))
                    matches_by_file.setdefault(rel, []).append((idx + 1, line.strip()))
                    total += 1
                    if total >= max_results:
                        break
        except Exception:
            continue

    out = [f"[Graft Grep] for: '{query}' ({total} matches)\n"]
    for file_rel, line_list in matches_by_file.items():
        out.append(f"File: {file_rel}:")
        for lnum, lcontent in line_list:
            out.append(f"  L{lnum}: {lcontent}")
        out.append("")

    return "\n".join(out)


def callers(symbol_name: str, root_dir: str = ".") -> str:
    """Find all references and calls to a given symbol across the codebase."""
    files = _scan_files(root_dir)
    pattern = re.compile(r"\b" + re.escape(symbol_name) + r"\b")
    callers_list: list[str] = []

    for f in files:
        try:
            lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
            for idx, line in enumerate(lines):
                if pattern.search(line) and not ("def " in line or "function " in line or "class " in line):
                    rel = str(f.relative_to(Path(root_dir).resolve()))
                    callers_list.append(f"- {rel}:L{idx+1} -> {line.strip()}")
        except Exception:
            continue

    if not callers_list:
        return f"No callers found for symbol '{symbol_name}'."

    out = [f"[Graft Callers] of '{symbol_name}' ({len(callers_list)} occurrences):\n"]
    out.extend(callers_list[:30])
    return "\n".join(out)


def blast(target_file_or_symbol: str, root_dir: str = ".") -> str:
    """Analyze the blast radius (impacted dependents) of modifying a file or symbol."""
    target_name = Path(target_file_or_symbol).stem
    call_info = callers(target_name, root_dir=root_dir)

    out = [f"[Graft Blast Radius Analysis] for: '{target_file_or_symbol}'\n"]
    out.append("Impacted dependents / callers:")
    out.append(call_info)
    return "\n".join(out)


def ask(question: str, root_dir: str = ".") -> str:
    """Find high-relevance files and signatures for an architectural or functional question."""
    files = _scan_files(root_dir)
    keywords = [w.lower() for w in re.findall(r"\w+", question) if len(w) > 2]

    scored: list[tuple[Path, int]] = []
    for f in files:
        score = 0
        name_lower = f.name.lower()
        path_lower = str(f).lower()

        for kw in keywords:
            if kw in name_lower:
                score += 5
            elif kw in path_lower:
                score += 2

        if score > 0:
            scored.append((f, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:5]

    if not top:
        return f"No direct file matches found for '{question}'. Try graft.map() to inspect the repository."

    out = [f"[Graft Relevant Files] for: '{question}'\n"]
    for path, score in top:
        rel = path.relative_to(Path(root_dir).resolve())
        out.append(f"### File: {rel} (Relevance: {score})")
        skel = skeleton(str(path), max_lines=30)
        out.append("```\n" + skel[:600] + "\n```\n")

    return "\n".join(out)
