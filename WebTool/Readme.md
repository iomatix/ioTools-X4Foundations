# ioTools - WebTool

This repository contains a simple WebApp tool designed initially for browsing documentation on MD and AI scripting. Additional features will be added in the future based on personal or community feedback.

## How to Use

> **Warning:**
> Make sure that [Python](https://www.python.org/downloads/) is installed on your machine. The webserver runs on Python.

1. **Setup:**
   - Extract the WebTool into the main folder of your unpacked game files.

   If you are using my XRCatTool scripts to unpack game data, you can copy all contents from the WebTool folder into the "_unpacked" directory created by the `xrcattool_unpack_01_09.bat` script.

> **Notable:**
> The newest update of the XRCatTool introduced a smarter way to unpack bulk of cat files with `_xrcattool_unpack_custom.bat` script file which calls included python script.

2. **Running the WebApp:**
   - Execute `_run_web.bat` and provide the desired port number (default is 8080).
   - The WebApp will start on the specified port. You can open a browser window by holding down the CTRL key and left-clicking on the generated addresses in the console output.
   - The user can provide a command to execute the installed app. It allows to use of the `...open in external app` feature.

3. **Accessing the WebApp:**
   - Navigate to the provided URL in your web browser to use the tool.

### News

#### 2025-02

- Introduced browsing module to explore files unpacked with XRCatTool scripts. The browser can browse through catalogs, open them in the browser, or via an external app. Windows default app is [XmlNotepad](https://microsoft.github.io/XmlNotepad/#install/) installed via [ClickOnce Installer](https://lovettsoftwarestorage.blob.core.windows.net/downloads/XmlNotepad/XmlNotepad.application), while other OS tries to use gedit. Users can set up the command during script initialization.
