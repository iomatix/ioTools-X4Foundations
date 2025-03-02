"use strict";

import { SharedLibs } from "../shared/shared_libs.js";
import { DocumentationViewer } from "../xml/documentation_viewer.js";

const consoleUtils = SharedLibs.ConsoleUtils;
const queryTools = SharedLibs.QueryTools;
const apiClient = SharedLibs.ApiClient;
const filePathUtils = SharedLibs.FilePathUtils;

async function addExpandButton(containerSelector) {
  try {
    const expandBtn = apiClient.createPrimaryButton(
      "Full Width View",
      async () => {
        try {
          const elements = await apiClient.toggleMaxWidth(".expandable", {
            maxWidth: "100%",
          });
          const isFullWidth = Array.from(elements).every(
            (el) => el.style.maxWidth === "100%"
          );
          expandBtn.textContent = isFullWidth
            ? "Revert to Normal Width"
            : "Full Width View";
        } catch (error) {
          consoleUtils.logError(`Error toggling width: ${error.message}`);
        }
      }
    );
    const container = document.querySelector(containerSelector);
    if (!container) throw new Error(`Container ${containerSelector} not found`);
    container.appendChild(expandBtn);
  } catch (error) {
    consoleUtils.logError(`Failed to add expand button: ${error.message}`);
  }
}

function makeScrollable(container) {
  if (!container) return;
  Object.assign(container.style, {
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: "95vh",
    maxWidth: "95vh",
    whiteSpace: "nowrap",
  });
}

function showError(container, message) {
  if (!container) return;
  const errorDiv = apiClient.createElement("div", {
    class: "alert alert-danger",
    textContent: message,
  });
  container.innerHTML = "";
  container.appendChild(errorDiv);
}

function filterSpreadsheet(
  container,
  workbook,
  expression,
  sheetName = workbook.SheetNames[0]
) {
  if (!container || !workbook) return;
  let regex;
  const isRegexMode = expression.startsWith("/") && expression.endsWith("/");
  if (isRegexMode) {
    try {
      regex = new RegExp(expression.slice(1, -1), "i");
    } catch (error) {
      consoleUtils.logWarning(`Invalid regex: ${error.message}`);
      showError(container, `Invalid regex: ${error.message}`);
      return;
    }
  }

  const sheet = workbook.Sheets[sheetName];
  const html = XLSX.utils.sheet_to_html(sheet);
  container.innerHTML = html;

  const cells = container.querySelectorAll("td, th");
  cells.forEach((cell) => {
    cell.className = "";
    if (expression && cell.textContent) {
      const text = cell.textContent.trim();
      if (isRegexMode && regex) {
        if (regex.test(text)) cell.className = "highlight";
      } else if (text.toLowerCase().includes(expression.toLowerCase())) {
        cell.className = "highlight";
      }
    }
  });
}

const fileHandlers = {
  xml: async (file, elements) => {
    try {
      elements.viewerOptions.innerHTML = `
        <p class="h3 mt-2 mb-5">Data (XML) viewer: ${file}</p>
        <div class="mb-3 p-2 border" id="filePickerContainer">Drop XSL file here</div>
        <p>Selected XSL File: <span id="xslFileName">No file chosen</span></p>
        <button type="button" id="transformBtn" class="btn btn-primary mt-2">Transform XML</button>
        <button type="button" id="treeViewBtn" class="btn btn-secondary mt-2">Tree View</button>
        <button type="button" id="rawViewBtn" class="btn btn-secondary mt-2">Raw View</button>
        <button type="button" id="downloadBtn" class="btn btn-info mt-2">Download Raw</button>
      `;
      await addExpandButton("#viewerOptions");

      const [
        transformBtn,
        treeViewBtn,
        rawViewBtn,
        downloadBtn,
        filePickerContainer,
      ] = await Promise.all([
        apiClient.getElement("#transformBtn"),
        apiClient.getElement("#treeViewBtn"),
        apiClient.getElement("#rawViewBtn"),
        apiClient.getElement("#downloadBtn"),
        apiClient.getElement("#filePickerContainer"),
      ]);

      elements.viewerContent.classList.add("expandable");
      makeScrollable(elements.viewerContent);

      const expressionInput = document.getElementById("expression-input");
      const showMdCheckbox = document.getElementById("show-md");
      const showAiCheckbox = document.getElementById("show-ai");
      const sortCheckbox = document.getElementById("sort-results");

      if (!expressionInput || !elements.viewerContent) {
        throw new Error(
          "Missing required elements: #expression-input or #viewerContent"
        );
      }

      const viewer = new DocumentationViewer({
        expressionInput,
        divXMLDisplay: elements.viewerContent,
        showMdCheckbox,
        showAiCheckbox,
        sortCheckbox,
        statusSelector: "#status-indicator",
        xmlFile: file,
      });
      await viewer.init();
      await viewer.toggleMode("raw");
      await apiClient.hideElement("#rawViewBtn");

      let currentMode = "raw";
      let previousMode = "raw";

      expressionInput.addEventListener("input", async () => {
        try {
          await viewer.update(currentMode);
        } catch (error) {
          consoleUtils.logError(`XML update failed: ${error.message}`);
          showError(elements.viewerContent, `Update failed: ${error.message}`);
        }
      });

      transformBtn.addEventListener("click", async () => {
        try {
          if (currentMode !== "xsl") {
            const success = await viewer.toggleMode("xsl");
            if (success) {
              transformBtn.textContent = "Raw View";
              currentMode = "xsl";
              await apiClient.hideElement("#rawViewBtn");
              const xslNameEl = document.querySelector("#xslFileName");
              if (viewer.xslFile && xslNameEl) {
                xslNameEl.textContent =
                  viewer.xslFile.split("/").pop() || "Auto-detected XSL";
              }
            } else {
              consoleUtils.logInfo(
                "No XSL file available, staying in raw mode"
              );
              await viewer.toggleMode("raw");
              transformBtn.textContent = "Transform XML";
              currentMode = "raw";
              await apiClient.hideElement("#rawViewBtn");
            }
          } else {
            await viewer.toggleMode("raw");
            transformBtn.textContent = "Transform XML";
            currentMode = "raw";
            rawViewBtn.style.display = "block";
          }
        } catch (error) {
          consoleUtils.logError(`Transform failed: ${error.message}`);
          showError(
            elements.viewerContent,
            `XSL transformation failed: ${error.message}`
          );
        }
      });

      treeViewBtn.addEventListener("click", async () => {
        try {
          if (currentMode !== "tree") {
            previousMode = currentMode;
            await viewer.toggleMode("tree");
            treeViewBtn.textContent = "Close Tree View";
            currentMode = "tree";
            await apiClient.hideElement("#transformBtn");
            await apiClient.hideElement("#rawViewBtn");
          } else {
            await viewer.toggleMode(previousMode);
            treeViewBtn.textContent = "Tree View";
            currentMode = previousMode;
            transformBtn.style.display = "block";
            if (currentMode !== "xsl") rawViewBtn.style.display = "block";
            transformBtn.textContent =
              currentMode === "xsl" ? "Raw View" : "Transform XML";
          }
        } catch (error) {
          consoleUtils.logError(`Tree view toggle failed: ${error.message}`);
          showError(
            elements.viewerContent,
            `Tree view failed: ${error.message}`
          );
        }
      });

      rawViewBtn.addEventListener("click", async () => {
        try {
          if (currentMode !== "raw") {
            await viewer.toggleMode("raw");
            transformBtn.textContent = "Transform XML";
            treeViewBtn.textContent = "Tree View";
            currentMode = "raw";
            transformBtn.style.display = "block";
            rawViewBtn.style.display = "none";
          }
        } catch (error) {
          consoleUtils.logError(`Raw view toggle failed: ${error.message}`);
          showError(
            elements.viewerContent,
            `Raw view failed: ${error.message}`
          );
        }
      });

      downloadBtn.addEventListener("click", () => {
        window.open(file, "_blank", "noopener, noreferrer");
      });

      filePickerContainer.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        filePickerContainer.classList.add("dragover");
      });
      filePickerContainer.addEventListener("dragleave", (ev) => {
        ev.preventDefault();
        filePickerContainer.classList.remove("dragover");
      });
      filePickerContainer.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        filePickerContainer.classList.remove("dragover");
        try {
          const droppedFile = Array.from(ev.dataTransfer.files).find((f) =>
            f.name.match(/\.(xsl|xslt)$/i)
          );
          if (droppedFile) {
            consoleUtils.logInfo(`Dropped XSL file: ${droppedFile.name}`);
            viewer.xslFile = URL.createObjectURL(droppedFile);
            await viewer.transformer.loadXsl();
            const success = await viewer.toggleMode("xsl");
            if (success) {
              document.querySelector("#xslFileName").textContent =
                droppedFile.name;
              transformBtn.textContent = "Raw View";
              currentMode = "xsl";
              await apiClient.hideElement("#rawViewBtn");
            }
          }
        } catch (error) {
          consoleUtils.logError(`XSL drop failed: ${error.message}`);
          showError(
            elements.viewerContent,
            `XSL loading failed: ${error.message}`
          );
        }
      });
    } catch (error) {
      consoleUtils.logError(`XML handler failed: ${error.message}`);
      showError(
        elements.viewerContent,
        `Failed to process XML: ${error.message}`
      );
    }
  },

  xsd: async (file, elements) => {
    try {
      elements.viewerOptions.innerHTML = `
        <p class="h3 mt-2 mb-5">Schema (XSD) viewer: ${file}</p>
        <button type="button" id="rawViewBtn" class="btn btn-secondary mt-2">Raw View</button>
        <button type="button" id="downloadBtn" class="btn btn-info mt-2">Download Raw</button>
      `;
      await addExpandButton("#viewerOptions");

      const [rawViewBtn, downloadBtn] = await Promise.all([
        apiClient.getElement("#rawViewBtn"),
        apiClient.getElement("#downloadBtn"),
      ]);

      elements.viewerContent.classList.add("expandable");
      makeScrollable(elements.viewerContent);

      const expressionInput = document.getElementById("expression-input");
      if (!expressionInput || !elements.viewerContent) {
        throw new Error(
          "Missing required elements: #expression-input or #viewerContent"
        );
      }

      const viewer = new DocumentationViewer({
        expressionInput,
        divXMLDisplay: elements.viewerContent,
        xmlFile: file,
        statusSelector: "#status-indicator",
      });
      await viewer.init();
      await viewer.toggleMode("tree");

      let currentMode = "tree";
      expressionInput.addEventListener("input", async () => {
        try {
          await viewer.update(currentMode);
        } catch (error) {
          consoleUtils.logError(`XSD update failed: ${error.message}`);
          showError(elements.viewerContent, `Update failed: ${error.message}`);
        }
      });

      rawViewBtn.addEventListener("click", async () => {
        try {
          if (currentMode === "tree") {
            await viewer.toggleMode("raw");
            rawViewBtn.textContent = "Tree View";
            currentMode = "raw";
          } else {
            await viewer.toggleMode("tree");
            rawViewBtn.textContent = "Raw View";
            currentMode = "tree";
          }
        } catch (error) {
          consoleUtils.logError(`XSD view toggle failed: ${error.message}`);
          showError(
            elements.viewerContent,
            `View toggle failed: ${error.message}`
          );
        }
      });

      downloadBtn.addEventListener("click", () => {
        window.open(file, "_blank", "noopener, noreferrer");
      });
    } catch (error) {
      consoleUtils.logError(`XSD handler failed: ${error.message}`);
      showError(
        elements.viewerContent,
        `Failed to process XSD: ${error.message}`
      );
    }
  },

  xsl: async (file, elements) => {
    try {
      elements.viewerOptions.innerHTML = `
        <p class="h3 mt-2 mb-5">Stylesheet (XSL) viewer: ${file}</p>
        <button type="button" id="downloadBtn" class="btn btn-info mt-2">Download Raw</button>
      `;
      await addExpandButton("#viewerOptions");

      const downloadBtn = await apiClient.getElement("#downloadBtn");

      elements.viewerContent.classList.add("expandable");
      makeScrollable(elements.viewerContent);

      const viewer = new DocumentationViewer({
        divXMLDisplay: elements.viewerContent,
        xmlFile: file,
        statusSelector: "#status-indicator",
      });
      await viewer.init();
      await viewer.toggleMode("raw");

      downloadBtn.addEventListener("click", () => {
        window.open(file, "_blank", "noopener, noreferrer");
      });
    } catch (error) {
      consoleUtils.logError(`XSL handler failed: ${error.message}`);
      showError(
        elements.viewerContent,
        `Failed to process XSL: ${error.message}`
      );
    }
  },

  xls: async (file, elements) => {
    try {
      if (!window.XLSX) throw new Error("SheetJS library not loaded");

      elements.viewerOptions.innerHTML = `
        <p class="h3 mt-2 mb-5">Spreadsheet (XLS/XLSX) viewer: ${file}</p>
        <button type="button" id="downloadBtn" class="btn btn-info mt-2">Download Raw</button>
      `;
      await addExpandButton("#viewerOptions");

      const downloadBtn = await apiClient.getElement("#downloadBtn");

      elements.sheetJSView.classList.add("expandable");
      makeScrollable(elements.sheetJSView);
      elements.sheetTabsJSView.classList.add("expandable");

      const expressionInput = document.getElementById("expression-input");
      if (
        !expressionInput ||
        !elements.sheetJSView ||
        !elements.sheetTabsJSView
      ) {
        throw new Error("Missing required elements for spreadsheet view");
      }

      await apiClient.hideElement("#show-md");
      await apiClient.hideElement("#show-ai");
      await apiClient.hideElement("#sort-results");

      const response = await fetch(file);
      if (!response.ok)
        throw new Error(`Failed to fetch ${file}: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      let currentSheet = workbook.SheetNames[0];
      filterSpreadsheet(
        elements.sheetJSView,
        workbook,
        expressionInput.value.trim(),
        currentSheet
      );
      elements.sheetJSView.style.display = "block";
      elements.viewerContent.style.display = "none";

      elements.sheetTabsJSView.innerHTML = workbook.SheetNames.map(
        (name) => `<button data-sheet="${name}">${name}</button>`
      ).join("");
      elements.sheetTabsJSView.style.display = "block";

      expressionInput.addEventListener("input", () => {
        const expr = expressionInput.value.trim();
        filterSpreadsheet(elements.sheetJSView, workbook, expr, currentSheet);
      });

      elements.sheetTabsJSView.addEventListener("click", async (ev) => {
        const btn = ev.target.closest("button[data-sheet]");
        if (btn) {
          try {
            currentSheet = btn.dataset.sheet;
            filterSpreadsheet(
              elements.sheetJSView,
              workbook,
              expressionInput.value.trim(),
              currentSheet
            );
          } catch (error) {
            consoleUtils.logError(`Sheet switch failed: ${error.message}`);
            showError(
              elements.sheetJSView,
              `Failed to switch sheet: ${error.message}`
            );
          }
        }
      });

      downloadBtn.addEventListener("click", () => {
        window.open(file, "_blank", "noopener, noreferrer");
      });
    } catch (error) {
      consoleUtils.logError(`XLS handler failed: ${error.message}`);
      showError(
        elements.sheetJSView || elements.viewerContent,
        `Failed to load spreadsheet: ${error.message}`
      );
    }
  },

  xlsx: "xls",

  default: (file, elements) => {
    elements.viewerOptions.innerHTML = `<p class="h3 mt-2 mb-5">Unsupported file type: ${file}</p>`;
    consoleUtils.logWarning(`Unsupported type: ${file.split(".").pop()}`);
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  consoleUtils.logInfo("[viewer.js] DOMContentLoaded - Starting viewer");
  try {
    const file = filePathUtils.normalize(queryTools.getParam("file"));
    const type = queryTools.getParam("type");
    if (!file || !type) {
      consoleUtils.logWarning("No file or type specified in query params");
      const elements = {
        viewerOptions: await apiClient.getElement("#viewerOptions"),
      };
      elements.viewerOptions.innerHTML = `<p class="alert alert-warning">Please specify a file and type in the URL</p>`;
      return;
    }

    const elements = {
      viewerOptions: await apiClient.getElement("#viewerOptions"),
      viewerContent: await apiClient.getElement("#viewerContent"),
      sheetTabsJSView: await apiClient.getElement("#sheetTabsJSView"),
      sheetJSView: await apiClient.getElement("#sheetJSView", {
        optional: true,
      }),
    };

    elements.viewerContent.innerHTML = "";
    if (elements.sheetJSView) elements.sheetJSView.innerHTML = "";

    consoleUtils.logInfo(`[viewer.js] File: ${file}, Type: ${type}`);
    const handler = fileHandlers[type] || fileHandlers.default;
    const resolvedHandler =
      typeof handler === "string" ? fileHandlers[handler] : handler;
    await resolvedHandler(file, elements);

    const tooltip = document.createElement("div");
    tooltip.classList.add("tree-tooltip");
    document.body.appendChild(tooltip);

    document.addEventListener("mouseover", (event) => {
      const target = event.target.closest("[data-tooltip]");
      if (target && target.dataset.tooltip) {
        tooltip.textContent = target.dataset.tooltip;
        tooltip.style.display = "block";
      }
    });
    document.addEventListener("mousemove", (event) => {
      const target = event.target.closest("[data-tooltip]");
      if (target && target.dataset.tooltip) {
        tooltip.style.left = `${Math.min(
          event.clientX + 10,
          window.innerWidth - tooltip.offsetWidth - 10
        )}px`;
        tooltip.style.top = `${Math.min(
          event.clientY + 10,
          window.innerHeight - tooltip.offsetHeight - 10
        )}px`;
      }
    });
    document.addEventListener("mouseout", (event) => {
      if (!event.relatedTarget?.closest("[data-tooltip]"))
        tooltip.style.display = "none";
    });

    const goToHomeBtn = await apiClient.getElement("#goToHome");
    if (goToHomeBtn) {
      goToHomeBtn.addEventListener("click", () => {
        window.location.href = goToHomeBtn.dataset.href;
      });
    }
  } catch (error) {
    consoleUtils.logError(`Viewer initialization failed: ${error.message}`);
    showError(
      document.querySelector("#viewerOptions"),
      `Error: ${error.message}`
    );
  }
});
