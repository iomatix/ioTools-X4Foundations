"use strict";

import { SharedLibs } from "../shared/shared_libs.js";
import { XmlUtils } from "../xml/xml_utils.js";

const consoleUtils = SharedLibs.ConsoleUtils;
const queryTools = SharedLibs.QueryTools;
const apiClient = SharedLibs.ApiClient;
const filePathUtils = SharedLibs.FilePathUtils;

async function addExpandButton(containerSelector) {
  const expandBtn = apiClient.createPrimaryButton(
    "Full Width View",
    async () => {
      try {
        const elements = await apiClient.toggleMaxWidth(".expandable", {
          maxWidth: "100%",
        });
        const isFullWidth = Array.from(
          elements instanceof NodeList ? elements : [elements]
        ).every((el) => el.style.maxWidth === "100%");
        expandBtn.textContent = isFullWidth
          ? "Revert to Normal Width"
          : "Full Width View";
      } catch (error) {
        consoleUtils.logError(`Error toggling width: ${error.message}`);
      }
    }
  );
  const container = document.querySelector(containerSelector);
  container.appendChild(expandBtn);
}

function makeScrollable(container) {
  Object.assign(container.style, {
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: "95vh",
    maxWidth: "95vh",
    whiteSpace: "nowrap",
  });
}

function showError(container, message) {
  const errorDiv = apiClient.createElement("div", {
    class: "alert alert-danger",
    textContent: message,
  });
  container.innerHTML = "";
  container.appendChild(errorDiv);
}

const fileHandlers = {
  xml: async (file, elements) => {
    // Set dynamic content in #viewerOptions
    elements.viewerOptions.innerHTML = `
    <p class="h3 mt-2 mb-5">Data (XML) viewer: ${file}</p>
    <div class="mb-3 p-2 border" id="filePickerContainer">Drop XSL file here</div>
    <p>Selected XSL File: <span id="xslFileName">No file chosen</span></p>
    <button type="button" id="transformBtn" class="btn btn-primary mt-2">Transform XML</button>
    <button type="button" id="treeViewBtn" class="btn btn-secondary mt-2">Tree View</button>
    <button type="button" id="downloadBtn" class="btn btn-info mt-2">Download Raw</button>
  `;
    await addExpandButton("#viewerOptions");

    // Get button elements
    const transformBtn = await apiClient.getElement("#transformBtn");
    const treeViewBtn = await apiClient.getElement("#treeViewBtn");
    const downloadBtn = await apiClient.getElement("#downloadBtn");
    const filePickerContainer = await apiClient.getElement(
      "#filePickerContainer"
    );

    elements.viewerContent.classList.add("expandable");
    makeScrollable(elements.viewerContent);

    await XmlUtils.displayRawContent(file, elements.viewerContent);

    // Initialize DocumentationViewer with direct DOM access
    let viewer;
    let expressionInput;
    try {
      // Use document.getElementById for static elements to avoid timing issues
      expressionInput = document.getElementById("expression");
      const showMdCheckbox = document.getElementById("showMd");
      const showAiCheckbox = document.getElementById("showAi");
      const sortCheckbox = document.getElementById("sort");

      // Validate that all required elements are found
      if (
        !expressionInput ||
        !showMdCheckbox ||
        !showAiCheckbox ||
        !sortCheckbox
      ) {
        throw new Error(
          "Missing required elements: " +
            (!expressionInput ? "#expression " : "") +
            (!showMdCheckbox ? "#showMd " : "") +
            (!showAiCheckbox ? "#showAi " : "") +
            (!sortCheckbox ? "#sort" : "")
        );
      }

      viewer = new XmlUtils.DocumentationViewer({
        expressionInput,
        divXMLDisplay: elements.viewerContent,
        showMdCheckbox,
        showAiCheckbox,
        sortCheckbox,
        statusSelector: "#fetchStatus",
        xmlFile: file,
      });
      await viewer.init();
      consoleUtils.logSuccess("Viewer initialized successfully");
    } catch (err) {
      consoleUtils.logWarning(
        `DocumentationViewer initialization failed: ${err.message}`
      );
      expressionInput =
        expressionInput || document.getElementById("expression");
    }

    // Attach event listener for expression input
    if (expressionInput) {
      expressionInput.addEventListener("input", () => {
        if (viewer) {
          console.log("Input event triggered, calling debouncedUpdate");
          viewer.debouncedUpdate();
        } else {
          console.warn("Viewer not initialized, cannot update on input");
        }
      });
    } else {
      console.error("Expression input element not found");
    }

    // Rest of the code remains unchanged (button event listeners, drag-and-drop, etc.)
    let isTransformed = false;
    let isTreeView = false;

// In viewer.js, within the xml handler
transformBtn.addEventListener("click", async () => {
  if (!isTransformed) {
    const originalContent = elements.viewerContent.innerHTML;
    try {
      const success = await XmlUtils.autoTransformXML(file);
      if (success) {
        transformBtn.textContent = "Revert to Raw XML";
        isTransformed = true;
        isTreeView = false; // Ensure tree view is reset
        if (viewer) viewer.debouncedUpdate(); // Update viewer if initialized
      } else {
        consoleUtils.logWarning(
          "No .xsl/.xslt found automatically. Restoring raw view."
        );
        elements.viewerContent.innerHTML = originalContent;
      }
    } catch (err) {
      consoleUtils.logError(`Failed to transform XML: ${err.message}`);
      elements.viewerContent.innerHTML = originalContent;
    }
  } else {
    await XmlUtils.displayRawContent(file, elements.viewerContent);
    transformBtn.textContent = "Transform XML";
    isTransformed = false;
    // Do not call debouncedUpdate here to prevent automatic re-transformation
  }
});

    treeViewBtn.addEventListener("click", async () => {
      const expr = expressionInput ? expressionInput.value.trim() : "";
      if (!isTreeView) {
        const xmlDoc = await apiClient.fetchXML(file);
        if (!xmlDoc || !xmlDoc.documentElement) {
          console.error("Failed to load XML document:", file);
          showError(elements.viewerContent, "Failed to load XML document.");
          return;
        }
        await XmlUtils.displayAsTree(xmlDoc, elements.viewerContent, expr);
        apiClient.hideElement("#transformBtn");
        treeViewBtn.textContent = "Close Tree View";
        isTreeView = true;
        isTransformed = false;
      } else {
        apiClient.showElement("#transformBtn");
        await XmlUtils.displayRawContent(file, elements.viewerContent);
        treeViewBtn.textContent = "Tree View";
        isTreeView = false;
        if (viewer) viewer.debouncedUpdate();
      }
    });

    downloadBtn.addEventListener("click", () => {
      window.open(file, "_blank", "noopener, noreferrer");
    });

    // Drag-and-drop event listeners remain unchanged
    document.addEventListener("dragover", (ev) => ev.preventDefault());
    document.addEventListener("drop", (ev) => ev.preventDefault());
    filePickerContainer.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      filePickerContainer.classList.add("dragover");
    });
    filePickerContainer.addEventListener("dragleave", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      filePickerContainer.classList.remove("dragover");
    });
    filePickerContainer.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      filePickerContainer.classList.remove("dragover");

      const droppedFiles = ev.dataTransfer.files;
      if (droppedFiles.length > 0) {
        for (const droppedFile of droppedFiles) {
          if (
            droppedFile.name.endsWith(".xsl") ||
            droppedFile.name.endsWith(".xslt")
          ) {
            consoleUtils.logInfo("Dropped XSL file: " + droppedFile.name);
            window.activeXslFile = droppedFile;
            XmlUtils.updateXslFileName(droppedFile);

            const xslText = await droppedFile.text();
            const xslDoc = new DOMParser().parseFromString(
              xslText,
              "application/xml"
            );
            const resultDoc = await apiClient.fetchXML(file, {
              styleEndpoint: xslDoc,
            });

            elements.viewerContent.innerHTML = "";
            elements.viewerContent.appendChild(resultDoc);
            transformBtn.textContent = "Revert to Raw XML";
            isTransformed = true;
            if (viewer) viewer.debouncedUpdate();
          }
        }
      }
    });
  },
  xls: async (file, elements) => {
    elements.viewerOptions.innerHTML = `
      <p class="h3 mt-2 mb-5">Sheet (XLS/XLSX) viewer: ${file}</p>
      <button type="button" id="downloadBtn" class="btn btn-info mt-2">Download Raw</button>
    `;
    await addExpandButton("#viewerOptions");

    const downloadBtn = await apiClient.getElement("#downloadBtn");

    elements.sheetJSView.classList.add("expandable");
    makeScrollable(elements.sheetJSView);

    const expressionInput = await apiClient.getElement("#expression");
    try {
      await XmlUtils.displaySpreadsheet(
        file,
        elements.sheetJSView,
        elements.sheetTabsJSView,
        expressionInput
      );
      elements.sheetJSView.style.display = "block";
      elements.sheetTabsJSView.style.display = "block";
      elements.viewerContent.style.display = "none";

      expressionInput.addEventListener("input", () => {
        const expr = expressionInput.value.trim();
        highlightSpreadsheet(elements.sheetJSView, expr);
      });
    } catch (err) {
      showError(
        elements.sheetJSView,
        `Failed to load spreadsheet: ${err.message}`
      );
    }

    downloadBtn.addEventListener("click", () => {
      window.open(file, "_blank", "noopener, noreferrer");
    });
  },
  xlsx: "xls",
  xsd: async (file, elements) => {
    elements.viewerOptions.innerHTML = `
      <p class="h3 mt-2 mb-5">Viewing file: ${file}</p>
      <button type="button" id="downloadBtn" class="btn btn-info mt-2">Download Raw</button>
    `;
    await addExpandButton("#viewerOptions");

    const downloadBtn = await apiClient.getElement("#downloadBtn");

    elements.viewerContent.classList.add("expandable");
    makeScrollable(elements.viewerContent);

    try {
      await XmlUtils.displayRawContent(file, elements.viewerContent);
    } catch (err) {
      showError(elements.viewerContent, `Failed to load file: ${err.message}`);
    }

    downloadBtn.addEventListener("click", () => {
      window.open(file, "_blank", "noopener, noreferrer");
    });
  },
  xsl: "xsd",
  default: (file, elements) => {
    elements.viewerOptions.innerHTML = `<p class="h3 mt-2 mb-5">Unsupported file type: ${file}.</p>`;
    consoleUtils.logWarning(`Unsupported type: ${file.split(".").pop()}`);
  },
};

function highlightSpreadsheet(container, expression) {
  let regex;
  try {
    regex = new RegExp(expression, "i");
  } catch {
    regex = null; // Fallback to basic matching if regex is invalid
  }
  const cells = container.querySelectorAll("td, th");
  cells.forEach((cell) => {
    cell.className = "";
    if (expression) {
      const text = cell.textContent;
      if (
        regex
          ? regex.test(text)
          : text.toLowerCase().includes(expression.toLowerCase())
      ) {
        cell.className = "highlight";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  consoleUtils.logInfo("[viewer.js] DOMContentLoaded - Starting viewer");

  const file = filePathUtils.normalize(queryTools.getParam("file"));
  const type = queryTools.getParam("type");
  if (!file || !type) {
    consoleUtils.logWarning("No file or type specified in query params.");
    const elements = {
      viewerOptions: await apiClient.getElement("#viewerOptions"),
    };
    elements.viewerOptions.innerHTML = `<p class="alert alert-warning">Please specify a file and type in the URL.</p>`;
    return;
  }

  const elements = {
    viewerOptions: await apiClient.getElement("#viewerOptions"),
    viewerContent: await apiClient.getElement("#viewerContent"),
    sheetTabsJSView: await apiClient.getElement("#sheetTabsJSView"),
    sheetJSView: await apiClient.getElement("#sheetJSView", { optional: true }),
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
    const target = event.target.closest(".tree-node");
    if (target && target.dataset.tooltip) {
      tooltip.textContent = target.dataset.tooltip;
      tooltip.style.display = "block";
    }
  });
  document.addEventListener("mousemove", (event) => {
    const target = event.target.closest(".tree-node");
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
    const related = event.relatedTarget;
    if (!related || !related.closest(".tree-node"))
      tooltip.style.display = "none";
  });

  const goToHomeBtn = await apiClient.getElement("#goToHome");
  goToHomeBtn.addEventListener("click", () => {
    window.location.href = goToHomeBtn.dataset.href;
  });
});
