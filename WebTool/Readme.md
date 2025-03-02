# ioTools - WebTool

This repository contains a simple WebApp tool designed initially for browsing documentation on MD and AI scripting. Additional features will be added in the future based on personal or community feedback.

## How to Use

> [!important]
>
> Make sure that [Python](https://www.python.org/downloads/) is installed on your machine. The webserver runs on Python.

1. **Setup:**
   - Extract the WebTool into the main folder of your unpacked game files.

   If you are using my XRCatTool scripts to unpack game data, you can copy all contents from the WebTool folder into the "_unpacked" directory created by the `xrcattool_unpack_01_09.bat` script.

> [!tip]
> The newest update of the [XRCatTool](https://github.com/iomatix/ioTools-X4Foundations/tree/main/XRCatTool) introduced a smarter way to unpack bulk of cat files with `_xrcattool_unpack_custom.bat` script file which calls included python script.

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
> Latest [**Stable** Beta available is 1.2.5](https://github.com/iomatix/ioTools-X4Foundations/releases/tag/1.0.1)


- [1.2.5] beta-1.2.5 released
- [1.2.5] Robust working 1.2.5 pre-release build. **Note: scriptproperties preview is available from XML Browser in this build. Link from main menu is not connected yet to the build.**
- [1.2.5] Added basic support for viewing and filtering XLS/XLSX sheets also with regex.
- [1.2.5] XMLTrees - Added filtering option through expression input for any XML file.
- [1.2.5] **Clearer Filtering Results:**
    - **Before:** Typing an expression like `player` or `pla` might result in no output or confusing null displays if no exact matches were found, leaving users unsure why nothing appeared.
    - **After:** Now, when you type an expression (e.g., `player`, `Player.blueprints`, or `pla`), the viewer shows either:
      - A neatly formatted table of matching keywords, datatypes (filter for them using `$` prefix in query), and their properties (e.g., "Base keywords with matching properties" for Player).
      - A clear, user-friendly message like "No matching base keyword for 'player'" or "No matching property 'blueprints' found" if no results match, so you know exactly what’s happening.
- [1.2.5] **Better Handling of Complex Queries:**
    - **Before:** Dot-notation expressions (e.g., `Player.blueprints.product`) might not work consistently or fail silently, making it hard to explore nested properties.
    - **After:** You can now drill down into properties more easily with dot notation (e.g., `Player.blueprints` shows properties under Player, and `Player.blueprints.product` digs deeper). If a part of the expression doesn’t match, you’ll see a specific error message (e.g., "Base 'Player' not recognized" or "No matching property 'product' found"), helping you refine your search.
- [1.2.5] **Improved Feedback for Empty or Invalid Inputs:**
    - **Before:** If you entered an invalid or empty expression, the viewer might show null or no content, leaving you confused.
    - **After:** You’ll now see helpful messages like "No matching properties or keywords found for 'pla'" or "Base 'xyz' not recognized," making it easier to understand why results aren’t appearing and what to try next.
- [1.2.5] **Easier Navigation and Readability:**
    - **Before:** The output might look cluttered or hard to navigate, especially for large datasets or complex hierarchies.
    - **After:** The transformed output is organized into clear sections with headings (e.g., "Base Keywords," "Data Types," "Properties Matching"), tables for properties, and clickable links for datatypes, improving readability and navigation within the document.
- [1.2.5] **Consistent Sorting and Filtering Options:**
    - **Before:** Sorting might not always apply correctly, or filtering by script type (MD-specific or AI-specific) could be inconsistent.
    - **After:** When you check "Sort Results," properties within keywords and datatypes are sorted alphabetically, and filtering by "Show MD-Specific" or "Show AI Content" works reliably to show only relevant script-specific properties, enhancing usability for X4: Foundations users.
- [1.2.5] **Faster and More Reliable Performance:**
    - **Before:** For large XML files or complex expressions, filtering and transformation might be slow or fail silently.
    - **After:** The improved XSL and JavaScript logic are more efficient, reducing delays and ensuring consistent behavior across all XML files, including `scriptproperties.xml`. You’ll notice quicker responses when typing or clicking buttons.
- [1.2.5] **Intuitive Error Messages:**
    - **Before:** Errors might be cryptic or absent, leaving you guessing about issues like missing files or malformed expressions.
    - **After:** You’ll see detailed, friendly error messages (e.g., "No valid XSL/XSLT found for auto-transformation" or "Data type '$xyz' not recognized") in the console or UI, guiding you to resolve issues or adjust your input.
- [1.2.4] scriptproperties - scriptproperties page uses a new Enhanced Viewer features.
- [1.2.3] The Enhanced Viewer has been refactored. Transforming XML and exploring the Tree View is now much smoother. However, it may not be perfect yet, depending on the machine specs.
- [1.2.2] Second part of refactoring.
- [1.2.0] First part of major refactoring of the codebase.
- [1.1.3] scriptproperties - Updated the expression tooltips to work in the scripting logic: BaseKeyword.prop1.prop2.prop3 etc.
- [1.1.3] WebApp - New internal file viewer has been implemented to enhance xmlbrowser functionality. It handles XSL/XSLT files for styling and also allows to explore the tree of files freely.
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
