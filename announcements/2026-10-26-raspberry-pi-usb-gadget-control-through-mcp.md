Belcarra's [pigadget_mcp](https://github.com/Belcarra/pigadget_mcp) provides a Model Context Protocol (MCP) service for configuring and monitoring Raspberry Pi USB gadgets remotely.

Scripts and AI agents can select EEM, ECM, RNDIS, or NCM, specify USB vendor and product IDs (VID/PID), configure static IPv4 or DHCP addressing, and retrieve device identity and connection status. It supports repeatable driver and device testing, including software disconnect/reconnect operations and cleanup after a test.

The service uses Belcarra's [gadgetconfig](https://github.com/Belcarra/gadgetconfig) tools to create and control Linux USB gadget configurations. Install gadgetconfig on the Pi first, then run `pigadget_mcp` as a headless service, directly accessible to an MCP client or through an MCP broker on a trusted network. For interactive desktop use, gadgetconfig also includes the `gadgetapp` graphical interface.

- **GitHub Repository:** [Belcarra/pigadget_mcp](https://github.com/Belcarra/pigadget_mcp)
- **Underlying Toolset:** [Belcarra/gadgetconfig](https://github.com/Belcarra/gadgetconfig)
- **Reference PDF:** [Download Announcement PDF](assets/Raspberry_Pi_USB_Gadget_Control_Through_MCP.pdf)
