Belcarra released `gadgetconfig`, an open-source toolset designed to simplify creating, configuring, and managing Linux USB Gadget devices using kernel ConfigFS and `libcomposite`.

Setting up USB Gadget devices on embedded Linux targets—such as Raspberry Pi boards, BeagleBones, and custom embedded platforms—often requires fragile manual shell scripts to configure sysfs directories. `gadgetconfig` introduces declarative JSON definitions and systemd service integration to make device-side gadget deployment reliable, repeatable, and maintainable.

Key features and capabilities:
- Declarative JSON definitions: Define device descriptors (VID, PID, device class), multi-language strings, and functions in a clean, structured schema.
- Multi-function composite gadgets: Combine networking protocols (CDC-ECM, CDC-EEM, CDC-NCM, RNDIS) with serial communication (CDC-ACM), HID, or mass storage.
- Microsoft OS Descriptors: Native support for `os_desc` configuration to enable deterministic host matching and seamless driver binding on Windows hosts.
- systemd service integration: Manage gadget lifecycle and state cleanly during system boot and runtime.
- Early-boot shell script export: Convert JSON definitions into standalone shell scripts (`gadgetconfig --sh-auto`) for early init environments without Python runtime overhead.
- Repository and installation: Available on PyPI via `pip3 install gadgetconfig` and open source on GitHub at [github.com/Belcarra/gadgetconfig](https://github.com/Belcarra/gadgetconfig).
