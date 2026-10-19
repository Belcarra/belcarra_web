Belcarra published a demonstration kit on GitHub for the Belcarra PIC32MZ USBLAN Driver using Microchip's PIC32MZ EF Starter Kit and PIC32MZ EF Curiosity Board.

The project demonstrates how Networking over USB can be used as a low-cost alternative to Ethernet or Wi-Fi, transferring TCP/IP frames at close to Ethernet performance (over 80 Mbps). The Belcarra PIC32MZ USBLAN Function Driver implements CDC-EEM to establish a point-to-point network connection between the PIC32MZ board and a Windows, macOS, or Linux host with zero-copy buffer efficiency.

Key features and setup highlights:
- Supports PIC32MZ EF Starter Kit (DM320007-C), Curiosity Board (DM320104-BNDL), and EC Starter Kit.
- Based on Microchip Harmony 3 framework demonstration project (web_net_server_nvm_mpfs).
- Includes Telnet, Iperf, Zeroconf, and USB High Speed Device drivers.
- Windows evaluation driver repository available via [belcarra_usblan_iot_demo_drivers](https://github.com/Belcarra/belcarra_usblan_iot_demo_drivers).
- Demonstration project available on GitHub: [pic32mz_usblan_harmony3_demo](https://github.com/Belcarra/pic32mz_usblan_harmony3_demo).
