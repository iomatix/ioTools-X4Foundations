"use strict";

import { SharedLibs } from "../shared/shared_libs.js";
import { GenericXMLFilteringStrategy } from "./generic_xml_filtering_strategy.js";
import { ScriptPropertiesStrategy } from "./script_properties_strategy.js";
import {
  handlePropertyLookup,
  handleKeywordLookup,
} from "./xml_autocomplete_utils.js";
import {
  nodeMatchesExpression,
  hasMatchingDescendant,
} from "./xml_filter_utils.js";

const consoleUtils = SharedLibs.ConsoleUtils;
const apiClient = SharedLibs.ApiClient;
const queryTools = SharedLibs.QueryTools;
const statusManager = SharedLibs.StatusManager;

// Utility to execute async tasks with status updates
function withStatus(statusSelector, message, asyncFunc) {
  if (statusSelector) statusManager.set(statusSelector, message);
  return asyncFunc().finally(() => {
    if (statusSelector) statusManager.clear(statusSelector);
  });
}

/**
 * Class to manage XML documentation viewing with filtering, tree display, and autocomplete.
 */
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
    this.filteringStrategy = this.getFilteringStrategy(); // Ensure initialization
  }

  getFilteringStrategy() {
    return this.xmlFile.includes("scriptproperties.xml")
      ? new ScriptPropertiesStrategy()
      : new GenericXMLFilteringStrategy();
  }

  async processXMLData(fileUrl, statusSelector = null) {
    consoleUtils.logInfo("Processing XML data with lazy loading...");
    if (statusSelector)
      statusManager.set(statusSelector, "Processing XML chunks...");

    const absoluteUrl =
      queryTools.decodeUrl(window.location.origin) +
      "/" +
      fileUrl.replace(/^\/+/, "");

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

    const properties = Array.from(xmlDoc.getElementsByTagName("property")).map(
      (prop) => prop.getAttribute("name")
    );
    const { tree, baseKeywords, allPropertyParts } =
      this.buildPropertyTree(properties);
    this.propertyTree = tree;
    this.baseKeywords = baseKeywords.sort();
    this.allPropertyParts = allPropertyParts;
    if (statusSelector) statusManager.clear(statusSelector);
    return tree;
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
            const suggestions = handlePropertyLookup(
              term,
              this.propertyTree,
              this.globalKeywords
            );
            response(suggestions);
          } else {
            const suggestions = handleKeywordLookup(term, this.globalKeywords);
            response(suggestions);
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

  getTransformationParameters() {
    const decodedExpression = queryTools.decodeUrl(
      this.expressionInput.value.trim()
    );
    const expression = encodeURIComponent(decodedExpression);
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

  async transformXML(statusSelector = null) {
    if (!this.xmlDoc) return;

    await withStatus(statusSelector, "Transforming XML...", async () => {
      const {
        expression: encodedExpression,
        scriptType,
        sort,
      } = this.getTransformationParameters();
      const decodedExpression = queryTools.decodeUrl(
        this.expressionInput.value.trim()
      );

      let filteredDoc;
      try {
        filteredDoc = await this.filteringStrategy.process(
          this.xmlDoc,
          decodedExpression,
          scriptType
        );
        consoleUtils.logInfo("Filtered Doc:", filteredDoc);
      } catch (error) {
        consoleUtils.logError(`Filtering failed: ${error.message}`);
        filteredDoc = document.implementation.createDocument("", "root", null);
      }

      let resultDoc;
      if (
        !filteredDoc ||
        !filteredDoc.documentElement ||
        !filteredDoc.documentElement.childNodes.length
      ) {
        consoleUtils.logWarning(
          `No results found for expression: ${decodedExpression}`
        );
        resultDoc = document.createDocumentFragment();
        const noResults = apiClient.createElement("p", {
          class: "alert alert-info",
          textContent: `No matching properties or keywords found for "${decodedExpression}".`,
        });
        resultDoc.appendChild(noResults);
      } else if (this.xslDoc) {
        const processor = new XSLTProcessor();
        processor.importStylesheet(this.xslDoc);
        processor.setParameter(null, "expression", decodedExpression);
        processor.setParameter(null, "scripttype", scriptType);
        processor.setParameter(null, "sort", sort);
        resultDoc = processor.transformToFragment(filteredDoc, document);
        consoleUtils.logInfo("XSL Transformation Result Structure:", {
          nodeType: resultDoc?.nodeType,
          children: resultDoc?.children?.length || 0,
          textContent:
            resultDoc?.textContent?.substring(0, 100) || "No content",
        });

        // Check if resultDoc is valid before proceeding
        if (!resultDoc || !resultDoc.children || !resultDoc.children.length) {
          consoleUtils.logWarning(
            `XSL transformation resulted in empty or invalid output for ${decodedExpression}`
          );
          resultDoc = document.createDocumentFragment();
          const noResults = apiClient.createElement("p", {
            class: "alert alert-info",
            textContent: `No matching properties or keywords found for "${decodedExpression}".`,
          });
          resultDoc.appendChild(noResults);
        }
      } else {
        resultDoc = document.createDocumentFragment();
        Array.from(filteredDoc.documentElement.childNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            resultDoc.appendChild(document.importNode(node, true));
          }
        });
      }

      this.divXMLDisplay.replaceChildren(
        resultDoc || document.createDocumentFragment()
      );

      consoleUtils.logSuccess("XML transformation completed.");
      addTooltipsToXSLOutput(this.divXMLDisplay);
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
          await displayAsTree(
            this.xmlDoc,
            this.divXMLDisplay,
            expression,
            this.filteringStrategy || this.getFilteringStrategy()
          );
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
          apiClient.fetchXML(this.xslFile).catch(() => null),
        ]);
        if (!xmlDoc) throw new Error("Failed to load XML file.");

        this.xmlDoc = xmlDoc;
        this.xslDoc = xslDoc;
        consoleUtils.logInfo(`XSL Doc loaded: ${!!xslDoc}`); // Debug XSL loading

        await this.processXMLData(this.xmlFile, statusSelector);
        this.globalKeywords = Array.from(
          new Set([
            ...this.baseKeywords,
            ...this.processKeywordData(this.xmlDoc),
          ])
        ).sort();

        this.initAutoComplete(statusSelector);
        this.expressionInput.focus();
        this.debouncedUpdate();
        consoleUtils.logSuccess("Documentation viewer initialized.");
      }
    );
  }
}

/**
 * Creates a DOM tree representation of an XML node with collapsible behavior and tooltips.
 * @param {Node} node - The XML node to render.
 * @param {string} expression - The filter expression for matching nodes.
 * @returns {HTMLElement|null} The DOM element for the tree node, or null if invalid.
 * @note Styling for the tree (e.g., .tree, .tree-node) is defined in viewer.css.
 */
function createTreeDOM(node, expression = "") {
  if (!node || node.nodeType !== Node.ELEMENT_NODE || !node.children)
    return null; // Handle null or invalid nodes

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

  // Add expand/collapse icon
  const icon = apiClient.createElement("span", { classList: "tree-icon" });
  icon.textContent = node.children.length ? "▶" : "●";
  span.insertBefore(icon, span.firstChild);

  li.appendChild(span);

  if (node.children.length) {
    const ul = apiClient.createElement("ul", { classList: "collapsed" });
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

/**
 * Displays an XML document as a collapsible tree structure.
 * @param {Document} xmlDoc - The XML document to display.
 * @param {HTMLElement} container - The DOM element to render the tree in.
 * @param {string} expression - The filter expression for matching nodes.
 * @param {IPropertyFilteringStrategy} [strategy] - The filtering strategy to use (optional, defaults to null check).
 */
async function displayAsTree(
  xmlDoc,
  container,
  expression = "",
  strategy = null
) {
  if (!xmlDoc || !xmlDoc.documentElement) {
    console.error("Invalid or undefined XML document passed to displayAsTree");
    container.innerHTML =
      "<p class='alert alert-danger'>Error: Invalid XML document.</p>";
    return;
  }

  try {
    // Ensure strategy is available, fall back to a default if undefined
    const effectiveStrategy = strategy || new GenericXMLFilteringStrategy(); // Default to Generic for safety
    const filteredDoc = await effectiveStrategy.process(xmlDoc, expression);
    const treeRoot = apiClient.createElement("ul", { classList: "tree" });
    const treeDOM = createTreeDOM(filteredDoc.documentElement, expression);
    if (treeDOM) treeRoot.appendChild(treeDOM);
    container.innerHTML = "";
    container.appendChild(treeRoot);

    // Add event listeners for tree node clicks and hover tooltips
    container.querySelectorAll(".tree-node").forEach((node) => {
      // Click to toggle collapse/expand
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        const ul = node.parentElement.querySelector("ul");
        if (ul) {
          ul.classList.toggle("collapsed");
          const icon = node.querySelector(".tree-icon");
          if (icon)
            icon.textContent = ul.classList.contains("collapsed") ? "▶" : "▼";
        }
      });

      // Hover tooltip
      node.addEventListener("mouseover", (e) => {
        const tooltip = document.querySelector(".tree-tooltip");
        if (tooltip && node.dataset.tooltip) {
          tooltip.textContent = node.dataset.tooltip;
          tooltip.style.display = "block";
          tooltip.style.left = `${e.clientX + 10}px`;
          tooltip.style.top = `${e.clientY + 10}px`;
        }
      });

      node.addEventListener("mouseout", () => {
        const tooltip = document.querySelector(".tree-tooltip");
        if (tooltip) tooltip.style.display = "none";
      });

      node.addEventListener("mousemove", (e) => {
        const tooltip = document.querySelector(".tree-tooltip");
        if (tooltip) {
          tooltip.style.left = `${Math.min(
            e.clientX + 10,
            window.innerWidth - tooltip.offsetWidth - 10
          )}px`;
          tooltip.style.top = `${Math.min(
            e.clientY + 10,
            window.innerHeight - tooltip.offsetHeight - 10
          )}px`;
        }
      });
    });

    // Ensure the tooltip element exists in the DOM
    let tooltip = document.querySelector(".tree-tooltip");
    if (!tooltip) {
      tooltip = apiClient.createElement("div", { classList: "tree-tooltip" });
      document.body.appendChild(tooltip);
    }
  } catch (error) {
    consoleUtils.logError(`Error displaying XML as tree: ${error.message}`);
    container.innerHTML = `<p class='alert alert-danger'>Error rendering tree: ${error.message}</p>`;
  }
}

/**
 * Displays the raw content of a file in a container.
 * @param {string} file - The URL of the file to display.
 * @param {HTMLElement} container - The DOM element to display the content in.
 */
async function displayRawContent(file, container) {
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Failed to fetch ${file}`);
    const text = await response.text();
    container.innerHTML = `<pre>${queryTools.escapeHtml(text)}</pre>`;
  } catch (error) {
    consoleUtils.logError(`Error displaying raw content: ${error.message}`);
    container.innerHTML = `<p class='alert alert-danger'>Failed to load file: ${error.message}</p>`;
  }
}

/**
 * Automatically transforms an XML file using associated XSL/XSLT files.
 * @param {string} xmlFile - The URL of the XML file to transform.
 * @param {string} [viewerSelector="#viewerContent"] - The selector for the viewer content element.
 * @param {string} [xslNameSelector="#xslFileName"] - The selector for the XSL file name element.
 * @param {string} [statusSelector="#statusIndicator"] - The selector for the status indicator element.
 * @returns {Promise<boolean>} True if transformation succeeds, false otherwise.
 */
async function autoTransformXML(
  xmlFile,
  viewerSelector = "#viewerContent",
  xslNameSelector = "#xslFileName",
  statusSelector = "#statusIndicator"
) {
  consoleUtils.logInfo(`Attempting to transform XML: ${xmlFile}`);
  const baseName = xmlFile.replace(/\.xml$/i, "");
  const candidates = [`${baseName}.xsl`]; // Removed .xslt for now since it’s not present
  let success = false;

  await withStatus(
    statusSelector,
    "Attempting auto-transformation...",
    async () => {
      for (const candidate of candidates) {
        try {
          consoleUtils.logInfo(`Trying XSL candidate: ${candidate}`);
          const xmlDoc = await apiClient.fetchXML(xmlFile);
          const xsltResponse = await fetch(candidate);
          consoleUtils.logInfo(`XSLT response status: ${xsltResponse.status}`);
          if (!xsltResponse.ok) {
            throw new Error(`XSLT fetch failed: ${xsltResponse.status}`);
          }
          const xsltText = await xsltResponse.text();
          consoleUtils.logInfo(`XSLT text length: ${xsltText.length}`);
          const xsltDoc = new DOMParser().parseFromString(
            xsltText,
            "application/xml"
          );
          if (xsltDoc.querySelector("parsererror")) {
            throw new Error(`XSL parse error in ${candidate}`);
          }

          const xsltProcessor = new XSLTProcessor();
          xsltProcessor.importStylesheet(xsltDoc);
          const resultDoc = xsltProcessor.transformToFragment(xmlDoc, document);
          consoleUtils.logInfo("XSL Transformation Result Structure:", {
            nodeType: resultDoc?.nodeType,
            children: resultDoc?.children?.length || 0,
            textContent:
              resultDoc?.textContent?.substring(0, 100) || "No content",
          });

          if (
            !resultDoc ||
            resultDoc.nodeType !== Node.DOCUMENT_FRAGMENT_NODE ||
            !resultDoc.children ||
            !resultDoc.children.length
          ) {
            throw new Error("Invalid or empty XSL transformation result");
          }

          const viewerContent = await apiClient.getElement(viewerSelector);
          viewerContent.innerHTML = "";
          viewerContent.appendChild(resultDoc);

          window.activeXslFile = candidate;
          await updateXslFileName(candidate, xslNameSelector);
          success = true;
          consoleUtils.logSuccess(`Auto-transformed with ${candidate}`);

          await new Promise((resolve) => requestAnimationFrame(resolve));
          addTooltipsToXSLOutput(viewerContent);
          break;
        } catch (err) {
          consoleUtils.logError(
            `Candidate ${candidate} failed: ${err.message}`
          );
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

/**
 * Updates the XSL file name display.
 * @param {string|File} activeXslFile - The active XSL file or its name.
 * @param {string} [selector="#xslFileName"] - The selector for the XSL file name element.
 */
async function updateXslFileName(activeXslFile, selector = "#xslFileName") {
  const xslFileNameEl = await apiClient.getElement(selector);
  if (xslFileNameEl) {
    xslFileNameEl.textContent = activeXslFile
      ? activeXslFile.name || activeXslFile
      : "No file chosen";
  }
}

/**
 * Displays a spreadsheet file in a container with tabs.
 * @param {string} file - The URL of the spreadsheet file.
 * @param {HTMLElement} container - The DOM element to display the spreadsheet in.
 * @param {HTMLElement} tabsContainer - The DOM element to display the sheet tabs in.
 * @param {HTMLInputElement} expressionInput - The input element for filtering expressions.
 */
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

/**
 * Displays a specific sheet from a workbook.
 * @param {Object} workbook - The parsed workbook object.
 * @param {string} sheetName - The name of the sheet to display.
 * @param {HTMLElement} container - The DOM element to display the sheet in.
 * @param {HTMLInputElement} expressionInput - The input element for filtering expressions.
 */
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

/**
 * Adds tooltip event listeners to elements in the XSL-transformed output.
 * @param {HTMLElement} container - The container holding the transformed HTML.
 */
function addTooltipsToXSLOutput(container) {
  try {
    consoleUtils.logInfo(
      `Adding tooltips to XSL output in container: ${
        container.id || container.className
      }`
    );
    const tooltipElements = container.querySelectorAll("[data-tooltip]");
    consoleUtils.logInfo(
      `Found ${tooltipElements.length} elements with data-tooltip`
    );
    container.addEventListener("mouseover", (e) => {
      const target = e.target.closest("[data-tooltip]");
      if (target) {
        const tooltip = document.querySelector(".tree-tooltip");
        if (tooltip && target.dataset.tooltip) {
          tooltip.textContent = target.dataset.tooltip;
          tooltip.style.display = "block";
          tooltip.style.left = `${e.clientX + 10}px`;
          tooltip.style.top = `${e.clientY + 10}px`;
        }
      }
    });

    container.addEventListener("mouseout", (e) => {
      const target = e.target.closest("[data-tooltip]");
      if (!target) {
        const tooltip = document.querySelector(".tree-tooltip");
        if (tooltip) tooltip.style.display = "none";
      }
    });

    container.addEventListener("mousemove", (e) => {
      const target = e.target.closest("[data-tooltip]");
      if (target) {
        const tooltip = document.querySelector(".tree-tooltip");
        if (tooltip) {
          tooltip.style.left = `${Math.min(
            e.clientX + 10,
            window.innerWidth - tooltip.offsetWidth - 10
          )}px`;
          tooltip.style.top = `${Math.min(
            e.clientY + 10,
            window.innerHeight - tooltip.offsetHeight - 10
          )}px`;
        }
      }
    });

    let tooltip = document.querySelector(".tree-tooltip");
    if (!tooltip) {
      tooltip = apiClient.createElement("div", { classList: "tree-tooltip" });
      document.body.appendChild(tooltip);
    }
  } catch (error) {
    consoleUtils.logError(
      `Error adding tooltips to XSL output: ${error.message}`
    );
  }
}

/**
 * Exported utilities for XML handling.
 */
export const XmlUtils = {
  DocumentationViewer,
  updateXslFileName,
  createTreeDOM,
  displayAsTree,
  displayRawContent,
  autoTransformXML,
  displaySpreadsheet,
};
