"use strict";

import ConsoleStyles from "./ConsoleStyles.js";

document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM elements for later use
  const expressionInput = document.getElementById("expression");
  const divXMLDisplay = document.getElementById("divXMLDisplay");
  const showMdCheckbox = document.getElementById("show_md");
  const showAiCheckbox = document.getElementById("show_ai");
  const sortCheckbox = document.getElementById("sort");
  const statusIndicator = document.getElementById("statusIndicator");

  // Module-level variables
  let xmlDoc = null;
  let xslDoc = null;
  let updateTimer = null;
  let currentRequestGeneration = 0;
  let propertyTree = { children: {} };
  let baseKeywords = [];
  let allPropertyParts = [];

  // Utility functions for status indicator
  const setStatus = (message) => {
    if (statusIndicator) {
      statusIndicator.innerText = message;
      statusIndicator.style.display = "block";
    }
  };

  const clearStatus = () => {
    if (statusIndicator) {
      statusIndicator.innerText = "";
      statusIndicator.style.display = "none";
    }
  };

  // Asynchronously load an XML file and parse it
  const loadXMLFile = async (filename) => {
    ConsoleStyles.logInfo(`Loading ${filename}...`);
    setStatus(`Loading ${filename}...`);
    try {
      const response = await fetch(`libraries/${filename}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      ConsoleStyles.logSuccess(`${filename} loaded successfully.`);
      return new DOMParser().parseFromString(text, "text/xml");
    } catch (error) {
      ConsoleStyles.logError(`Failed to load ${filename}: ${error.message}`);
      return null;
    } finally {
      clearStatus();
    }
  };

  /* Build the property tree */
  const buildPropertyTree = (propertyNames) => {
    const root = { children: {} };
    const baseKeywordsSet = new Set();
    const partsSet = new Set(); // Collect all property parts

    for (const name of propertyNames) {
      const parts = name.split(".");
      if (parts.length === 0) continue;

      const baseKeyword = parts[0];
      baseKeywordsSet.add(baseKeyword);
      parts.forEach((part) => partsSet.add(part));

      let currentNode = root;
      for (const part of parts) {
        if (!currentNode.children[part]) {
          currentNode.children[part] = { children: {} };
        }
        currentNode = currentNode.children[part];
      }
    }

    return {
      tree: root,
      baseKeywords: Array.from(baseKeywordsSet),
      allPropertyParts: Array.from(partsSet),
    };
  };

  // Process the XML to extract unique property names
  const processXMLData = (xml) => {
    ConsoleStyles.logInfo("Processing XML data...");
    try {
      const nodes = xml.evaluate(
        "//property/@name",
        xml,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const properties = [];
      for (let i = 0; i < nodes.snapshotLength; i++) {
        properties.push(nodes.snapshotItem(i).value);
      }
      ConsoleStyles.logSuccess(`Extracted ${properties.length} properties.`);
      return buildPropertyTree(properties);
    } catch (error) {
      ConsoleStyles.logError(`Error processing XML: ${error.message}`);
      return buildPropertyTree(properties);
    }
  };

  // Initialize jQuery UI autocomplete if available
  const initAutoComplete = () => {
    ConsoleStyles.logInfo("Initializing autocomplete...");
    if (window.$ && $.fn.autocomplete) {
      try {
        $("#expression").autocomplete({
          source: (request, response) => {
            const term = request.term.trim();
            // If the term contains a dot anywhere, use property lookup.
            if (term.indexOf(".") !== -1) {
              handlePropertyLookup(term, response);
            } else {
              handleKeywordLookup(term, response);
            }
          },
          minLength: 0,
          delay: 300,
        });
      } catch (error) {
        ConsoleStyles.logError(`Error initializing autocomplete: ${error}`);
      }
    } else {
      ConsoleStyles.logWarning(
        "jQuery UI autocomplete not found. Skipping initialization."
      );
    }
  };

  // Handles property lookup (for terms like ".autos.act" or "Player.ac")
  const handlePropertyLookup = (term, response) => {
    // Remove a leading dot if present; if not, leave as is.
    const normalized = term.startsWith(".") ? term.slice(1) : term;
    const parts = normalized.split(".").filter(Boolean);

    // If no parts, return all base keywords (with a dot)
    if (parts.length === 0) {
      response(baseKeywords.map((k) => "." + k));
      return;
    }

    // Use recursive fuzzy search to gather suggestions.
    const suggestions = searchPaths(propertyTree, parts, ".");
    response(suggestions);
  };

  // Recursively search the property tree for matching paths.
  const searchPaths = (node, parts, prefix) => {
    if (parts.length === 0) {
      // At the end: if node has children, append a trailing dot.
      return Object.keys(node.children).length > 0 ? [prefix + "."] : [prefix];
    }
    const segment = parts[0].toLowerCase();
    let suggestions = [];
    for (const key in node.children) {
      // Fuzzy match: key must start with the typed segment (case-insensitive)
      if (key.toLowerCase().startsWith(segment)) {
        const child = node.children[key];
        if (parts.length === 1) {
          // Last segment: complete the suggestion.
          let suggestion = prefix + key;
          if (Object.keys(child.children).length > 0) {
            suggestion += ".";
          }
          suggestions.push(suggestion);
        } else {
          // More segments: search further in this branch.
          suggestions = suggestions.concat(
            searchPaths(child, parts.slice(1), prefix + key + ".")
          );
        }
      }
    }
    return suggestions;
  };

  /*  Handle Base Keyword Lookup (Without a Dot) */
  const handleKeywordLookup = (term, response) => {
    const query = term.toLowerCase();
    // Filter base keywords (extracted from the first property part)
    const suggestions = baseKeywords.filter((k) =>
      k.toLowerCase().startsWith(query)
    );
    response(suggestions);
  };

  // Perform the XSLT transformation based on user settings
  const transformXML = async () => {
    ConsoleStyles.logInfo("Starting XML transformation...");
    setStatus("Transforming XML...");
    try {
      if (!xmlDoc || !xslDoc) {
        ConsoleStyles.logError("XML/XSL documents are not loaded.");
        return;
      }

      const processor = new XSLTProcessor();
      processor.importStylesheet(xslDoc);

      const expression = encodeURIComponent(expressionInput.value.trim());
      processor.setParameter(null, "expression", expression);

      const scriptType =
        showMdCheckbox.checked && showAiCheckbox.checked
          ? "any"
          : showMdCheckbox.checked
          ? "md"
          : showAiCheckbox.checked
          ? "ai"
          : "";
      processor.setParameter(null, "scripttype", scriptType);
      processor.setParameter(
        null,
        "sort",
        sortCheckbox.checked ? "true" : "false"
      );

      const fragment = processor.transformToFragment(xmlDoc, document);
      divXMLDisplay.replaceChildren(fragment);
      ConsoleStyles.logSuccess("XML transformation completed.");
    } catch (error) {
      ConsoleStyles.logError(`Transformation error: ${error.message}`);
    } finally {
      clearStatus();
    }
  };

  // Debounce updates to avoid excessive processing
  const debouncedUpdate = () => {
    try {
      const generation = ++currentRequestGeneration;
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(async () => {
        if (generation === currentRequestGeneration) {
          await transformXML();
        }
      }, 300);
    } catch (error) {
      ConsoleStyles.logError(`Debounced update error: ${error.message}`);
    }
  };

  // Initialize the viewer by loading XML files and setting up autocomplete and event listeners
  const init = async () => {
    ConsoleStyles.logInfo("Initializing documentation viewer...");
    setStatus("Loading documentation files...");
    try {
      [xmlDoc, xslDoc] = await Promise.all([
        loadXMLFile("scriptproperties.xml"),
        loadXMLFile("scriptproperties.xsl"),
      ]);

      if (!xmlDoc || !xslDoc)
        throw new Error("Failed to load required XML files.");

      const {
        tree,
        baseKeywords: bk,
        allPropertyParts: ap,
      } = processXMLData(xmlDoc);
      propertyTree = tree;
      baseKeywords = bk.sort();
      allPropertyParts = ap; // Populate property parts

      initAutoComplete();
      expressionInput.focus();
      debouncedUpdate();
      ConsoleStyles.logSuccess("Documentation viewer initialized.");
    } catch (error) {
      ConsoleStyles.logError(`Initialization error: ${error.message}`);
      alert(
        "Failed to initialize documentation viewer. Please report this issue."
      );
    } finally {
      clearStatus();
    }
  };

  // Attach event listeners to handle user input changes
  expressionInput.addEventListener("input", debouncedUpdate);
  sortCheckbox.addEventListener("change", debouncedUpdate);
  showMdCheckbox.addEventListener("change", debouncedUpdate);
  showAiCheckbox.addEventListener("change", debouncedUpdate);

  // Start the initialization
  init();
});
