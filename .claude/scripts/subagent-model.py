#!/usr/bin/env python3
"""Print the model and thinking effort a subagent actually runs with, read from its transcript.

Usage: python3 .claude/scripts/subagent-model.py <output_file | agentId>
           [--model claude-opus-5-5] [--effort medium] [--timeout 180]

<output_file> is the path the Agent tool returns for a background subagent; an agentId works too.
Waits until the subagent's first answer is logged, then prints `model=… effort=…`.
Exit codes: 0 = matches the expectation, 1 = mismatch, 2 = transcript/answer not found in time.
"""
import argparse
import glob
import json
import os
import sys
import time


def find_transcript(ref):
    if os.path.exists(ref):
        return os.path.realpath(ref)
    hits = glob.glob(os.path.expanduser(f"~/.claude/projects/*/*/subagents/agent-{ref}.jsonl"))
    return hits[0] if hits else None


def first_answer(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue  # last line may still be being written
            if entry.get("type") == "assistant":
                return entry.get("message", {}).get("model"), entry.get("effort")
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("ref")
    p.add_argument("--model", default="claude-opus-5-5")
    p.add_argument("--effort", default="medium")
    p.add_argument("--timeout", type=float, default=180)
    a = p.parse_args()

    deadline = time.time() + a.timeout
    found = None
    while time.time() < deadline:
        path = find_transcript(a.ref)
        found = path and first_answer(path)
        if found:
            break
        time.sleep(2)
    if not found:
        print(f"no answer from subagent {a.ref} within {a.timeout:.0f}s")
        return 2

    model, effort = found
    print(f"model={model} effort={effort}")
    return 0 if (model == a.model and effort == a.effort) else 1


if __name__ == "__main__":
    sys.exit(main())
