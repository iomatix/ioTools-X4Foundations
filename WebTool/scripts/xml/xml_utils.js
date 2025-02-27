"use strict";

import ApiClient from "../shared/api_client.js";
import ConsoleUtils from "../shared/console_utils.js";
import { SharedLibs } from "../shared/shared_libs.js";

const consoleUtils = SharedLibs.ConsoleUtils;
const apiClient = SharedLibs.ApiClient;
const statusManager = SharedLibs.StatusManager;

/**
 * DocumentationViewer handles XSLT transformation of an XML file,
 * supports filtering (via an expression), sorting, and keyword lookups.
 */
class DocumentationViewer {
  /**
   * @param {Object} config - Configuration with DOM elements and file paths.
   * @param {HTMLElement} config.expressionInput - Filter expression input.
   * @param {HTMLElement} config.divXMLDisplay - Container where transformed XML is shown.
   * @param {HTMLElement} config.showMdCheckbox - Checkbox for MD-specific keywords.
   * @param {HTMLElement} config.showAiCheckbox - Checkbox for AI-specific keywords.
   * @param {HTMLElement} config.sortCheckbox - Checkbox to enable sorting.
   * @param {HTMLElement} config.statusIndicator - Status message element.
   * @param {jQuery} [config.hintStatus] - jQuery element for hint status (optional).
   * @param {string} [config.xmlFile] - XML file path (default: "scriptproperties.xml").
   * @param {string} [config.xslFile] - XSL file path (default: "scriptproperties.xsl").
   */
  constructor(config) {
    this.expressionInput = config.expressionInput;
    this.divXMLDisplay = config.divXMLDisplay;
    this.showMdCheckbox = config.showMdCheckbox;
    this.showAiCheckbox = config.showAiCheckbox;
    this.sortCheckbox = config.sortCheckbox;
    this.statusIndicator = config.statusIndicator;
    this.hintStatus = config.hintStatus || null;

    // File path configuration.
    this.xmlFile = config.xmlFile || "scriptproperties.xml";
    this.xslFile = config.xslFile || "scriptproperties.xsl";

    // Internal state.
    this.xmlDoc = null;
    this.xslDoc = null;
    this.updateTimer = null;
    this.currentRequestGeneration = 0;
    this.propertyTree = { children: {} };
    this.baseKeywords = [];
    this.globalKeywords = [];
    this.allPropertyParts = [];
  }

  printPropertyTree(tree) {
    consoleUtils.logInfo("📦 Property Tree Structure:");
    const printNode = (node, name, depth = 0, isLast = true) => {
      const indent = "  ".repeat(depth);
      const branch = depth === 0 ? "" : isLast ? "└─ " : "├─ ";
      const styledName = consoleUtils.applyStyle(name, "bold");
      consoleUtils.log(`${indent}${branch}${styledName}`);
      Object.entries(node.children).forEach(
        ([childName, childNode], index, arr) => {
          printNode(childNode, childName, depth + 1, index === arr.length - 1);
        }
      );
    };
    Object.entries(tree.children).forEach(([name, node], index, arr) => {
      printNode(node, name, 0, index === arr.length - 1);
    });
  }

  buildPropertyTree(propertyNames) {
    const root = { children: {} };
    const baseKeywordsSet = new Set();
    const partsSet = new Set();
    for (const name of propertyNames) {
      const parts = name.split(".");
      if (parts.length === 0) continue;
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

  processXMLData(xml, statusSelector = null) {
    consoleUtils.logInfo("Processing XML data...");
    if (statusSelector)
      statusManager.set(statusSelector, "Processing XML data...");
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
      consoleUtils.logSuccess(`Extracted ${properties.length} properties.`);
      return this.buildPropertyTree(properties);
    } catch (error) {
      consoleUtils.logError(`Error processing XML: ${error.message}`);
      return this.buildPropertyTree([]);
    } finally {
      if (statusSelector) statusManager.clear(statusSelector);
    }
  }

  processKeywordData(xml) {
    const keywordNodes = xml.getElementsByTagName("keyword");
    let keywords = [];
    for (let i = 0; i < keywordNodes.length; i++) {
      const name = keywordNodes[i].getAttribute("name");
      if (name) keywords.push(name);
    }
    return keywords;
  }

  initAutoComplete(statusSelector = null) {
    consoleUtils.logInfo("Initializing autocomplete...");
    if (statusSelector)
      statusManager.set(statusSelector, "Initializing autocomplete...");
    const $ = window.$;
    if ($ && $.fn.autocomplete) {
      try {
        $(this.expressionInput).autocomplete({
          source: (request, response) => {
            const term = request.term.trim();
            if (term.indexOf(".") !== -1) {
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
          search: () => {
            if (this.hintStatus) this.hintStatus.text("Loading hints...");
          },
          response: () => {
            if (this.hintStatus) this.hintStatus.text("");
          },
        });
      } catch (error) {
        consoleUtils.logError(`Error initializing autocomplete: ${error}`);
      } finally {
        if (statusSelector) statusManager.clear(statusSelector);
      }
    } else {
      consoleUtils.logWarning(
        "jQuery UI autocomplete not found. Skipping initialization."
      );
    }
  }

  searchPaths(node, parts, prefix) {
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
          if (Object.keys(child.children).length > 0) suggestion += ".";
          suggestions.push(suggestion);
        } else {
          suggestions = suggestions.concat(
            this.searchPaths(child, parts.slice(1), prefix + key + ".")
          );
        }
      }
    }
    return suggestions;
  }

  handlePropertyLookup(term, response) {
    const normalized = term.startsWith(".") ? term.slice(1) : term;
    const parts = normalized.split(".").filter(Boolean);
    if (parts.length === 0) {
      response(this.globalKeywords);
      return;
    }
    let suggestions = [];
    if (this.propertyTree.children[parts[0]]) {
      suggestions = this.searchPaths(this.propertyTree, parts, ".");
    }
    if (suggestions.length === 0 && parts.length > 1) {
      suggestions = this.globalKeywords.filter(
        (k) => k.toLowerCase() === parts[0].toLowerCase()
      );
    }
    if (suggestions.length === 0) {
      suggestions = this.globalKeywords.filter((k) =>
        k.toLowerCase().startsWith(parts[0].toLowerCase())
      );
    }
    response(suggestions);
  }

  handleKeywordLookup(term, response) {
    const query = term.toLowerCase();
    const suggestions = this.globalKeywords.filter((k) =>
      k.toLowerCase().startsWith(query)
    );
    response(suggestions);
  }

  async transformXML(statusSelector = null) {
    consoleUtils.logInfo("Starting XML transformation...");
    if (statusSelector)
      statusManager.set(statusSelector, "Transforming XML...");
    try {
      if (!this.xmlDoc || !this.xslDoc) {
        consoleUtils.logError("XML/XSL documents are not loaded.");
        return;
      }
      const processor = new XSLTProcessor();
      processor.importStylesheet(this.xslDoc);
      const expression = encodeURIComponent(this.expressionInput.value.trim());
      processor.setParameter(null, "expression", expression);
      const scriptType =
        this.showMdCheckbox.checked && this.showAiCheckbox.checked
          ? "any"
          : this.showMdCheckbox.checked
          ? "md"
          : this.showAiCheckbox.checked
          ? "ai"
          : "";
      processor.setParameter(null, "scripttype", scriptType);
      processor.setParameter(
        null,
        "sort",
        this.sortCheckbox.checked ? "true" : "false"
      );
      const fragment = processor.transformToFragment(this.xmlDoc, document);
      this.divXMLDisplay.replaceChildren(fragment);
      consoleUtils.logSuccess("XML transformation completed.");
    } catch (error) {
      consoleUtils.logError(`Transformation error: ${error.message}`);
    } finally {
      if (statusSelector) statusManager.clear(statusSelector);
    }
  }

  debouncedUpdate() {
    try {
      const generation = ++this.currentRequestGeneration;
      if (this.updateTimer) clearTimeout(this.updateTimer);
      this.updateTimer = setTimeout(async () => {
        if (generation === this.currentRequestGeneration) {
          await this.transformXML();
        }
      }, 300);
    } catch (error) {
      consoleUtils.logError(`Debounced update error: ${error.message}`);
    } finally {
      this.printPropertyTree(this.propertyTree);
    }
  }

  async init(statusSelector = this.statusIndicator) {
    consoleUtils.logInfo("Initializing documentation viewer...");
    if (statusSelector)
      statusManager.set(statusSelector, "Initializing documentation viewer...");
    try {
      [this.xmlDoc, this.xslDoc] = await Promise.all([
        apiClient.fetchXML(this.xmlFile),
        apiClient.fetchXML(this.xslFile),
      ]);
      if (!this.xmlDoc || !this.xslDoc) {
        throw new Error("Failed to load required XML files.");
      }
      const {
        tree,
        baseKeywords: bk,
        allPropertyParts: ap,
      } = this.processXMLData(this.xmlDoc);
      this.propertyTree = tree;
      this.baseKeywords = bk.sort();
      this.allPropertyParts = ap;
      const extractedKeywords = this.processKeywordData(this.xmlDoc);
      this.globalKeywords = Array.from(
        new Set([...this.baseKeywords, ...extractedKeywords])
      ).sort();
      this.initAutoComplete();
      this.expressionInput.focus();
      this.debouncedUpdate();
      consoleUtils.logSuccess("Documentation viewer initialized.");
    } catch (error) {
      consoleUtils.logError(`Initialization error: ${error.message}`);
      alert(
        "Failed to initialize documentation viewer. Please report this issue."
      );
    } finally {
      if (statusSelector) statusManager.clear(statusSelector);
    }
  }
}

/* Additional utility functions */

// Updates the UI element that shows the current XSL file name.
function updateXslFileName(activeXslFile) {
  const xslFileNameEl = document.getElementById("xslFileName");
  if (xslFileNameEl) {
    xslFileNameEl.textContent = activeXslFile
      ? activeXslFile.name || activeXslFile
      : "No file chosen";
  }
}

// Create a DOM tree view (using nested UL/LI elements) from an XML node.
function createTreeDOM(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.classList.add("tree-node");
  const attributesList = [];
  for (const attr of node.attributes) {
    let attrText =
      attr.name === "name"
        ? `🔹${attr.name}: ${attr.value}`
        : `${attr.name}: ${attr.value}`;
    attributesList.push(attrText);
  }
  const attrDisplay = attributesList.length
    ? ` <span class="tree-attributes">(${attributesList.join(", ")})</span>`
    : "";
  const textContent = node.textContent.trim();
  const textDisplay =
    textContent && node.children.length === 0
      ? `: <span class="tree-value">${textContent}</span>`
      : "";
  span.innerHTML = `${node.nodeName}${attrDisplay}${textDisplay}`;
  span.setAttribute(
    "data-tooltip",
    `Element: ${node.nodeName}\nAttributes: ${attributesList.join(", ")}`
  );
  li.appendChild(span);
  if (node.children.length > 0) {
    const ul = document.createElement("ul");
    for (let child of node.children) {
      const childTree = createTreeDOM(child);
      if (childTree) ul.appendChild(childTree);
    }
    li.appendChild(ul);
  } else {
    span.classList.add("tree-node-no-children");
  }
  return li;
}

// Displays the XML as a collapsible tree view.
async function displayAsTree(file, container) {
  try {
    const response = await fetch(file);
    if (!response.ok) {
      container.textContent = "Error loading file.";
      return;
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const treeRoot = document.createElement("ul");
    treeRoot.classList.add("tree");
    const treeDOM = createTreeDOM(xmlDoc.documentElement);
    if (treeDOM) treeRoot.appendChild(treeDOM);
    container.innerHTML = "";
    container.appendChild(treeRoot);
    // Attach collapse/expand events.
    container.querySelectorAll(".tree-node").forEach((node) => {
      node.addEventListener("click", function (e) {
        e.stopPropagation();
        const ul = this.parentElement.querySelector("ul");
        if (ul) ul.classList.toggle("collapsed");
      });
    });
  } catch (err) {
    container.textContent = "Error displaying tree: " + err;
  }
}

// Displays the raw XML file content (with HTML escaping).
async function displayRawContent(file, container) {
  try {
    const response = await fetch(file);
    if (!response.ok) {
      container.textContent = "Error loading file.";
      return;
    }
    const text = await response.text();
    container.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
  } catch (err) {
    container.textContent = "Error: " + err;
  }
}

// Escapes HTML special characters.
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Attempt to automatically transform XML using candidate XSL files.
async function autoTransformXML(xmlFile) {
  const baseName = xmlFile.replace(/\.xml$/i, "");
  const candidates = [`${baseName}.xsl`, `${baseName}.xslt`];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        ConsoleUtils.logDebug(
          `Error fetching candidate XSL file: ${candidate} - ${response.status}`
        );
        continue;
      }
      const xslText = await response.text();
      const xmlResponse = await fetch(xmlFile);
      if (!xmlResponse.ok) {
        ConsoleUtils.logError(
          `Error while loading XML file: ${xmlFile} - ${xmlResponse.status}`
        );
        return false;
      }
      const xmlText = await xmlResponse.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const xslDoc = parser.parseFromString(xslText, "application/xml");
      if (window.XSLTProcessor) {
        const xsltProcessor = new XSLTProcessor();
        xsltProcessor.importStylesheet(xslDoc);
        const resultDocument = xsltProcessor.transformToFragment(
          xmlDoc,
          document
        );
        const viewerContent = await ApiClient.getElement("#viewerContent");
        if (viewerContent) {
          viewerContent.innerHTML = "";
          viewerContent.appendChild(resultDocument);
        } else {
          ConsoleUtils.logDebug("Viewer content element not found");
          return false;
        }
        // Update activeXslFile.
        const candidateResponse = await fetch(candidate);
        const candidateBlob = await candidateResponse.blob();
        const candidateName = candidate.split("/").pop();
        window.activeXslFile = new File([candidateBlob], candidateName, {
          type: candidateBlob.type,
        });
        updateXslFileName(window.activeXslFile);
        return true;
      } else {
        ConsoleUtils.logError("XSLTProcessor not supported.");
        return false;
      }
    } catch (err) {
      ConsoleUtils.logError(
        "Error fetching candidate XSL file:",
        candidate,
        err
      );
    }
  }
  ConsoleUtils.logInfo("No automatic XSL file transformation applied.");
  return false;
}

// Reads a File object as text.
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// For XLS/XLSX support: display spreadsheet using SheetJS.
async function displaySpreadsheet(file, container) {
  try {
    const XLSXModule = await import(
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
    );
    const XLSX = XLSXModule.default || XLSXModule;
    const response = await fetch(file);
    if (!response.ok) {
      container.textContent = "Error loading spreadsheet file.";
      return;
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    container.innerHTML = `<pre>${JSON.stringify(jsonData, null, 2)}</pre>`;
  } catch (err) {
    container.textContent = "Error displaying spreadsheet: " + err;
  }
}

export const XmlUtils = {
  DocumentationViewer,
  updateXslFileName,
  createTreeDOM,
  displayAsTree,
  displayRawContent,
  escapeHtml,
  autoTransformXML,
  readFileAsText,
  displaySpreadsheet,
};
