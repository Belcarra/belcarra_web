Belcarra published an overview of its secure development, maintenance, verification, and delivery practices for USBLAN for Windows across AMD64 and ARM64 platforms.

As OEM supply chain security, software provenance, and regulatory expectations expand—including alignment with the EU Cyber Resilience Act (CRA) and US Executive Order 14028 / NTIA minimum SBOM guidelines—Belcarra has formalized its end-to-end driver lifecycle spanning source review, defensive kernel validation, Microsoft WHQL signing, dual-layer package integrity, and immutable release distribution.

Key engineering and security practices:
- Regulatory alignment and SPDX SBOMs: Delivery kits and nested end-user redistributable packages each feature independent SPDX Software Bills of Materials (SBOM) aligned with NTIA Executive Order 14028 requirements and supporting EU Cyber Resilience Act (CRA) compliance obligations.
- Dual-layer package integrity: Belcarra DigiCert-signed integrity catalogs and package manifests verify authentic file checksums and detect unauthorized substitution or tampering.
- Verification tooling: Browser-based cryptographic verification and Windows PowerShell verification scripts accompany releases to confirm package contents against signed manifests.
- Immutable release archiving: Versioned master driver builds and symbols are archived in immutable S3 storage, linking customer packages to verifiable master build hashes.
- Multi-architecture regression matrix: Testing across Windows 10 AMD64, Windows 11 AMD64, and Windows 11 ARM64 using configurable Linux USB gadget testbeds.
- Security issue reporting: Dedicated security contact point at security@belcarra.com with direct principal engineering review and traceable remediation workflows.
