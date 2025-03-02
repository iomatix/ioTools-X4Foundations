"use strict";

import { XmlLoader } from "./xml_loader.js";
import { XmlTransformer } from "./xml_transformer.js";
import { TreeRenderer } from "./tree_renderer.js";
import { AutocompleteManager } from "./autocomplete_manager.js";
import { FilterManager } from "./filter_manager.js";
import { GenericXMLFilteringStrategy } from "./generic_filtering_strategy.js";
import { SharedLibs } from "../shared/shared_libs.js";

const consoleUtils = SharedLibs.ConsoleUtils;
const apiClient = SharedLibs.ApiClient;

export class DocumentationViewer {
  constructor(config) {
    this.validateConfig(config);
    this.expressionInput = config.expressionInput;
    this.divXMLDisplay = config.divXMLDisplay;
    this.showMdCheckbox = config.showMdCheckbox;
    this.showAiCheckbox = config.showAiCheckbox;
    this.sortCheckbox = config.sortCheckbox;
    this.statusSelector = config.statusSelector;
    this.xmlFile = config.xmlFile;
    this.xslFile =
      config.xslFile || `${config.xmlFile.replace(/\.xml$/i, "")}.xsl`;

    this.loader = new XmlLoader();
    this.transformer = new XmlTransformer(this.xslFile);
    this.renderer = new TreeRenderer(this.divXMLDisplay);
    this.filterManager = new FilterManager();
    this.autocomplete = null;
    this.keywords = [];
    this.isScriptProperties = false;
    this.filteredDoc = null; // Store filtered document
  }

  validateConfig(config) {
    const required = ["expressionInput", "divXMLDisplay", "xmlFile"];
    required.forEach((key) => {
      if (!config[key]) throw new Error(`Missing required config: ${key}`);
    });
  }

  async init() {
    console.log("Initializing DocumentationViewer...");
    return await SharedLibs.MiscUtils.withStatus(
      this.statusSelector,
      "Initializing...",
      async () => {
        try {
          const xmlDoc = await this.loader.loadXML(this.xmlFile);
          this.isScriptProperties =
            xmlDoc.documentElement.nodeName === "scriptproperties";
          await this.transformer.loadXsl();
          this.buildPropertyTree(xmlDoc);

          this.autocomplete = new AutocompleteManager(
            this.expressionInput,
            this.keywords
          );
          if (!this.autocomplete.init()) {
            console.warn("Autocomplete initialization failed");
          }

          this.updateCheckboxVisibility();
          this.addCheckboxListeners();

          await this.update("raw");
        } catch (error) {
          console.error(`Initialization failed: ${error.message}`);
          this.displayError(`Initialization failed: ${error.message}`);
          throw error;
        }
      }
    );
  }

  buildPropertyTree(xmlDoc) {
    try {
      const properties = Array.from(
        xmlDoc.getElementsByTagName("property")
      ).map((p) => p.getAttribute("name") || "");
      const keywords = Array.from(xmlDoc.getElementsByTagName("keyword")).map(
        (k) => k.getAttribute("name") || ""
      );
      this.keywords = [...new Set([...properties, ...keywords])].sort();
    } catch (error) {
      console.error(`Failed to build property tree: ${error.message}`);
      this.keywords = [];
    }
  }

  getScriptType() {
    if (!this.isScriptProperties) return "";
    return this.showMdCheckbox?.checked && this.showAiCheckbox?.checked
      ? "any"
      : this.showMdCheckbox?.checked
      ? "md"
      : this.showAiCheckbox?.checked
      ? "ai"
      : "";
  }

  updateCheckboxVisibility() {
    if (this.showMdCheckbox) {
      this.showMdCheckbox.style.display = this.isScriptProperties
        ? "inline"
        : "none";
      this.showMdCheckbox.parentElement.style.display = this.isScriptProperties
        ? "inline"
        : "none";
    }
    if (this.showAiCheckbox) {
      this.showAiCheckbox.style.display = this.isScriptProperties
        ? "inline"
        : "none";
      this.showAiCheckbox.parentElement.style.display = this.isScriptProperties
        ? "inline"
        : "none";
    }
    if (this.sortCheckbox) {
      this.sortCheckbox.style.display = this.isScriptProperties
        ? "inline"
        : "none";
      this.sortCheckbox.parentElement.style.display = this.isScriptProperties
        ? "inline"
        : "none";
    }
  }

  addCheckboxListeners() {
    [this.showMdCheckbox, this.showAiCheckbox, this.sortCheckbox].forEach(
      (checkbox) => {
        if (checkbox) {
          checkbox.addEventListener("change", () =>
            this.update(this.currentMode || "raw")
          );
        }
      }
    );
  }

  async update(mode = "raw") {
    this.currentMode = mode; // Track current mode
    return await SharedLibs.MiscUtils.withStatus(
      this.statusSelector,
      "Updating view...",
      async () => {
        try {
          const xmlDoc = this.loader.getXmlDoc();
          if (!xmlDoc) throw new Error("No XML document loaded");
          const scriptType = this.getScriptType();
          const expression = this.expressionInput?.value?.trim() || "";
          const sort = this.sortCheckbox?.checked || false;
          this.filteredDoc = await this.filterManager.applyFilter(
            xmlDoc,
            expression,
            scriptType
          );

          if (mode === "xsl" && this.transformer.xslDoc) {
            await this.transformer.transform(
              this.filteredDoc,
              expression,
              "xsl",
              this.divXMLDisplay,
              scriptType,
              sort
            );
          } else if (mode === "tree") {
            await this.renderer.renderTree(this.filteredDoc, expression);
          } else {
            await DocumentationViewer.displayRawContent(
              this.filteredDoc,
              this.divXMLDisplay
            );
          }
        } catch (error) {
          console.error(`Update failed: ${error.message}`);
          this.displayError(`Update failed: ${error.message}`);
        }
      }
    );
  }

  async toggleMode(mode, statusSelector = this.statusSelector) {
    if (!this.loader.getXmlDoc()) {
      consoleUtils.logWarning("No XML document loaded");
      return false;
    }

    return await SharedLibs.MiscUtils.withStatus(
      statusSelector,
      `Switching to ${mode} mode...`,
      async () => {
        try {
          const scriptType = this.getScriptType();
          const expression = this.expressionInput?.value?.trim() || "";
          const sort = this.sortCheckbox?.checked || false;
          const xmlDoc = this.filteredDoc || this.loader.getXmlDoc(); // Use filtered if available

          switch (mode) {
            case "raw":
              await DocumentationViewer.displayRawContent(
                xmlDoc,
                this.divXMLDisplay
              );
              break;
            case "tree":
              await DocumentationViewer.displayAsTree(
                xmlDoc,
                this.divXMLDisplay,
                expression,
                this.filterManager.getStrategy(xmlDoc)
              );
              break;
            case "xsl":
              if (!this.transformer.xslDoc) {
                consoleUtils.logInfo(
                  "No XSL file available, staying in current mode"
                );
                return false;
              }
              await this.transformer.transform(
                xmlDoc,
                expression,
                "xsl",
                this.divXMLDisplay,
                scriptType,
                sort
              );
              break;
            default:
              throw new Error(`Unknown mode: ${mode}`);
          }
          this.currentMode = mode; // Update current mode
          return true;
        } catch (error) {
          console.error(`Toggle mode failed: ${error.message}`);
          this.displayError(`Mode switch failed: ${error.message}`);
          return false;
        }
      }
    );
  }

  displayError(message) {
    if (this.divXMLDisplay) {
      this.divXMLDisplay.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }
  }

  static async displayRawContent(xmlDoc, container) {
    if (!xmlDoc || !container) return;
    const resultDoc = document.createDocumentFragment();
    const pre = document.createElement("pre");
    pre.textContent = new XMLSerializer().serializeToString(xmlDoc);
    resultDoc.appendChild(pre);
    container.replaceChildren(resultDoc);
  }

  static async displayAsTree(
    xmlDoc,
    container,
    expression = "",
    strategy = null
  ) {
    if (!xmlDoc || !xmlDoc.documentElement || !container) return;
    const renderer = new TreeRenderer(container);
    renderer.renderTree(xmlDoc, expression);
  }

  static async displaySpreadsheet(
    fileUrl,
    container,
    tabsContainer,
    expressionInput
  ) {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch ${fileUrl}`);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      container.innerHTML = XLSX.utils.sheet_to_html(
        workbook.Sheets[workbook.SheetNames[0]]
      );
      tabsContainer.innerHTML = workbook.SheetNames.map(
        (name) => `<button>${name}</button>`
      ).join("");
      console.log("Spreadsheet rendered");
    } catch (error) {
      console.error(`Spreadsheet display failed: ${error.message}`);
      container.innerHTML = `<div class="alert alert-danger">Failed to load spreadsheet: ${error.message}</div>`;
    }
  }
}
