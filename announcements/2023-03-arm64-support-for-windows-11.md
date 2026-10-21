Belcarra added ARM64 support for USBLAN on Windows 11 to align with modern OEM platform roadmaps.

For many hardware programs, ARM64 is no longer an edge case. It is a production target for portable devices, low-power designs, and specialized systems where power and integration constraints matter. This update allows teams to deploy a unified USB networking strategy across Windows 11 AMD64 and ARM64 host environments (alongside existing Windows 10 AMD64 deployments).

This support expansion keeps the same USB networking model and protocol coverage expected from existing USBLAN deployments. Engineering teams can evaluate architecture-specific performance and validation requirements without reworking core product assumptions.

Recommended next steps for integration teams:
- Confirm package and signing flow for Windows 11 ARM64 and AMD64 hosts.
- Execute protocol validation on CDC-NCM, CDC-EEM, CDC-ECM, and RNDIS as required.
- Re-run suspend/resume, reconnect, and long-duration stability tests on Windows 11 ARM64 hosts.
