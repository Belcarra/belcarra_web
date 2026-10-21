Belcarra has updated its secure development, maintenance, verification, and delivery practices for USBLAN for Windows across AMD64 and ARM64 platforms.

As OEM supply chain security and regulatory requirements expand—including the EU Cyber Resilience Act (CRA) and US Executive Order 14028—Belcarra has formalized its end-to-end driver lifecycle spanning source review, defensive validation, Microsoft signing, dual-layer package integrity, and immutable release distribution.

**Key updates and engineering practices:**
- **Independent SPDX SBOMs:** Master delivery kits and nested redistributable packages each feature independent SPDX Software Bills of Materials (SBOM) to assist OEMs with EU CRA and US NTIA compliance obligations.
- **Dual-layer package integrity:** DigiCert-signed integrity catalogs and package manifests verify authentic file checksums and prevent unauthorized substitution or tampering.
- **Package verification tooling:** Browser-based cryptographic verification and Windows PowerShell scripts accompany each release so teams can quickly confirm package integrity.
- **Immutable release archiving:** Master driver binaries and debugging symbols (`.pdb`) are archived in immutable storage, linking customer packages to verifiable master build hashes.
- **Multi-architecture testing:** Continuous regression testing across Windows 10 AMD64, Windows 11 AMD64, and Windows 11 ARM64 using configurable Linux USB gadget testbeds.
- **Direct security reporting:** Dedicated security contact point at security@belcarra.com with principal engineering review and traceable remediation workflows.
