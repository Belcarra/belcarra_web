Belcarra published an overview of its secure development, maintenance, verification, and delivery practices for USBLAN for Windows across AMD64 and ARM64 platforms.

As OEM supply chain security and software provenance requirements continue to expand, Belcarra has formalized its end-to-end driver lifecycle—spanning source review, defensive kernel validation, Microsoft WHQL signing, dual-layer package integrity, and immutable release distribution.

Key engineering and security practices:
- Defensive kernel hardening: Security review and remediation focused on untrusted USB descriptors, buffer boundary checks, and malformed transfer block handling for EEM, ECM, NCM, and RNDIS protocols to protect host kernel memory.
- Dual-layer SBOM and integrity signing: OEM delivery kits and nested end-user redistributable packages each feature independent SPDX Software Bills of Materials (SBOM) and Belcarra DigiCert-signed integrity catalogs to detect unauthorized substitution.
- Verification tooling: Browser-based cryptographic verification and Windows PowerShell verification scripts accompany releases to confirm package contents against signed manifests.
- Immutable release archiving: Versioned master driver builds and symbols are archived in immutable S3 storage, linking customer packages to verifiable master build hashes.
- Multi-architecture regression matrix: Testing across Windows 10 AMD64, Windows 11 AMD64, and Windows 11 ARM64 using configurable Linux USB gadget testbeds.
- Security issue reporting: Dedicated security contact point at security@belcarra.com with direct principal engineering review and traceable remediation workflows.
