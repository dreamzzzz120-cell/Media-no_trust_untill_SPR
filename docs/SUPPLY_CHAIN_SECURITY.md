# Constellation supply-chain policy

Production releases are permitted only from the protected production branch after CI is green.

- Runtime and build credentials are separate; production secrets are scoped to the production deployment environment.
- Long-lived infrastructure credentials are rotated at least every 90 days and immediately after suspected exposure.
- Unused production variables are removed during each release review.
- Third-party CI actions are pinned to immutable commit SHAs.
- Each release produces an SBOM and dependency/license/secret scan evidence.
- Container base images are pinned by digest before a release is called reproducible.
- Production build artifacts must have a verifiable signature and provenance attestation before this control is marked complete.
