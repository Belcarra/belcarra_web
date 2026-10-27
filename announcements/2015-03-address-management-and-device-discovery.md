Belcarra has published a technical paper on address management and device discovery for smart devices using TCP/IP networking over USB.

Unlike traditional USB modems that bridge to external networks, modern smart devices (IoT endpoints, medical instruments, industrial controllers) terminate the network link directly at the device, creating an isolated two-node segment between Windows and the hardware.

Belcarra's USBLAN driver incorporates a built-in kernel-mode DHCP server designed specifically for point-to-point USB links:

- **Zero-Configuration Operation:** Assigns transparent, conflict-free IP addresses without requiring user intervention or administrator privileges.
- **Multi-Device Support:** Allocates isolated `/29` subnets (8 IP addresses per device) supporting up to 32 concurrent USB devices without address collisions.
- **Multicast Discovery Architecture:** Uses lightweight UDP multicast requests (`226.1.1.1:2000`) and unicast device replies (`port 2001`) for fast device discovery without brute-force subnet sweeps.
- **Configurable Lease Times:** Supports rapid device reconnects without re-negotiation delays.

For complete technical specifications, subnet allocation tables, and discovery flow diagrams:

- **Read the Full White Paper:** [Address Management and Device Discovery (Web)](address-management.html)
- **Download Original PDF:** [Address Management and Device Discovery (PDF)](assets/Address_Management_and_Device_Discovery.pdf)
