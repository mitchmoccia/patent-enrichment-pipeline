# ADR 0015: Commercial assessment can recommend stopping

- Status: Accepted
- Date: 2026-09-23
- Slice: S13

## Context

A completed pipeline can be read as proof of demand. Market size and a
licensing probability are easy to invent. A negative business conclusion
should not delete the engineering record.

## Decision

An assessment stores a buyer hypothesis, a substitute, an evidence request, one
of three strategies, and a decision of proceed, revise, defer, or stop. Missing
revenue or cost leaves product cashflow unknown. A supplied pair is subtracted
and labeled as product cashflow. Incremental patent value stays null. The
database rejects any other value. A licensing probability is rejected. A market
size figure is rejected because this environment has no sourced series.

Recording the assessment sets G11 to needs_review. The deterministic check
still does not pass the gate. Claim drafts are not deleted.

## Consequences

The commercial page can show a stop recommendation next to the surviving claim
count. Unknowns stay listed.
