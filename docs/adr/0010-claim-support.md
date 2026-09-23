# ADR 0010: Claim patches invalidate support

- Status: Accepted
- Date: 2026-09-23
- Slice: S08

## Context

A claim edit can look small and still change what the claim covers. Turning AND
into OR, deleting a condition, cycling dependencies, or mixing a method parent
with a system child are different failures. Support that comes from two
embodiments already marked incompatible is not one embodiment.

## Decision

Each claim stores its category, dependency, connective, limitation list, actor
labels, and a revision. A patch must name the revision it read. A connective
change or a removed limitation writes the next revision and marks that claim's
support stale. A dependency cycle, a category change, or contradictory
quantifiers such as "at least one" with "exactly zero" are refused. Linking
support across embodiments that were recorded as incompatible is refused.

## Consequences

The claims page can show the current text and whether earlier support still
matches it. A later editor can add a richer AST without treating a stale
support row as current.
