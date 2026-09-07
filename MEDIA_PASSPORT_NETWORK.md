# Media Passport Network

## Position

Media Passport is not a social platform, publisher, moderation system, or truth authority. It is an independent **identity + evidence layer for digital media**.

The network answers four questions:

1. **What media asset are we looking at?**
2. **Where has this asset or a related derivative appeared?**
3. **What evidence exists about how it was created, changed, and published?**
4. **How strong and current is that evidence?**

Platforms remain responsible for their own moderation, recommendation, monetization, editorial, and policy decisions.

## Network model

```text
ORIGINAL MEDIA
      |
      v
MEDIA IDENTITY
      |
      +---- PROVENANCE / C2PA
      +---- TRUST OBSERVATIONS
      +---- EVIDENCE
      +---- CLAIMS
      +---- TRANSFORMATIONS
      +---- PUBLICATIONS
      +---- NETWORK EVENTS
      |
      v
PLATFORM / PUBLISHER / ADVERTISER / AI SYSTEM
      |
      v
LOCAL PRODUCT DECISION
```

## Persistent identity

A Media Passport identity is not a claim that two visually similar files are identical.

Identity has two levels:

- `EXACT_ASSET`: cryptographic identity for the same bytes/content hash.
- `MEDIA_FAMILY`: an evidence-backed relationship for derivatives or materially related media.

Every family match carries a confidence and matching method. Uncertain matches must remain uncertain.

## Transformation graph

The network records relationships such as:

`original → crop → re-encode → translated version → AI-edited version → published copy`

A transformation is an observation, not an accusation. The system records the evidence and confidence supporting the relationship.

## Publication graph

The same media can appear on multiple services:

`creator → YouTube → X → news publisher → advertiser → archive`

A publication record stores the platform, external media identifier when available, URL when appropriate, timestamps, status, and supporting evidence.

## Evidence timeline

Network events form an append-only timeline:

- CREATED
- PUBLISHED
- REPUBLISHED
- TRANSFORMED
- AI_ASSISTED
- AI_GENERATED
- CLAIM_ATTACHED
- CLAIM_CHALLENGED
- CORRECTED
- VERIFIED
- APPEALED
- UPDATED
- REMOVED

Events are hashed so downstream systems can detect unexpected alteration.

## Platform integration

The long-term API contract should allow a platform to:

```http
POST /v1/media/verify
GET  /v1/media/{id}
GET  /v1/media/{id}/evidence
GET  /v1/media/{id}/provenance
GET  /v1/media/{id}/trust
```

and, as the network matures:

```http
POST /v1/network/identify
GET  /v1/network/media/{id}
GET  /v1/network/media/{id}/history
GET  /v1/network/media/{id}/publications
GET  /v1/network/media/{id}/transformations
POST /v1/network/events
```

These network endpoints should expose evidence and confidence, not hidden platform-specific moderation decisions.

## Product surfaces

### Public Passport

A human-readable page showing:

- Passport ID
- content identity
- trust dimensions
- confidence
- provenance status
- AI disclosure status
- evidence summary
- transformation timeline
- known publication history
- claims and claim status
- appeal/correction history
- last assessment time

### Developer API

Machine-readable responses for platforms, publishers, advertisers, AI-media systems, and enterprise archives.

### Evidence Explorer

A detailed view explaining exactly which evidence produced each observation.

### Network Graph

A visual relationship graph showing media identity, derivatives, publications, provenance, claims, and events.

## Rules

1. Evidence beats inference.
2. Missing evidence is not evidence of wrongdoing.
3. AI involvement is not automatically deception.
4. Similarity is not identity without sufficient evidence.
5. Trust scores require confidence and evidence lineage.
6. Platform decisions stay with platforms.
7. Corrections and appeals are first-class events.
8. Privacy-minimized public output is mandatory.
9. Every material observation is versioned by model/provider/policy and timestamp.
10. The network must be useful even when no single platform participates.

## Business model

The network is designed primarily as infrastructure sold to organizations that need reliable media intelligence:

- social and video platforms
- news organizations
- publishers
- advertisers and brand-safety teams
- AI-media companies
- enterprise media libraries
- archives and research organizations
- creator and rights-management platforms

The consumer-facing Passport is the verification surface. The API and network are the infrastructure business.

## Why this is bigger than a detector

A detector answers: **"Does this file look manipulated?"**

Media Passport can answer the more valuable systems question:

> **"What is this media, what happened to it, where has it appeared, what evidence supports the assessment, and how confident should downstream systems be?"**

That makes Media Passport an interoperability layer rather than another content platform.
