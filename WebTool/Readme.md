# ioTools - WebTool

This repository contains a simple WebApp tool designed initially for browsing documentation on MD and AI scripting. Additional features will be added in the future based on personal or community feedback.

## How to Use

> [!tip]
>
> Make sure that [Python](https://www.python.org/downloads/) is installed on your machine. The webserver runs on Python.

1. **Setup:**
   - Extract the WebTool into the main folder of your unpacked game files.

   If you are using my XRCatTool scripts to unpack game data, you can copy all contents from the WebTool folder into the "_unpacked" directory created by the `xrcattool_unpack_01_09.bat` script.

> [!important]
> The newest update of the XRCatTool introduced a smarter way to unpack bulk of cat files with `_xrcattool_unpack_custom.bat` script file which calls included python script.

2. **Running the WebApp:**
   - Execute `_run_web.bat` and provide the desired port number (default is 8080).
   - The WebApp will start on the specified port. You can open a browser window by holding down the CTRL key and left-clicking on the generated addresses in the console output.
   - The user can provide a command to execute the installed app. It allows to use of the `...open in external app` feature.

3. **Accessing the WebApp:**
   - Navigate to the provided URL in your web browser to use the tool.

### News

#### 2025-02

> [!note]
>
> Latest [**Stable** Release available is 1.0.1](https://github.com/iomatix/ioTools-X4Foundations/releases/tag/1.0.1)
>
> 1.2.1 is WIP
>
> Latest [Preview Release](https://github.com/iomatix/ioTools-X4Foundations/releases/tag/1.2.0-preview)
>

- [1.2.1] scriptproperties - Improvements for autocompletion hints.
- [1.2.0] First part of major refactoring of the codebase.
- [1.1.3] scriptproperties - Updated the expression tooltips to work in the scripting logic: BaseKeyword.prop1.prop2.prop3 etc.
- [1.1.3] WebApp - New internal file viewer has been implemented to enhance xmlbrowser functionality. It handles XSL/XLST files for styling and also allows to explore the tree of files freely.
- [1.1.1] WebApp - Improved Path Validating, Error Handling, Performance Optimization, Security, Code Organization, Validation and Outputs Handling at python's backend.
- [1.1.0] xmlbrowser - Removed `Raw Browsing` button from the root folder.
- [1.1.0] scriptproperties - Replaced synchronous XMLHttpRequests with asynchronous to prevent freezes of UI.
- [1.1.0] scriptproperties - Fixed content replacement in forceUpdate.
- [1.1.0] scriptproperties - Optimized XSLT processing by caching results if possible and debouncing the update function to prevent excessive transformations.
- [1.1.0] scriptproperties - Improved sorting ensuring it's using efficient XPath expressions or indexes.
- [1.1.0] scriptproperties - Since ActiveXObject if for old IE versions, removed the code, targeting only modern browsers and closing support for old-dated ones. <sup><sub>(If some kind of a mad man still uses old IE, **please stop and get some help**)</sub></sup>
- [1.1.0] scriptproperties - Added autocomplete functionality.
- [1.1.0] scriptproperties - Fixed memory leaks by wrapping in a module pattern and avoided pollution within the global namespace.
- [1.1.0] scriptproperties - Debouncing the input to improve experience to people who are typing faster than one char per 500ms.
- [1.1.0] scriptproperties - Added error handling.
- [1.1.0] scriptproperties - Removed redundant code.
- [1.0.0] Introduced browsing module to explore files unpacked with XRCatTool scripts. The browser can browse through catalogs, open them in the browser, or via an external app. Windows default app is [XmlNotepad](https://microsoft.github.io/XmlNotepad/#install/) installed via [ClickOnce Installer](https://lovettsoftwarestorage.blob.core.windows.net/downloads/XmlNotepad/XmlNotepad.application), while other OS tries to use gedit. Users can set up the command during script initialization.
