"use strict";

import { SharedLibs } from "../shared/shared_libs.js";

const consoleUtils = SharedLibs.ConsoleUtils;
const apiClient = SharedLibs.ApiClient;
const queryTools = SharedLibs.QueryTools;
const statusManager = SharedLibs.StatusManager;

const DEBUG_PRINT_PROPERTY_TREE = false;

// Utility to execute async tasks with status updates
function withStatus(statusSelector, message, asyncFunc) {
  if (statusSelector) statusManager.set(statusSelector, message);
  return asyncFunc().finally(() => {
    if (statusSelector) statusManager.clear(statusSelector);
  });
}

// Print property tree (unchanged)
function printPropertyTree(tree) {
  consoleUtils.logInfo("📦 Property Tree Structure:");
  function printNode(node, name, depth = 0, isLast = true) {
    const indent = "  ".repeat(depth);
    const branch = depth === 0 ? "" : isLast ? "└─ " : "├─ ";
    consoleUtils.log(
      `${indent}${branch}${consoleUtils.applyStyle(name, "bold")}`
    );
    const childrenEntries = Object.entries(node.children);
    childrenEntries.forEach(([childName, childNode], index) =>
      printNode(
        childNode,
        childName,
        depth + 1,
        index === childrenEntries.length - 1
      )
    );
  }
  Object.entries(tree.children).forEach(([name, node], index, arr) =>
    printNode(node, name, 0, index === arr.length - 1)
  );
}

// Lazy-loading worker for large XML files (unchanged)
const xmlWorkerScript = `
self.onmessage = async (e) => {
  const { fileUrl, chunkSize } = e.data;
  const response = await fetch(fileUrl);
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");

  const nodes = xmlDoc.evaluate("//property", xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  const total = nodes.snapshotLength;
  const properties = [];
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = [];
    for (let j = i; j < Math.min(i + chunkSize, total); j++) {
      chunk.push(nodes.snapshotItem(j).outerHTML);
    }
    self.postMessage({ type: "chunk", data: chunk, index: i });
  }
  self.postMessage({ type: "done" });
};
`;

class DocumentationViewer {
  constructor(config) {
    this.expressionInput = config.expressionInput;
    this.divXMLDisplay = config.divXMLDisplay;
    this.showMdCheckbox = config.showMdCheckbox;
    this.showAiCheckbox = config.showAiCheckbox;
    this.sortCheckbox = config.sortCheckbox;
    this.statusSelector = config.statusSelector;
    this.hintStatus = config.hintStatus || null;
    this.xmlFile = config.xmlFile || "libraries/scriptproperties.xml";
    this.xslFile = config.xslFile || "libraries/scriptproperties.xsl";

    this.xmlDoc = null;
    this.xslDoc = null;
    this.updateTimer = null;
    this.currentRequestGeneration = 0;
    this.propertyTree = { children: {} };
    this.baseKeywords = [];
    this.globalKeywords = [];
    this.allPropertyParts = [];
    this.lazyLoadedChunks = [];
    this.cachedFilter = null; // Step 5: Initialize cache
  }

  async processXMLData(fileUrl, statusSelector = null) {
    consoleUtils.logInfo("Processing XML data with lazy loading...");
    if (statusSelector)
      statusManager.set(statusSelector, "Processing XML chunks...");

    // Construct absolute URL using QueryTools
    const absoluteUrl =
      queryTools.decodeUrl(window.location.origin) +
      "/" +
      fileUrl.replace(/^\/+/, "");

    // Fetch and parse XML in the main thread
    const response = await fetch(absoluteUrl);
    if (!response.ok) {
      consoleUtils.logError(
        `Failed to fetch ${absoluteUrl}: ${response.statusText}`
      );
      return this.buildPropertyTree([]);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    if (xmlDoc.querySelector("parsererror")) {
      consoleUtils.logError(
        `Failed to parse XML from ${absoluteUrl}: Parse error`
      );
      return this.buildPropertyTree([]);
    }

    // Extract properties in the worker
    const workerScript = `
  self.onmessage = (e) => {
    const { xmlText, chunkSize } = e.data;
    console.log("Worker received XML text of length:", xmlText.length);
    const properties = [];
    const total = xmlText.length;
    for (let i = 0; i < total; i += chunkSize) {
      const chunk = xmlText.slice(i, Math.min(i + chunkSize, total));
      self.postMessage({ type: "chunk", data: chunk, index: i });
    }
    self.postMessage({ type: "done" });
  };
  `;

    return new Promise((resolve) => {
      const workerBlob = new Blob([workerScript], {
        type: "application/javascript",
      });
      const worker = new Worker(URL.createObjectURL(workerBlob));
      const chunkSize = 100; // Adjust as needed
      this.lazyLoadedChunks = [];

      worker.onmessage = (e) => {
        if (e.data.type === "chunk") {
          this.lazyLoadedChunks.push(e.data.data);
          consoleUtils.logDebug(
            `Received chunk ${e.data.index / chunkSize + 1}`
          );
        } else if (e.data.type === "done") {
          const allProperties = this.lazyLoadedChunks.flatMap((chunk) =>
            Array.from(
              new DOMParser()
                .parseFromString(chunk.join(""), "application/xml")
                .getElementsByTagName("property")
            ).map((prop) => prop.getAttribute("name"))
          );
          const { tree, baseKeywords, allPropertyParts } =
            this.buildPropertyTree(allProperties);
          this.propertyTree = tree;
          this.baseKeywords = baseKeywords.sort();
          this.allPropertyParts = allPropertyParts;
          if (statusSelector) statusManager.clear(statusSelector);
          resolve(tree);
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        consoleUtils.logError(`Worker error: ${err.message}`);
        if (statusSelector) statusManager.clear(statusSelector);
        resolve(this.buildPropertyTree([]));
        worker.terminate();
      };

      consoleUtils.logDebug(`Worker processing XML from: ${absoluteUrl}`);
      const properties = Array.from(
        xmlDoc.getElementsByTagName("property")
      ).map((prop) => prop.outerHTML);
      worker.postMessage({ xmlText: properties, chunkSize });
    });
  }

  processKeywordData(xml) {
    const keywordNodes = xml.getElementsByTagName("keyword");
    return Array.from(keywordNodes)
      .map((node) => node.getAttribute("name"))
      .filter((name) => name);
  }

  buildPropertyTree(propertyNames) {
    const root = { children: {} };
    const baseKeywordsSet = new Set();
    const partsSet = new Set();

    for (const name of propertyNames) {
      const parts = name.split(".").filter(Boolean);
      if (!parts.length) continue;

      baseKeywordsSet.add(parts[0]);
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
  }

  // Enhanced autocomplete with filtering
  initAutoComplete(statusSelector = null) {
    consoleUtils.logInfo("Initializing autocomplete...");
    if (statusSelector)
      statusManager.set(statusSelector, "Initializing autocomplete...");

    const $ = window.$;
    if ($ && $.fn.autocomplete) {
      $(this.expressionInput).autocomplete({
        source: (request, response) => {
          const term = request.term.trim().toLowerCase();
          if (term.includes(".")) {
            this.handlePropertyLookup(term, response);
          } else {
            this.handleKeywordLookup(term, response);
          }
        },
        minLength: 0,
        delay: 300,
        select: (event, ui) => {
          $(this.expressionInput).val(ui.item.value);
          this.debouncedUpdate();
          return false;
        },
        search: () =>
          this.hintStatus && this.hintStatus.text("Loading hints..."),
        response: () => this.hintStatus && this.hintStatus.text(""),
      });
    } else {
      consoleUtils.logWarning("jQuery UI autocomplete not found.");
    }

    if (statusSelector) statusManager.clear(statusSelector);
  }

  handlePropertyLookup(term, response) {
    const parts = term.split(".").filter(Boolean);
    let suggestions =
      parts.length > 0 && this.propertyTree.children[parts[0]]
        ? this.searchPaths(this.propertyTree, parts, "")
        : this.globalKeywords.filter((k) =>
            k.toLowerCase().startsWith(parts[0])
          );
    response(suggestions);
  }

  handleKeywordLookup(term, response) {
    response(
      this.globalKeywords.filter((k) => k.toLowerCase().startsWith(term))
    );
  }

  searchPaths(node, parts, prefix) {
    if (!parts.length) {
      return Object.keys(node.children).length > 0 ? [prefix + "."] : [prefix];
    }

    const segment = parts[0].toLowerCase();
    let suggestions = [];
    for (const key in node.children) {
      if (key.toLowerCase().startsWith(segment)) {
        const child = node.children[key];
        suggestions = suggestions.concat(
          parts.length === 1 && Object.keys(child.children).length > 0
            ? [prefix + key + "."]
            : this.searchPaths(child, parts.slice(1), prefix + key + ".")
        );
      }
    }
    return suggestions;
  }

 getTransformationParameters() {
  // Decode the expression to handle URL-encoded characters (e.g., %24 -> $)
  const decodedExpression = queryTools.decodeUrl(this.expressionInput.value.trim());
  const expression = encodeURIComponent(decodedExpression); // Encode for XSL parameter, but already decoded for internal use
  const scriptType =
    this.showMdCheckbox.checked && this.showAiCheckbox.checked
      ? "any"
      : this.showMdCheckbox.checked
      ? "md"
      : this.showAiCheckbox.checked
      ? "ai"
      : "";
  const sort = this.sortCheckbox.checked ? "true" : "false";
  return { expression, scriptType, sort };
}

  // Sorting Optimization & Caching
  async filterXMLContent(xmlDoc, expression, sortEnabled = false) {
    if (
      this.cachedFilter?.expression === expression &&
      this.cachedFilter?.sortEnabled === sortEnabled
    ) {
      consoleUtils.logDebug("Using cached filter result");
      return this.cachedFilter.result;
    }

    const properties = xmlDoc.querySelectorAll("property");
    const filtered = Array.from(properties).filter((prop) => {
      const name = prop.getAttribute("name") || "";
      if (!expression) return true;
      try {
        const regex = new RegExp(expression, "i");
        return regex.test(name) || regex.test(prop.textContent);
      } catch {
        return (
          name.includes(expression) || prop.textContent.includes(expression)
        );
      }
    });

    if (sortEnabled) {
      filtered.sort((a, b) => {
        const nameA = a.getAttribute("name") || "";
        const nameB = b.getAttribute("name") || "";
        return nameA.localeCompare(nameB);
      });
    }

    const resultDoc = document.implementation.createDocument("", "root", null);
    filtered.forEach((prop) =>
      resultDoc.documentElement.appendChild(prop.cloneNode(true))
    );

    this.cachedFilter = { expression, sortEnabled, result: resultDoc };
    consoleUtils.logDebug("Cached new filter result");

    return resultDoc;
  }

  async transformXML(statusSelector = null) {
  if (!this.xmlDoc) return;

  await withStatus(statusSelector, "Transforming XML...", async () => {
    const { expression: encodedExpression, scriptType, sort } = this.getTransformationParameters();
    // Use the decoded expression for both filtering and XSL parameters (avoid encoding for XSL)
    const decodedExpression = queryTools.decodeUrl(this.expressionInput.value.trim());

    let resultDoc;

    if (this.xmlFile.includes("scriptproperties.xml")) {
      const filteredDoc = await filterScriptProperties(this.xmlDoc, decodedExpression);
      consoleUtils.logDebug(`Filtered document for ${decodedExpression} has ${filteredDoc.documentElement.childNodes.length} nodes`);
      if (!filteredDoc.documentElement.childNodes.length) {
        consoleUtils.logWarning(`No results found for expression: ${decodedExpression}`);
        resultDoc = document.createDocumentFragment();
        const noResults = apiClient.createElement("p", {
          class: "alert alert-info",
          textContent: `No matching properties or keywords found for "${decodedExpression}".`,
        });
        resultDoc.appendChild(noResults);
      } else if (this.xslDoc) {
        const processor = new XSLTProcessor();
        processor.importStylesheet(this.xslDoc);
        // Use decoded expression for XSL parameter to match datatype filtering
        processor.setParameter(null, "expression", decodedExpression);
        processor.setParameter(null, "scripttype", scriptType);
        processor.setParameter(null, "sort", sort);
        resultDoc = processor.transformToFragment(filteredDoc, document);
        consoleUtils.logDebug("XSL transformation result:", resultDoc);
        if (!resultDoc.children.length) {
          consoleUtils.logWarning(`XSL transformation resulted in empty output for ${decodedExpression}`);
          resultDoc = document.createDocumentFragment();
          const noResults = apiClient.createElement("p", {
            class: "alert alert-info",
            textContent: `No matching properties or keywords found for "${decodedExpression}".`,
          });
          resultDoc.appendChild(noResults);
        }
      } else {
        resultDoc = document.createDocumentFragment();
        Array.from(filteredDoc.documentElement.childNodes).forEach((node) =>
          resultDoc.appendChild(document.importNode(node, true))
        );
      }
    } else {
      // Handle other XML files similarly
      const filteredDoc = await filterXMLTree(this.xmlDoc, decodedExpression);
      if (!filteredDoc.documentElement.childNodes.length) {
        consoleUtils.logWarning(`No results found for expression: ${decodedExpression}`);
        resultDoc = document.createDocumentFragment();
        const noResults = apiClient.createElement("p", {
          class: "alert alert-info",
          textContent: `No matching elements found for "${decodedExpression}".`,
        });
        resultDoc.appendChild(noResults);
      } else if (this.xslDoc) {
        const processor = new XSLTProcessor();
        processor.importStylesheet(this.xslDoc);
        processor.setParameter(null, "expression", decodedExpression); // Use decoded for XSL
        processor.setParameter(null, "scripttype", scriptType);
        processor.setParameter(null, "sort", sort);
        resultDoc = processor.transformToFragment(filteredDoc, document);
        consoleUtils.logDebug("XSL transformation result:", resultDoc);
        if (!resultDoc.children.length) {
          consoleUtils.logWarning(`XSL transformation resulted in empty output for ${decodedExpression}`);
          resultDoc = document.createDocumentFragment();
          const noResults = apiClient.createElement("p", {
            class: "alert alert-info",
            textContent: `No matching elements found for "${decodedExpression}".`,
          });
          resultDoc.appendChild(noResults);
        }
      } else {
        resultDoc = document.createDocumentFragment();
        Array.from(filteredDoc.documentElement.childNodes).forEach((node) =>
          resultDoc.appendChild(document.importNode(node, true))
        );
      }
    }

    this.divXMLDisplay.replaceChildren(resultDoc || document.createDocumentFragment());
    consoleUtils.logSuccess("XML transformation completed.");
  });
}

  debouncedUpdate() {
    console.log("debouncedUpdate triggered");
    const generation = ++this.currentRequestGeneration;
    if (this.updateTimer) clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(async () => {
      if (generation === this.currentRequestGeneration) {
        const expression = this.expressionInput.value.trim();
        console.log("Updating with expression:", expression);
        if (document.querySelector(".tree")) {
          await displayAsTree(this.xmlDoc, this.divXMLDisplay, expression);
        } else {
          await this.transformXML();
        }
      }
    }, 300);
  }

  async init(statusSelector = this.statusSelector) {
    await withStatus(
      statusSelector,
      "Initializing documentation viewer...",
      async () => {
        const [xmlDoc, xslDoc] = await Promise.all([
          apiClient.fetchXML(this.xmlFile),
          apiClient.fetchXML(this.xslFile).catch(() => null), // Allow XSL to be optional
        ]);
        if (!xmlDoc) throw new Error("Failed to load XML file.");

        this.xmlDoc = xmlDoc;
        this.xslDoc = xslDoc;

        await this.processXMLData(this.xmlFile);
        this.globalKeywords = Array.from(
          new Set([
            ...this.baseKeywords,
            ...this.processKeywordData(this.xmlDoc),
          ])
        ).sort();

        this.initAutoComplete();
        this.expressionInput.focus();
        this.debouncedUpdate();
        consoleUtils.logSuccess("Documentation viewer initialized.");
      }
    );
  }
}

// ... inside xml_utils.js, after the DocumentationViewer class ...

// Generic XML filtering function
async function filterXMLTree(xmlDoc, expression) {
  const filteredDoc = document.implementation.createDocument("", "root", null);
  const root = filteredDoc.documentElement;

  function filterNode(node) {
    const matches = nodeMatchesExpression(node, expression);
    const hasMatchingDescendant = hasMatchingDescendant(node, expression);
    if (matches || hasMatchingDescendant) {
      const clone = filteredDoc.importNode(node, false);
      Array.from(node.childNodes).forEach((child) => {
        const childClone = filterNode(child);
        if (childClone) clone.appendChild(childClone);
      });
      return clone;
    }
    return null;
  }

  const filteredRoot = filterNode(xmlDoc.documentElement);
  if (filteredRoot) root.appendChild(filteredRoot);
  return filteredDoc;
}

async function filterScriptProperties(xmlDoc, expression) {
  // The expression is now decoded in getTransformationParameters, so use it directly
  consoleUtils.logDebug(
    `Filtering scriptproperties with expression: ${expression}`
  );

  const filteredDoc = document.implementation.createDocument(
    "",
    "scriptproperties",
    null
  );
  const root = filteredDoc.documentElement;

  const parts = expression.split(".").filter(Boolean);
  const isPropertySearch = expression.startsWith(".");
  const isDatatypeSearch = expression.startsWith("$");

  if (!expression || !parts.length) {
    // No filter, include all keywords and datatypes
    const allKeywords = Array.from(xmlDoc.getElementsByTagName("keyword"));
    const allDatatypes = Array.from(xmlDoc.getElementsByTagName("datatype"));
    consoleUtils.logDebug(
      `No filter applied, found ${allKeywords.length} keywords and ${allDatatypes.length} datatypes`
    );
    allKeywords.forEach((node) =>
      root.appendChild(filteredDoc.importNode(node, true))
    );
    allDatatypes.forEach((node) =>
      root.appendChild(filteredDoc.importNode(node, true))
    );
  } else if (isPropertySearch) {
    // .prop searches all properties (e.g., ".pla" for properties with "pla")
    const propRegex = new RegExp(parts[0], "i");
    consoleUtils.logDebug(`Property search for: ${parts[0]}`);
    const allNodes = Array.from(xmlDoc.getElementsByTagName("keyword")).concat(
      Array.from(xmlDoc.getElementsByTagName("datatype"))
    );
    allNodes.forEach((node) => {
      const properties = Array.from(node.getElementsByTagName("property"));
      const matchingProps = properties.filter((prop) =>
        propRegex.test(prop.getAttribute("name") || "")
      );
      if (matchingProps.length) {
        consoleUtils.logDebug(
          `Found ${matchingProps.length} matching properties in node ${node.nodeName}`
        );
        const clone = filteredDoc.importNode(node, false);
        matchingProps.forEach((prop) =>
          clone.appendChild(filteredDoc.importNode(prop, true))
        );
        root.appendChild(clone);
      }
    });
  } else {
    // Keyword or datatype search (handle $ prefix for datatypes)
    const baseTerm = isDatatypeSearch ? parts[0].substring(1) : parts[0]; // Remove $ for datatype matching
    const baseRegex = new RegExp(baseTerm, "i");
    consoleUtils.logDebug(
      `Search for: ${baseTerm} (isDatatypeSearch: ${isDatatypeSearch})`
    );

    let matchingNodes = [];
    if (isDatatypeSearch) {
      // Filter datatypes (e.g., $PlayerShip)
      matchingNodes = Array.from(
        xmlDoc.getElementsByTagName("datatype")
      ).filter((node) => {
        const name = node.getAttribute("name") || "";
        return (
          baseRegex.test(name) &&
          !(
            node.getAttribute("pseudo") === "true" ||
            node.getAttribute("pseudo") === "1"
          )
        );
      });
      consoleUtils.logDebug(
        `Found ${matchingNodes.length} matching datatypes for ${baseTerm}`
      );
    } else {
      // Filter keywords (e.g., Player)
      matchingNodes = Array.from(xmlDoc.getElementsByTagName("keyword")).filter(
        (node) => {
          const name = node.getAttribute("name") || "";
          return (
            baseRegex.test(name) &&
            (!node.getAttribute("script") ||
              node.getAttribute("script") === "any" ||
              $scripttype === "any" ||
              node.getAttribute("script") === $scripttype)
          );
        }
      );
      consoleUtils.logDebug(
        `Found ${matchingNodes.length} matching keywords for ${baseTerm}`
      );
    }

    matchingNodes.forEach((node) => {
      const clone = filteredDoc.importNode(node, false);
      let currentNodes = Array.from(node.getElementsByTagName("property"));

      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const partRegex = new RegExp(parts[i], "i");
          currentNodes = currentNodes.filter((prop) =>
            partRegex.test(prop.getAttribute("name") || "")
          );
          consoleUtils.logDebug(
            `Filtering for part ${parts[i]}, found ${currentNodes.length} nodes`
          );
          if (i === parts.length - 1) {
            currentNodes.forEach((prop) =>
              clone.appendChild(filteredDoc.importNode(prop, true))
            );
          }
        }
        if (currentNodes.length) root.appendChild(clone);
      } else {
        currentNodes.forEach((prop) =>
          clone.appendChild(filteredDoc.importNode(prop, true))
        );
        root.appendChild(clone);
      }
    });
  }

  consoleUtils.logDebug(
    `Filtered document has ${root.childNodes.length} child nodes`
  );
  return filteredDoc;
}

// Utility functions
async function updateXslFileName(activeXslFile, selector = "#xslFileName") {
  const xslFileNameEl = await apiClient.getElement(selector);
  if (xslFileNameEl) {
    xslFileNameEl.textContent = activeXslFile
      ? activeXslFile.name || activeXslFile
      : "No file chosen";
  }
}

function createTreeDOM(node, expression = "") {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

  const matches = nodeMatchesExpression(node, expression);
  const hasMatchingDescendantNode = hasMatchingDescendant(node, expression);
  if (!matches && !hasMatchingDescendantNode) return null;

  const li = apiClient.createElement("li");
  const span = apiClient.createElement("span", { classList: "tree-node" });
  const attributesList = Array.from(node.attributes).map((attr) =>
    attr.name === "name"
      ? `\n🔹${attr.name}: ${attr.value}`
      : `\n🔸${attr.name}: ${attr.value}`
  );
  const attrDisplay = attributesList.length
    ? ` <span class="tree-attributes">(${attributesList.join(", ")})</span>`
    : "";
  const textDisplay =
    node.textContent.trim() && !node.children.length
      ? `: <span class="tree-value">${node.textContent.trim()}</span>`
      : "";

  span.innerHTML = `${node.nodeName}${attrDisplay}${textDisplay}`;
  span.setAttribute(
    "data-tooltip",
    (node.parentElement
      ? `💠Parent: ${node.parentElement.nodeName}`
      : `🔶Root Node`) +
      `\n🔻Element: ${node.nodeName}` +
      (node.getAttribute("type")
        ? `\n🔷Type: ${node.getAttribute("type")}`
        : "") +
      (node.getAttribute("result")
        ? `\n📜Result: ${node.getAttribute("result")}`
        : "") +
      `\n` +
      (attributesList.length
        ? `Attributes: ${attributesList.join(", ")}`
        : "No attributes")
  );
  li.appendChild(span);

  if (node.children.length) {
    const ul = apiClient.createElement("ul");
    Array.from(node.children).forEach((child) => {
      const childTree = createTreeDOM(child, expression);
      if (childTree) ul.appendChild(childTree);
    });
    if (ul.children.length > 0) li.appendChild(ul);
  } else {
    span.classList.add("tree-node-no-children");
  }
  return li;
}

function nodeMatchesExpression(node, expression) {
  if (!expression) return true;
  const parts = expression.split(".");
  let currentNode = node;
  for (const part of parts) {
    try {
      const regex = new RegExp(part, "i");
      const name = currentNode.getAttribute("name") || currentNode.nodeName;
      if (!regex.test(name) && !regex.test(currentNode.textContent))
        return false;
      currentNode = Array.from(currentNode.children).find((child) =>
        regex.test(child.getAttribute("name") || child.nodeName)
      );
      if (!currentNode && part !== parts[parts.length - 1]) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function hasMatchingDescendant(node, expression) {
  return Array.from(node.querySelectorAll("*")).some((descendant) =>
    nodeMatchesExpression(descendant, expression)
  );
}

async function displayAsTree(xmlDoc, container, expression = "") {
  if (!xmlDoc || !xmlDoc.documentElement) {
    console.error("Invalid or undefined XML document passed to displayAsTree");
    container.innerHTML =
      "<p class='alert alert-danger'>Error: Invalid XML document.</p>";
    return;
  }
  const filteredDoc =
    xmlDoc.documentElement.tagName === "scriptproperties"
      ? await filterScriptProperties(xmlDoc, expression)
      : await filterXMLTree(xmlDoc, expression);
  const treeRoot = apiClient.createElement("ul", { classList: "tree" });
  const treeDOM = createTreeDOM(filteredDoc.documentElement, expression);
  if (treeDOM) treeRoot.appendChild(treeDOM);
  container.innerHTML = "";
  container.appendChild(treeRoot);
  container.querySelectorAll(".tree-node").forEach((node) =>
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      const ul = node.parentElement.querySelector("ul");
      if (ul) ul.classList.toggle("collapsed");
    })
  );
}

async function displayRawContent(file, container) {
  const response = await fetch(file);
  if (!response.ok) throw new Error("Failed to load file.");
  container.innerHTML = `<pre>${queryTools.escapeHtml(
    await response.text()
  )}</pre>`;
}

async function autoTransformXML(
  xmlFile,
  viewerSelector = "#viewerContent",
  xslNameSelector = "#xslFileName",
  statusSelector = "#statusIndicator"
) {
  const baseName = xmlFile.replace(/\.xml$/i, "");
  const candidates = [`${baseName}.xsl`, `${baseName}.xslt`];
  let success = false;

  await withStatus(
    statusSelector,
    "Attempting auto-transformation...",
    async () => {
      for (const candidate of candidates) {
        try {
          consoleUtils.logDebug(`Trying XSL/XSLT candidate: ${candidate}`);
          const xmlDoc = await apiClient.fetchXML(xmlFile);
          const xsltResponse = await fetch(candidate);
          if (!xsltResponse.ok) {
            throw new Error(`XSLT fetch failed: ${xsltResponse.status}`);
          }
          const xsltText = await xsltResponse.text();
          const xsltDoc = new DOMParser().parseFromString(
            xsltText,
            "application/xml"
          );
          if (xsltDoc.querySelector("parsererror")) {
            throw new Error(`XSLT parse error in ${candidate}`);
          }

          const xsltProcessor = new XSLTProcessor();
          xsltProcessor.importStylesheet(xsltDoc);
          const resultDoc = xsltProcessor.transformToFragment(xmlDoc, document);

          const viewerContent = await apiClient.getElement(viewerSelector);
          viewerContent.innerHTML = "";
          viewerContent.appendChild(resultDoc);

          window.activeXslFile = candidate;
          await updateXslFileName(candidate, xslNameSelector);
          success = true;
          consoleUtils.logSuccess(`Auto-transformed with ${candidate}`);
          break; // Exit loop on success
        } catch (err) {
          consoleUtils.logDebug(
            `Candidate ${candidate} failed: ${err.message}`
          );
          // Continue to the next candidate unless this was the last one
        }
      }
      if (!success) {
        consoleUtils.logWarning(
          "No valid XSL/XSLT found for auto-transformation."
        );
      }
    }
  );

  return success;
}

async function displaySpreadsheet(
  file,
  container,
  tabsContainer,
  expressionInput
) {
  const XLSX = await import(
    "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs"
  );
  const response = await fetch(file);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  tabsContainer.innerHTML = "";
  container.innerHTML = "";

  workbook.SheetNames.forEach((sheetName, index) => {
    const tab = apiClient.createElement("li");
    tab.classList.add("tab");
    if (index === 0) tab.classList.add("active");
    tab.textContent = sheetName;
    tab.addEventListener("click", () => {
      tabsContainer
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      displaySheet(workbook, sheetName, container, expressionInput);
    });
    tabsContainer.appendChild(tab);
  });

  await displaySheet(
    workbook,
    workbook.SheetNames[0],
    container,
    expressionInput
  );
}

async function displaySheet(workbook, sheetName, container, expressionInput) {
  const XLSX = await import(
    "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs"
  );
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const table = apiClient.createElement("table");
  jsonData.forEach((row, rowIndex) => {
    const tr = apiClient.createElement("tr");
    row.forEach((cell) => {
      const td = apiClient.createElement(rowIndex === 0 ? "th" : "td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.innerHTML = "";
  container.appendChild(table);

  const expr = expressionInput.value.trim().toLowerCase();
  if (expr) {
    const cells = container.querySelectorAll("td, th");
    cells.forEach((cell) => {
      if (cell.textContent.toLowerCase().includes(expr)) {
        cell.style.backgroundColor = "yellow";
      }
    });
  }
}

export const XmlUtils = {
  DocumentationViewer,
  updateXslFileName,
  createTreeDOM,
  displayAsTree,
  displayRawContent,
  autoTransformXML,
  displaySpreadsheet,
};
