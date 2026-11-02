# CampusConnect Documentation

Start here when you need to understand, maintain, or integrate with CampusConnect.

| Document | Use it for |
|---|---|
| [Technical Architecture](TECHNICAL-ARCHITECTURE.md) | System context, layers, request lifecycle, authentication, authorization, storage, deployment |
| [Database ERD](DATABASE-ERD.md) | MongoDB entities, relationships, indexes, data lifecycle |
| [API Reference](API-REFERENCE.md) | Endpoint catalogue, access roles, workflows, status codes, request patterns |
| [OpenAPI](openapi.yaml) | Machine-readable API route catalogue for compatible tooling |
| [Screenshot Catalogue](SCREENSHOT-CATALOGUE.md) | Capture real role-based desktop/mobile screenshots |
| [Demo Runbook](DEMO-RUNBOOK.md) | Prepare the local environment and deliver a repeatable demonstration |

## Source of truth

The implementation is authoritative. When documentation and code differ, inspect the relevant route, validation module, service, and Mongoose model before changing either. Update these documents in the same pull request as contract or schema changes.

The OpenAPI file deliberately avoids inventing detailed request/response schemas where the application contract is encoded in JavaScript validation and service code. Consult the API reference and implementation for exact payload fields.
