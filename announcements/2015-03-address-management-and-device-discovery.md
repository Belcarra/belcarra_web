# Address Management and Device Discovery

Belcarra's white paper on building and managing reliable, conflict-free TCP/IP networks over USB for smart devices and embedded hardware.

## Overview

Ethernet-style networking can very simply be extended to attached USB devices. Belcarra's USBLAN for Windows features a built-in kernel-mode DHCP server for automated address assignment, subnet management, and device discovery designed specifically for point-to-point USB topologies. 

USBLAN for Windows implements USB-IF Communications Device Class protocols—including **CDC-NCM**, **CDC-EEM**, **CDC-ECM**, and **Microsoft RNDIS**—creating an independent, Ethernet-compatible network segment for each attached USB peripheral.

### The Shift from External Networks to Smart Devices

Networking-over-USB protocols were originally conceived to provide USB-mediated access to an external network medium (such as a cable or cellular modem), where address management was delegated to an upstream external network containing a standard DHCP server.

Today, the vast majority of USB devices utilizing these protocols are **smart devices** (IoT hardware, medical instruments, industrial controllers, automotive modules, and embedded Linux/Android systems). These devices employ a network-style command channel (such as an embedded HTTP REST API or SSH server) but do not bridge to an external network. The network segment terminates directly at the device:

- The network segment contains exactly two nodes: the Windows host and the USB device.
- The DHCP service within Belcarra USBLAN for Windows is purpose-built for these self-contained segments.

This document describes how network-layer (IPv4) addressing is established seamlessly on top of the USB link layer, and details practical discovery strategies for Windows OEM applications co-operating with device firmware.

---

## Link Layer Architecture

At the lowest level, a Windows network interface created by USBLAN is an **NDIS miniport interface** utilizing Ethernet-like (IEEE 802.3) framing:

- The associated network segment consists strictly of the virtual Windows adapter and the attached USB device.
- The two nodes exchange standard Ethernet frames directly over USB bulk endpoints.
- **Traffic Isolation:** Packets on this segment are not routed or bridged to corporate LAN or Wi-Fi interfaces unless an administrator explicitly configures network bridging.

---

## IP Address Assignment and Management

For the device to be accessible via standard TCP/IP applications (such as a web browser accessing an on-device configuration server at `http://169.254.1.2`), both the Windows host interface and the device must have valid IPv4 addresses on a common subnet. Three approaches exist:

1. **Manual Static IP Assignment:** The IPv4 address and netmask of the Windows interface and device are pre-arranged and manually configured in Windows Network Connections. While straightforward in simple test benches, this is inflexible, error-prone, and unacceptable for consumer or enterprise end users.
2. **On-Device DHCP Server:** The embedded device runs a lightweight DHCP server that assigns an IP address to the Windows host. While this avoids manual Windows configuration for a single unit, it **fails catastrophically when multiple devices of the same type are connected concurrently**, creating address collisions and routing ambiguity.
3. **Belcarra USBLAN Host-Side DHCP Server:** Belcarra integrates a transparent, lightweight DHCP server directly into the Windows driver. Visible only to the endpoints of each USB network segment, it assigns conflict-free addresses automatically without requiring user intervention or administrative privileges.

---

## Belcarra USBLAN for Windows DHCP Server

Belcarra's internal DHCP server operates within the USBLAN driver stack and is completely isolated from other non-USB network interfaces:

- **Zero Corporate Conflict:** It does not respond to or interfere with corporate DHCP servers, Wi-Fi networks, or external Ethernet adapters.
- **Zero-Privilege End-User Operation:** Neither the device firmware engineer nor the Windows end user needs to participate in device setup.
- **Configurable DHCP Lease Times:** Lease durations are configurable (default: 10 minutes). When a device is briefly disconnected and reconnected within the lease window, it can rapidly renew its existing IP address without waiting for a full DHCP Discover/Offer cycle.
- **Configurable Subnet Base:** Addresses are subdivided from a master block of 256 addresses (`/24`), configurable in the Windows registry via `NETWORKBASE` (default: `169.254.1.0/24`).
- **Optional Deployment:** The server can be enabled or disabled per customer requirements. In production OEM installation kits, the configuration is pre-set, requiring no administrative rights at runtime.

---

## Automatic Address Assignment for Concurrently Active Devices

A major engineering challenge in USB device management is supporting multiple concurrent devices on the same PC (e.g., test racks, multi-device programming fixtures, or multi-port hubs). 

Belcarra USBLAN supports **up to 32 concurrently connected devices** without address collision.

### Subnet Slicing (/29 CIDR Blocks)

Each connected device is assigned its own private sub-block of 8 addresses (`/29` subnet, netmask `255.255.255.248`). Standard IP networking rules require:
- 1 Network Line Address (reserved)
- 1 Windows NDIS Interface Address
- 1 Device IP Address
- 1 DHCP Server Virtual Address
- 1 Broadcast Address (reserved)

This consumes 5 required addresses, fitting neatly inside an 8-address `/29` block with 3 spare addresses per segment.

### Table 1: Subnet Structure per Connected Device (/29 Block)

| Offset | Node / Purpose | Default First Value (Device 0) |
|---|---|---|
| 0 | Subnet Network Line Address (Reserved) | 169.254.1.0 |
| 1 | Windows Host NDIS Interface IP | 169.254.1.1 |
| 2 | Assigned Device IP Address | 169.254.1.2 |
| 3 | USBLAN DHCP Server Virtual Address | 169.254.1.3 |
| 7 | Subnet Broadcast Address (CIDR /29) | 169.254.1.7 |

### Table 2: Multi-Device Address Allocation (First 8 Devices)

When multiple devices are connected, the USBLAN driver automatically steps by 8 addresses for each new device index:

| Device Index | Windows NDIS IP Address | Device IP Address | Subnet Mask | Subnet Range |
|---|---|---|---|---|
| 0 | 169.254.1.1 | 169.254.1.2 | 255.255.255.248 | 169.254.1.0/29 |
| 1 | 169.254.1.9 | 169.254.1.10 | 255.255.255.248 | 169.254.1.8/29 |
| 2 | 169.254.1.17 | 169.254.1.18 | 255.255.255.248 | 169.254.1.16/29 |
| 3 | 169.254.1.25 | 169.254.1.26 | 255.255.255.248 | 169.254.1.24/29 |
| 4 | 169.254.1.33 | 169.254.1.34 | 255.255.255.248 | 169.254.1.32/29 |
| 5 | 169.254.1.41 | 169.254.1.42 | 255.255.255.248 | 169.254.1.40/29 |
| 6 | 169.254.1.49 | 169.254.1.50 | 255.255.255.248 | 169.254.1.48/29 |
| 7 | 169.254.1.57 | 169.254.1.58 | 255.255.255.248 | 169.254.1.56/29 |

*Note: The DHCP server normally enforces the `/29` mask (`255.255.255.248`), but can be configured to present a flat `/24` mask (`255.255.255.0`) if required by specific embedded network stacks.*

---

## Network-Based Device Discovery

Because each connected device receives a deterministic IP address based on its slot index, Windows OEM applications can locate active devices without slow, brute-force IP sweeps across the entire subnet.

Belcarra recommends a lightweight **UDP Multicast Discovery Architecture** between host software and device firmware.

### Host Discovery Architecture (Windows)

#### Thread / Process 1 (Multicast Transmitter & Manager):
1. Query active Windows network interfaces using standard Win32 networking APIs (`GetAdaptersAddresses`).
2. Filter interfaces whose IPv4 configuration matches the configured `NETWORKBASE` prefix (ignoring non-USB adapters).
3. Join the multicast group on each matching USBLAN interface.
4. Broadcast a UDP discovery request to multicast address `226.1.1.1:2000`. This packet reaches all active attached devices simultaneously.
5. Repeat discovery queries periodically (e.g., every 5–10 seconds).
6. **Presence Tracking:** Because UDP is connectionless, a single dropped packet does not necessarily indicate a disconnect. If a previously responsive device fails to reply after 2–3 successive query cycles, the host application concludes that the device has been disconnected.

#### Thread / Process 2 (Host Listener):
1. Bind to UDP port `2001` on the host.
2. Listen asynchronously for incoming unicast responses from devices.
3. Parse device identity, serial numbers, firmware versions, or capability payloads returned by each device.

### Device-Side Discovery Architecture (Embedded Firmware)

1. **Multicast Join:** Add the device's USB network interface to multicast group `226.1.1.1`.
2. **Bind Port:** Bind a UDP socket to port `2000` and listen for incoming host discovery queries.
3. **Respond Unicast:** Upon receiving a query packet, extract the host's unicast source IP address (e.g., `169.254.1.1`).
4. **Transmit Reply:** Send a UDP reply packet containing device identifiers directly to the host's IP address on port `2001`.
5. **Resume Listening:** Return to listening for subsequent queries.

---

## Summary & Integration Checklist

- **Plug-and-Play:** Eliminates manual TCP/IP configuration for Windows users.
- **Conflict Prevention:** Completely prevents IP clashes when multiple smart devices are plugged into the same host.
- **Determinism:** Simplifies host management software by providing predictable `/29` address assignments and robust multicast discovery.
- **Turnkey Availability:** Pre-configured in Belcarra USBLAN custom OEM demonstration kits and production driver packages.
