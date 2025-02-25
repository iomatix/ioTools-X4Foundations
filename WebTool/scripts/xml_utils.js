"use strict";

import ConsoleStyles from "./console_scripts.js";
import {
  ApiClient,
  SharedEnums,
  FilePathUtils,
  QueryTools,
  SortingUtils,
  StatusManager,
} from "./shared_lib.js";

document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM elements for later use
  const expressionInput = ApiClient.getElement("#expression");
  const divXMLDisplay = ApiClient.getElement("#divXMLDisplay");
  const showMdCheckbox = ApiClient.getElement("#show_md");
  const showAiCheckbox = ApiClient.getElement("#show_ai");
  const sortCheckbox = ApiClient.getElement("#sort");
  const statusIndicator = ApiClient.getElement("#statusIndicator");
  // Use jQuery for hintStatus updates
  const $hintStatus = $("#hintStatus");

  // Module-level variables
  let xmlDoc = null;
  let xslDoc = null;
  let updateTimer = null;
  let currentRequestGeneration = 0;
  let statusCount = 0;
  let propertyTree = { children: {} };
  let baseKeywords = [];
  let globalKeywords = [];
  let allPropertyParts = [];

  /* Print the property tree */
  const printPropertyTree = (tree) => {
    ConsoleStyles.logInfo("📦 Property Tree Structure:");

    const printNode = (node, name, depth = 0, isLast = true) => {
      const indent = "  ".repeat(depth);
      const branch = depth === 0 ? "" : isLast ? "└─ " : "├─ ";
      const styledName = ConsoleStyles.applyStyle(name, "bold");

      ConsoleStyles.log(`${indent}${branch}${styledName}`);

      const children = Object.entries(node.children);
      children.forEach(([childName, childNode], index) => {
        const isLastChild = index === children.length - 1;
        printNode(childNode, childName, depth + 1, isLastChild);
      });
    };

    // Start with root node's children
    const rootChildren = Object.entries(tree.children);
    rootChildren.forEach(([name, node], index) => {
      const isLast = index === rootChildren.length - 1;
      printNode(node, name, 0, isLast);
    });
  };

  /* Build the property tree */
  const buildPropertyTree = (propertyNames) => {
    const root = { children: {} };
    const baseKeywordsSet = new Set();
    const partsSet = new Set();

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
  const processXMLData = (xml, statusSelector = null) => {
    ConsoleStyles.logInfo("Processing XML data...");
    if (statusSelector)
      StatusManager.set(statusSelector, `Processing XML data...`);
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
      return buildPropertyTree([]);
    } finally {
      if (statusSelector) StatusManager.clear(statusSelector);
    }
  };

  // Extract keywords from XML (<keyword> elements)
  const processKeywordData = (xml) => {
    const keywordNodes = xml.getElementsByTagName("keyword");
    let keywords = [];
    for (let i = 0; i < keywordNodes.length; i++) {
      const name = keywordNodes[i].getAttribute("name");
      if (name) keywords.push(name);
    }
    return keywords;
  };

  // Initialize jQuery UI autocomplete if available
  const initAutoComplete = (statusSelector = null) => {
    ConsoleStyles.logInfo("Initializing autocomplete...");
    if (statusSelector)
      StatusManager.set(statusSelector, `Initializing autocomplete...`);
    if (window.$ && $.fn.autocomplete) {
      try {
        $("#expression").autocomplete({
          source: (request, response) => {
            const term = request.term.trim();
            if (term.indexOf(".") !== -1) {
              handlePropertyLookup(term, response);
            } else {
              handleKeywordLookup(term, response);
            }
          },
          minLength: 0,
          delay: 300,
          select: function (event, ui) {
            $(this).val(ui.item.value);
            debouncedUpdate();
            return false;
          },
          // Using jQuery to update hint status
          search: function () {
            $hintStatus.text("Loading hints...");
          },
          response: function () {
            $hintStatus.text("");
          },
        });
      } catch (error) {
        ConsoleStyles.logError(`Error initializing autocomplete: ${error}`);
      } finally {
        if (statusSelector) StatusManager.clear(statusSelector);
      }
    } else {
      ConsoleStyles.logWarning(
        "jQuery UI autocomplete not found. Skipping initialization."
      );
    }
  };

  // Recursively search the property tree for matching paths.
  // Returns suggestions with a dot prefix.
  const searchPaths = (node, parts, prefix) => {
    if (parts.length === 0) {
      return Object.keys(node.children).length > 0 ? [prefix + "."] : [prefix];
    }
    const segment = parts[0].toLowerCase();
    let suggestions = [];
    for (const key in node.children) {
      if (key.toLowerCase().startsWith(segment)) {
        const child = node.children[key];
        if (parts.length === 1) {
          let suggestion = prefix + key;
          if (Object.keys(child.children).length > 0) {
            suggestion += ".";
          }
          suggestions.push(suggestion);
        } else {
          suggestions = suggestions.concat(
            searchPaths(child, parts.slice(1), prefix + key + ".")
          );
        }
      }
    }
    return suggestions;
  };

  // Handles property lookup (for terms like ".autos.act" or "Player.ac")
  // When a dot is present, we try the property tree first.
  // If no property-tree match exists for extra segments, we fallback to global keywords.
  const handlePropertyLookup = (term, response) => {
    const normalized = term.startsWith(".") ? term.slice(1) : term;
    const parts = normalized.split(".").filter(Boolean);

    if (parts.length === 0) {
      response(globalKeywords);
      return;
    }

    let suggestions = [];
    if (propertyTree.children[parts[0]]) {
      suggestions = searchPaths(propertyTree, parts, ".");
    }
    if (suggestions.length === 0 && parts.length > 1) {
      suggestions = globalKeywords.filter(
        (k) => k.toLowerCase() === parts[0].toLowerCase()
      );
    }
    if (suggestions.length === 0) {
      suggestions = globalKeywords.filter((k) =>
        k.toLowerCase().startsWith(parts[0].toLowerCase())
      );
    }
    response(suggestions);
  };

  // Handle base keyword lookup (without a dot)
  const handleKeywordLookup = (term, response) => {
    const query = term.toLowerCase();
    const suggestions = globalKeywords.filter((k) =>
      k.toLowerCase().startsWith(query)
    );
    response(suggestions);
  };

  // Perform the XSLT transformation based on user settings
  const transformXML = async (statusSelector = null) => {
    ConsoleStyles.logInfo("Starting XML transformation...");
    if (statusSelector)
      StatusManager.set(statusSelector, "Transforming XML...");
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
      if (statusSelector) StatusManager.clear(statusSelector);
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
    } finally {
      printPropertyTree();
    }
  };

  // Initialize the viewer by loading XML files and setting up autocomplete and event listeners
  const init = async (statusSelector) => {
    ConsoleStyles.logInfo("Initializing documentation viewer...");
    if (statusSelector)
      StatusManager.set(statusSelector, "Initializing documentation viewer...");
    try {
      [xmlDoc, xslDoc] = await Promise.all([
        ApiClient.fetchXML("scriptproperties.xml"),
        ApiClient.fetchXML("scriptproperties.xsl"),
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
      allPropertyParts = ap;

      // Extract keywords from XML and combine with baseKeywords.
      const extractedKeywords = processKeywordData(xmlDoc);
      globalKeywords = Array.from(
        new Set([...baseKeywords, ...extractedKeywords])
      ).sort();

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
      if (statusSelector) StatusManager.clear(statusSelector);
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
