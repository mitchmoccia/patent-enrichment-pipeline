# ADR 0004: Object storage when S3 is not configured

- Status: Accepted
- Date: 2026-09-23
- Slice: S02

## Context

Artifact bytes belong in private S3 objects encrypted with a KMS key. This
environment has no bucket, region, KMS key, or AWS credentials. Reporting a
successful cloud upload without those values would be false.

## Decision

`resolveObjectStore` chooses, in order:

1. The S3 adapter, only when bucket, region, KMS key id, and access credentials
   are all set. `put` signs a KMS `PutObject`. A failed response stays
   `PROVIDER_UNAVAILABLE` and is not marked clean.
2. A local filesystem driver, only when `OBJECT_STORE_LOCAL_DIR` is set. Stored
   rows say `local-filesystem`. The product copy says this is not S3.
3. Otherwise the store is unconfigured. Ingest throws `PROVIDER_UNAVAILABLE`
   and writes no artifact row.

Hash mismatches, unsafe archive paths, decompression bombs, macros, and
malformed PDFs are rejected. Their bytes are not stored. Original rows cannot
be updated; a correction is a new artifact.

## Setup

Set `S3_BUCKET`, `S3_REGION`, `KMS_KEY_ID`, `AWS_ACCESS_KEY_ID`, and
`AWS_SECRET_ACCESS_KEY` for the private store. Until then, set
`OBJECT_STORE_LOCAL_DIR` for local development only. Do not commit either
secret or treat the local directory as durable production storage.
