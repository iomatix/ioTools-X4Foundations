"use strict";

import { SharedLibs } from "../shared/shared_libs.js";

const consoleUtils = SharedLibs.ConsoleUtils;
const apiClient = SharedLibs.ApiClient;
const queryTools = SharedLibs.QueryTools;
const statusManager = SharedLibs.StatusManager;

// Optional debug flag to control property tree printing.
const DEBUG_PRINT_PROPERTY_TREE = false;

/**
 * Executes an async function while setting and later clearing a status message.
 *
 * @param {string} statusSelector - The CSS selector for the status indicator element.
 * @param {string} message - The status message to display during the async operation.
 * @param {function} asyncFunc - The async function to execute.
 * @returns {Promise<any>} A promise that resolves when the async function completes.
 */
function withStatus(statusSelector, message, asyncFunc) {
  // Set the status message if a status selector is provided
  if (statusSelector) statusManager.set(statusSelector, message);

  // Execute the async function and clear the status message when done
  return asyncFunc().finally(() => {
    if (statusSelector) statusManager.clear(statusSelector);
  });
}

/**
 * Recursively prints the property tree.
 * This function is moved out of the class for reuse.
 *
 * @param {Object} tree - The property tree to print.
 */
function printPropertyTree(tree) {
  consoleUtils.logInfo("📦 Property Tree Structure:");

  /**
   * Recursively prints a node and its children.
   *
   * @param {Object} node - The current node in the tree.
   * @param {string} name - The name of the current node.
   * @param {number} [depth=0] - The current depth in the tree.
   * @param {boolean} [isLast=true] - Whether the current node is the last child.
   */
  function printNode(node, name, depth = 0, isLast = true) {
    const indent = "  ".repeat(depth);
    const branch = depth === 0 ? "" : isLast ? "└─ " : "├─ ";
    const styledName = consoleUtils.applyStyle(name, "bold");
    consoleUtils.log(`${indent}${branch}${styledName}`);

    // Recursively print each child node
    const childrenEntries = Object.entries(node.children);
    childrenEntries.forEach(([childName, childNode], index) => {
      printNode(
        childNode,
        childName,
        depth + 1,
        index === childrenEntries.length - 1
      );
    });
  }

  // Start printing from the root of the tree
  Object.entries(tree.children).forEach(([name, node], index, arr) => {
    printNode(node, name, 0, index === arr.length - 1);
  });
}

/**
 * DocumentationViewer handles XSLT transformation of an XML file,
 * supports filtering (via an expression), sorting, and keyword lookups.
 */
class DocumentationViewer {
  /**
   * Creates an instance of DocumentationViewer.
   *
   * @param {Object} config - The configuration object for the viewer.
   * @param {HTMLElement} config.expressionInput - The input element for expressions.
   * @param {HTMLElement} config.divXMLDisplay - The element to display transformed XML.
   * @param {HTMLElement} config.showMdCheckbox - The checkbox to show Markdown content.
   * @param {HTMLElement} config.showAiCheckbox - The checkbox to show AI content.
   * @param {HTMLElement} config.sortCheckbox - The checkbox to enable sorting.
   * @param {HTMLElement} config.statusIndicator - The element to display status messages.
   * @param {HTMLElement} [config.hintStatus=null] - The element to display hint status messages.
   * @param {string} [config.xmlFile="scriptproperties.xml"] - The XML file path.
   * @param {string} [config.xslFile="scriptproperties.xsl"] - The XSL file path.
   */
  constructor(config) {
    this.expressionInput = config.expressionInput;
    this.divXMLDisplay = config.divXMLDisplay;
    this.showMdCheckbox = config.showMdCheckbox;
    this.showAiCheckbox = config.showAiCheckbox;
    this.sortCheckbox = config.sortCheckbox;
    this.statusIndicator = config.statusIndicator;
    this.hintStatus = config.hintStatus || null;

    // File path configuration
    this.xmlFile = config.xmlFile || "libraries/scriptproperties.xml";
    this.xslFile = config.xslFile || "libraries/scriptproperties.xsl";

    // Internal state
    this.xmlDoc = null;
    this.xslDoc = null;
    this.updateTimer = null;
    this.currentRequestGeneration = 0;
    this.propertyTree = { children: {} };
    this.baseKeywords = [];
    this.globalKeywords = [];
    this.allPropertyParts = [];
  }
  /**
   * Build a hierarchical tree from an array of dot-delimited property names.
   *
   * @param {string[]} propertyNames - An array of dot-delimited property names.
   * @returns {Object} An object representing the property tree with `tree`, `baseKeywords`, and `allPropertyParts`.
   */
  buildPropertyTree(propertyNames) {
    // Initialize the root of the property tree
    const root = { children: {} };

    // Sets to store base keywords and parts
    const baseKeywordsSet = new Set();
    const partsSet = new Set();

    // Iterate through each property name to build the tree
    for (const name of propertyNames) {
      const parts = name.split(".");
      if (parts.length === 0) continue;

      // Add the first part to base keywords
      baseKeywordsSet.add(parts[0]);

      // Add all parts to the parts set
      parts.forEach((part) => partsSet.add(part));

      // Traverse the tree and create nodes as needed
      let currentNode = root;
      for (const part of parts) {
        if (!currentNode.children[part]) {
          currentNode.children[part] = { children: {} };
        }
        currentNode = currentNode.children[part];
      }
    }

    // Return the constructed property tree and the sets as arrays
    return {
      tree: root,
      baseKeywords: Array.from(baseKeywordsSet),
      allPropertyParts: Array.from(partsSet),
    };
  }

  /**
   * Extracts property names via XPath and builds the property tree.
   *
   * @param {Document} xml - The XML document to process.
   * @param {string} [statusSelector=null] - The CSS selector for the status indicator element.
   * @returns {Object} The property tree constructed from the extracted property names.
   */
  processXMLData(xml, statusSelector = null) {
    consoleUtils.logInfo("Processing XML data...");

    // If a status selector is provided, update the status indicator
    if (statusSelector) {
      statusManager.set(statusSelector, "Processing XML data...");
    }

    try {
      // Evaluate the XPath expression to get property names
      const nodes = xml.evaluate(
        "//property/@name",
        xml,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      // Collect property names from the evaluated nodes
      const properties = [];
      for (let i = 0; i < nodes.snapshotLength; i++) {
        properties.push(nodes.snapshotItem(i).value);
      }

      consoleUtils.logSuccess(`Extracted ${properties.length} properties.`);

      // Build and return the property tree from the extracted property names
      return this.buildPropertyTree(properties);
    } catch (error) {
      // Log an error message if there is an issue during processing
      consoleUtils.logError(`Error processing XML: ${error.message}`);

      // Return an empty property tree in case of an error
      return this.buildPropertyTree([]);
    } finally {
      // Clear the status indicator if a status selector is provided
      if (statusSelector) {
        statusManager.clear(statusSelector);
      }
    }
  }

  /**
   * Processes <keyword> nodes to extract keyword names.
   *
   * @param {Document} xml - The XML document to process.
   * @returns {string[]} An array of extracted keyword names.
   */
  processKeywordData(xml) {
    // Get all <keyword> nodes from the XML document.
    const keywordNodes = xml.getElementsByTagName("keyword");
    let keywords = [];

    // Iterate through the keyword nodes and extract their "name" attributes.
    for (let i = 0; i < keywordNodes.length; i++) {
      const name = keywordNodes[i].getAttribute("name");
      if (name) keywords.push(name);
    }

    // Return the array of extracted keyword names.
    return keywords;
  }

  /**
   * Initializes autocomplete on the expression input using jQuery UI.
   *
   * @param {string} [statusSelector=null] - The CSS selector for the status indicator element.
   * @returns {void} A promise that resolves when the initialization is complete.
   */
  initAutoComplete(statusSelector = null) {
    consoleUtils.logInfo("Initializing autocomplete...");

    // If a status selector is provided, update the status indicator
    if (statusSelector) {
      statusManager.set(statusSelector, "Initializing autocomplete...");
    }

    const $ = window.$;
    if ($ && $.fn.autocomplete) {
      try {
        // Initialize jQuery UI autocomplete on the expression input
        $(this.expressionInput).autocomplete({
          source: (request, response) => {
            const term = request.term.trim();
            if (term.includes(".")) {
              // Use property lookup if the term contains a dot
              this.handlePropertyLookup(term, response);
            } else {
              // Use keyword lookup for other terms
              this.handleKeywordLookup(term, response);
            }
          },
          minLength: 0,
          delay: 300,
          select: (event, ui) => {
            // Update the input value and trigger debounced update on select
            $(this.expressionInput).val(ui.item.value);
            this.debouncedUpdate();
            return false;
          },
          search: () => {
            // Update the hint status during search
            if (this.hintStatus) this.hintStatus.text("Loading hints...");
          },
          response: () => {
            // Clear the hint status after receiving response
            if (this.hintStatus) this.hintStatus.text("");
          },
        });
      } catch (error) {
        // Log an error message if there is an issue during initialization
        consoleUtils.logError(
          `Error initializing autocomplete: ${error.message}`
        );
      } finally {
        // Clear the status indicator if a status selector is provided
        if (statusSelector) {
          statusManager.clear(statusSelector);
        }
      }
    } else {
      // Log a warning if jQuery UI autocomplete is not found
      consoleUtils.logWarning(
        "jQuery UI autocomplete not found. Skipping initialization."
      );
    }
  }

  /**
   * Recursively searches the property tree to build suggestion paths.
   *
   * @param {Object} node - The current node in the property tree.
   * @param {string[]} parts - An array of parts representing the path to search for.
   * @param {string} prefix - The current prefix for the suggestion paths.
   * @returns {string[]} An array of suggestion paths.
   */
  searchPaths(node, parts, prefix) {
    // If there are no more parts to search, return the prefix.
    if (parts.length === 0) {
      return Object.keys(node.children).length > 0 ? [prefix + "."] : [prefix];
    }

    const segment = parts[0].toLowerCase();
    let suggestions = [];

    // Iterate through the children of the current node.
    for (const key in node.children) {
      // If the child's key starts with the current segment, process it.
      if (key.toLowerCase().startsWith(segment)) {
        const child = node.children[key];

        // If there is only one part left, add the suggestion.
        if (parts.length === 1) {
          let suggestion = prefix + key;
          if (Object.keys(child.children).length > 0) suggestion += ".";
          suggestions.push(suggestion);
        } else {
          // Recursively search the child's children.
          suggestions = suggestions.concat(
            this.searchPaths(child, parts.slice(1), prefix + key + ".")
          );
        }
      }
    }

    return suggestions;
  }

  /**
   * Provides suggestions for property lookups.
   *
   * @param {string} term - The term to look up and provide suggestions for.
   * @param {function} response - The callback function to call with the suggestions.
   */
  handlePropertyLookup(term, response) {
    // Normalize the term by removing the leading dot, if any.
    const normalized = term.startsWith(".") ? term.slice(1) : term;

    // Split the normalized term into parts by dot and filter out empty parts.
    const parts = normalized.split(".").filter(Boolean);

    // If no parts are present, respond with all global keywords.
    if (parts.length === 0) {
      response(this.globalKeywords);
      return;
    }

    let suggestions = [];

    // Search for property paths that match the first part.
    if (this.propertyTree.children[parts[0]]) {
      suggestions = this.searchPaths(this.propertyTree, parts, "");
    }

    // If no suggestions are found and there are multiple parts, try to find an exact match.
    if (suggestions.length === 0 && parts.length > 1) {
      suggestions = this.globalKeywords.filter(
        (k) => k.toLowerCase() === parts[0].toLowerCase()
      );
    }

    // If no suggestions are found, look for keywords that start with the first part.
    if (suggestions.length === 0) {
      suggestions = this.globalKeywords.filter((k) =>
        k.toLowerCase().startsWith(parts[0].toLowerCase())
      );
    }

    // Call the response callback function with the suggestions.
    response(suggestions);
  }

  /**
   * Provides suggestions for keyword lookups.
   *
   * @param {string} term - The term to look up and provide suggestions for.
   * @param {function} response - The callback function to call with the suggestions.
   */
  handleKeywordLookup(term, response) {
    // Convert the term to lowercase for case-insensitive comparison.
    const query = term.toLowerCase();

    // Filter the global keywords to find those that start with the query.
    const suggestions = this.globalKeywords.filter((k) =>
      k.toLowerCase().startsWith(query)
    );

    // Call the response callback function with the suggestions.
    response(suggestions);
  }

  /**
   * Consolidates transformation parameters.
   *
   * @returns {Object} An object containing the consolidated transformation parameters:
   *                   - expression: URL-encoded value from the expression input.
   *                   - scriptType: Type of script to use, based on the state of checkboxes.
   *                   - sort: Boolean string indicating whether sorting is enabled.
   */
  getTransformationParameters() {
    // Get and encode the value from the expression input field.
    const expression = encodeURIComponent(this.expressionInput.value.trim());
    let scriptType = "";

    // Determine the script type based on the state of the checkboxes.
    if (this.showMdCheckbox.checked && this.showAiCheckbox.checked) {
      scriptType = "any";
    } else if (this.showMdCheckbox.checked) {
      scriptType = "md";
    } else if (this.showAiCheckbox.checked) {
      scriptType = "ai";
    }

    // Determine whether sorting is enabled.
    const sort = this.sortCheckbox.checked ? "true" : "false";

    // Return the consolidated transformation parameters.
    return { expression, scriptType, sort };
  }

  /**
   * Transforms the XML using the loaded XSLT document.
   *
   * @async
   * @param {string} [statusSelector=null] - The CSS selector for the status indicator element.
   * @returns {Promise<void>} A promise that resolves when the transformation is complete.
   */
  async transformXML(statusSelector = null) {
    consoleUtils.logInfo("Starting XML transformation...");

    // If a status selector is provided, update the status indicator
    if (statusSelector) {
      statusManager.set(statusSelector, "Transforming XML...");
    }

    try {
      // Check if the XML and XSL documents are loaded
      if (!this.xmlDoc || !this.xslDoc) {
        consoleUtils.logError("XML/XSL documents are not loaded.");
        return;
      }

      // Initialize the XSLT processor and import the XSL stylesheet
      const processor = new XSLTProcessor();
      processor.importStylesheet(this.xslDoc);

      // Get the transformation parameters
      const { expression, scriptType, sort } =
        this.getTransformationParameters();

      // Set the transformation parameters in the processor
      processor.setParameter(null, "expression", expression);
      processor.setParameter(null, "scripttype", scriptType);
      processor.setParameter(null, "sort", sort);

      // Perform the transformation and replace the content of the display element
      const fragment = processor.transformToFragment(this.xmlDoc, document);
      this.divXMLDisplay.replaceChildren(fragment);

      consoleUtils.logSuccess("XML transformation completed.");
    } catch (error) {
      // Log an error message if there is an issue during the transformation
      consoleUtils.logError(`Transformation error: ${error.message}`);
    } finally {
      // Clear the status indicator if a status selector is provided
      if (statusSelector) {
        statusManager.clear(statusSelector);
      }
    }
  }

  /**
   * Debounces update calls to prevent multiple rapid transformations.
   */
  debouncedUpdate() {
    try {
      // Increment the current request generation to keep track of the latest update request
      const generation = ++this.currentRequestGeneration;

      // Clear any existing update timer
      if (this.updateTimer) clearTimeout(this.updateTimer);

      // Set a new update timer to delay the update call by 300 milliseconds
      this.updateTimer = setTimeout(async () => {
        // Check if the current generation matches the latest request generation
        if (generation === this.currentRequestGeneration) {
          // Perform the XML transformation
          await this.transformXML();

          // If debugging is enabled, print the property tree
          if (DEBUG_PRINT_PROPERTY_TREE) {
            printPropertyTree(this.propertyTree);
          }
        }
      }, 300);
    } catch (error) {
      // Log an error message if there is an issue during the debounced update
      consoleUtils.logError(`Debounced update error: ${error.message}`);
    }
  }

  /**
   * Initializes the documentation viewer by fetching the XML/XSL files,
   * processing the XML, setting up autocomplete, and performing an initial transform.
   *
   * @async
   * @param {string} [statusSelector=this.statusIndicator] - The CSS selector for the status indicator element.
   * @returns {Promise<void>} A promise that resolves when the initialization is complete.
   */
  async init(statusSelector = this.statusIndicator) {
    consoleUtils.logInfo("Initializing documentation viewer...");

    // Show the status message while initializing the documentation viewer.
    await withStatus(
      statusSelector,
      "Initializing documentation viewer...",
      async () => {
        try {
          // Fetch the XML and XSL files simultaneously.
          const [xmlDoc, xslDoc] = await Promise.all([
            apiClient.fetchXML(this.xmlFile),
            apiClient.fetchXML(this.xslFile),
          ]);

          // Check if both files were successfully fetched.
          if (!xmlDoc || !xslDoc) {
            throw new Error("Failed to load required XML files.");
          }

          // Store the fetched documents in the instance.
          this.xmlDoc = xmlDoc;
          this.xslDoc = xslDoc;

          // Process the XML data to build the property tree and extract keywords.
          const { tree, baseKeywords, allPropertyParts } = this.processXMLData(
            this.xmlDoc
          );
          this.propertyTree = tree;
          this.baseKeywords = baseKeywords.sort();
          this.allPropertyParts = allPropertyParts;

          // Extract additional keywords from the XML data.
          const extractedKeywords = this.processKeywordData(this.xmlDoc);
          this.globalKeywords = Array.from(
            new Set([...this.baseKeywords, ...extractedKeywords])
          ).sort();

          // Initialize the autocomplete feature.
          this.initAutoComplete();

          // Set the focus to the expression input field and trigger an initial update.
          this.expressionInput.focus();
          this.debouncedUpdate();

          consoleUtils.logSuccess("Documentation viewer initialized.");
        } catch (error) {
          // Log an error message and show an alert if initialization fails.
          consoleUtils.logError(`Initialization error: ${error.message}`);
          alert(
            "Failed to initialize documentation viewer. Please report this issue."
          );
        }
      }
    );
  }
}

/* Additional utility functions */

/**
 * Updates the UI element that shows the current XSL file name.
 *
 * @param {File|string} activeXslFile - The current XSL file or its name.
 * @param {string} [selector="#xslFileName"] - A CSS selector for the element to update with the XSL file name.
 * @returns {Promise<void>} A promise that resolves when the XSL file name is updated.
 */
function updateXslFileName(activeXslFile, selector = "#xslFileName") {
  apiClient
    .getElement(selector)
    .then((xslFileNameEl) => {
      // Check if the element exists
      if (xslFileNameEl) {
        // Update the element's text content with the XSL file name or a default message
        xslFileNameEl.textContent = activeXslFile
          ? activeXslFile.name || activeXslFile
          : "No file chosen";
      }
    })
    .catch((err) => {
      // Log an error message if there is an issue updating the XSL file name
      consoleUtils.logError(`Error updating XSL file name: ${err.message}`);
      throw err;
    });
}

/**
 * Creates a DOM tree view (using nested UL/LI elements) from an XML node.
 *
 * @param {Element} node - The XML node to convert into a DOM tree view.
 * @returns {HTMLElement|null} - The root list item element representing the tree, or null if the node is not an element.
 */
function createTreeDOM(node) {
  // Check if the node is a valid element node
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

  // Create the list item element for the current node
  const li = apiClient.createElement("li");

  // Create the span element to represent the node
  const span = apiClient.createElement("span", { classList: "tree-node" });

  // Collect attributes and format them for display
  const attributesList = [];
  for (const attr of node.attributes) {
    const attrText =
      attr.name === "name"
        ? `\n🔹${attr.name}: ${attr.value}`
        : `\n🔸${attr.name}: ${attr.value}`;
    attributesList.push(attrText);
  }

  // Display attributes if they exist
  const attrDisplay = attributesList.length
    ? ` <span class="tree-attributes">(${attributesList.join(", ")})</span>`
    : "";

  // Display text content if the node has no children
  const textContent = node.textContent.trim();
  const textDisplay =
    textContent && node.children.length === 0
      ? `: <span class="tree-value">${textContent}</span>`
      : "";

  // Set the inner HTML of the span element
  span.innerHTML = `${node.nodeName}${attrDisplay}${textDisplay}`;

  // Set a tooltip for the node with parent and attribute information
  span.setAttribute(
    "data-tooltip",
    (node.parent?.nodeName
      ? `💠Parent: ${node.parent.nodeName}`
      : `🔶Root Node`) +
      `\n` +
      (node.nodeName ? `🔻Element: ${node.nodeName}\n` : ``) +
      (attributesList.length > 0
        ? `\nAttributes: ${attributesList.join(", ")}`
        : "No matching attributes")
  );

  // Append the span element to the list item
  li.appendChild(span);

  // Recursively create tree elements for child nodes
  if (node.children.length > 0) {
    const ul = apiClient.createElement("ul");
    Array.from(node.children).forEach((child) => {
      child.parent = node; // Set parent for tooltip reference
      const childTree = createTreeDOM(child);
      if (childTree) ul.appendChild(childTree);
    });
    li.appendChild(ul);
  } else {
    span.classList.add("tree-node-no-children");
  }

  return li;
}

/**
 * Displays the XML as a collapsible tree view.
 *
 * @async
 * @param {string} file - The URL or path to the XML file to be displayed.
 * @param {HTMLElement} container - The HTML element in which to display the tree view.
 * @returns {Promise<void>} A promise that resolves when the tree view has been successfully displayed.
 */
async function displayAsTree(file, container) {
  try {
    // Fetch the XML file.
    const response = await fetch(file);
    if (!response.ok) {
      container.textContent = "Error loading file.";
      return;
    }
    const text = await response.text();

    // Parse the XML content.
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");

    // Create the root element for the tree view.
    const treeRoot = apiClient.createElement("ul", { classList: "tree" });
    const treeDOM = createTreeDOM(xmlDoc.documentElement);
    if (treeDOM) treeRoot.appendChild(treeDOM);

    // Clear the container and append the tree view.
    container.innerHTML = "";
    container.appendChild(treeRoot);

    // Attach collapse/expand events to tree nodes.
    container.querySelectorAll(".tree-node").forEach((node) => {
      node.addEventListener("click", function (e) {
        e.stopPropagation();
        const ul = this.parentElement.querySelector("ul");
        if (ul) ul.classList.toggle("collapsed");
      });
    });
  } catch (err) {
    container.textContent = "Error displaying tree: " + err;
    throw err;
  }
}

/**
 * Displays the raw XML file content (with HTML escaping).
 *
 * @async
 * @param {string} file - The URL or path to the XML file to be displayed.
 * @param {HTMLElement} container - The HTML element in which to display the content.
 * @returns {Promise<void>} A promise that resolves when the content has been successfully loaded and displayed.
 */
async function displayRawContent(file, container) {
  try {
    const response = await fetch(file);
    if (!response.ok) {
      container.textContent = "Error loading file.";
      return;
    }
    const text = await response.text();
    container.innerHTML = `<pre>${queryTools.escapeHtml(text)}</pre>`;
  } catch (err) {
    container.textContent = "Error: " + err;
    throw err;
  }
}

/**
 * Attempts to automatically transform XML using candidate XSL files.
 *
 * @async
 * @param {string} xmlFile - The path to the XML file to be transformed.
 * @param {string} [viewerSelector="#viewerContent"] - The CSS selector for the element to display the transformed result.
 * @param {string} [xslNameSelector="#xslFileName"] - The CSS selector for the element to display the name of the applied XSL file.
 * @returns {Promise<boolean>} - A promise that resolves to true if the transformation is successful, otherwise false.
 */
async function autoTransformXML(
  xmlFile,
  viewerSelector = "#viewerContent",
  xslNameSelector = "#xslFileName"
) {
  const baseName = xmlFile.replace(/\.xml$/i, "");
  // List of candidate XSL files based on the XML file name
  const candidates = [`${baseName}.xsl`, `${baseName}.xslt`];
  // Track successful transformation state
  let transformationSuccessful = false;
  for (const candidate of candidates) {
    try {
      // Attempt to fetch the candidate XSL file
      const candidateResponse = await fetch(candidate);
      if (!candidateResponse.ok) {
        consoleUtils.logDebug(
          `Error fetching candidate XSL file: ${candidate} - ${candidateResponse.status}`
        );
        continue;
      }
      const xsltText = await candidateResponse.text();
      const xmlResponse = await fetch(xmlFile);
      if (!xmlResponse.ok) {
        consoleUtils.logError(
          `Error while loading XML file: ${xmlFile} - ${xmlResponse.status}`
        );
        return false;
      }
      const xmlText = await xmlResponse.text();
      const parser = new DOMParser();
      // Parse the XML and XSL files
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const xslDoc = parser.parseFromString(xsltText, "application/xml");
      if (window.XSLTProcessor) {
        const xsltProcessor = new XSLTProcessor();
        xsltProcessor.importStylesheet(xslDoc);
        // Transform the XML using the XSL
        const resultDocument = xsltProcessor.transformToFragment(
          xmlDoc,
          document
        );
        const viewerContent = await apiClient.getElement(viewerSelector);
        if (viewerContent) {
          // Clear the viewer content element and append the transformation result
          viewerContent.innerHTML = "";
          viewerContent.appendChild(resultDocument);
        } else {
          consoleUtils.logDebug("Viewer content element not found");
          return false;
        }
        // Update activeXslFile using the already fetched candidate data.
        const candidateBlob = new Blob([xsltText], {
          type:
            candidateResponse.headers.get("content-type") || "application/xml",
        });
        const candidateName = candidate.split("/").pop();
        // Only update state if transformation succeeded
        window.activeXslFile = new File([candidateBlob], candidateName, {
          type: candidateBlob.type,
        });
        updateXslFileName(window.activeXslFile, xslNameSelector);
        transformationSuccessful = true;
        return transformationSuccessful;
      } else {
        consoleUtils.logError("XSLTProcessor not supported by the Browser.");
        return false;
      }
    } catch (err) {
      consoleUtils.logError(
        `Error fetching candidate XSL file: ${candidate}`,
        err
      );
      continue;
    }
  }

  // If we get here, no transformation worked
  consoleUtils.logInfo("No automatic XSL file transformation applied.");
  // Explicitly maintain UI state
  if (!transformationSuccessful) {
    // Keep previous XSL file name display
    apiClient.getElement(xslNameSelector).then((element) => {
      if (element && !element.textContent) {
        element.textContent = "No transformation applied";
      }
    });

    // Clear viewer content while maintaining button state
    const viewerContent = await apiClient.getElement(viewerSelector);
    if (viewerContent) viewerContent.innerHTML = "";
  }

  // Return explicit boolean without parsing
  return transformationSuccessful;
}

/**
 * Reads a File object as text.
 *
 * @param {File} file - The File object to read.
 * @returns {Promise<string>} A promise that resolves with the file's text content, or rejects with an error.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Displays a spreadsheet using SheetJS.
 *
 * @async
 * @param {File} file - The File object or URL to the spreadsheet file.
 * @param {HTMLElement} container - The HTML element to display the spreadsheet.
 * @returns {Promise<void>} A promise that resolves when the spreadsheet is displayed.
 */
async function displaySpreadsheet(file, container) {
  try {
    const XLSXModule = await import(
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
    );
    const XLSX = XLSXModule.default || XLSXModule;
    const response = await fetch(file);
    if (!response.ok) {
      container.textContent = "Error loading spreadsheet file.";
      throw new Error(`Error loading spreadsheet file ${file.name}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    container.innerHTML = `<pre>${JSON.stringify(jsonData, null, 2)}</pre>`;
  } catch (err) {
    container.textContent = "Error displaying spreadsheet: " + err;
    throw err;
  }
}

export const XmlUtils = {
  DocumentationViewer,
  updateXslFileName,
  createTreeDOM,
  displayAsTree,
  displayRawContent,
  autoTransformXML,
  readFileAsText,
  displaySpreadsheet,
};
