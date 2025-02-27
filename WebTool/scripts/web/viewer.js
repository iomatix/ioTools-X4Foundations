"use strict";

import ApiClient from "../shared/api_client.js";
import FilePathUtils from "../shared/file_path_utils.js";
import { SharedLibs } from "../shared/shared_libs.js";
import { XmlUtils } from "../xml/xml_utils.js";
const consoleUtils = SharedLibs.ConsoleUtils;
const queryTools = SharedLibs.QueryTools;
const apiClient = SharedLibs.ApiClient;
const sortUtils = SharedLibs.SortUtils;
const sharedEnums = SharedLibs.SharedEnums;
const filePathUtils = SharedLibs.FilePathUtils;

document.addEventListener("DOMContentLoaded", async () => {
  consoleUtils.logInfo("[viewer.js] DOMContentLoaded - Starting viewer");

  // 1) Parse query params using shared QueryTools
  const file = FilePathUtils.normalize(queryTools.getParam("file"));
  const type = queryTools.getParam("type");
  if (!file || !type) {
    consoleUtils.logWarning("No file or type specified in query params.");
    return;
  }

  // 2) Cache DOM containers
  const viewerOptions = await apiClient.getElement("#viewerOptions");
  const viewerContent = await apiClient.getElement("#viewerContent");
  const sheetJSView = await apiClient.getElement("#sheetJSView");

  viewerContent.innerHTML = "";
  if (sheetJSView) sheetJSView.innerHTML = "";

  consoleUtils.logInfo(`[viewer.js] File: ${file}, Type: ${type}`);

  // 3) Decide how to display the file, depending on type
  if (type === "xml") {
    // For example, we might want a "Transform" button, "Tree View" button, for the XML files.
    viewerOptions.innerHTML = `
      <p class="h3 mt-2 mb-5">Data (XML) viewer: ${file}</p>
      <div class="mb-3 p-2 border" id="filePickerContainer">Drop XSL file here</div>
      <p>Selected XSL File: <span id="xslFileName">No file chosen</span></p>
      <button id="transformBtn" class="btn btn-primary mt-2">Transform XML</button>
      <button id="treeViewBtn" class="btn btn-secondary mt-2">Tree View</button>
    `;

    const transformBtn = await apiClient.getElement("#transformBtn");
    const treeViewBtn = await apiClient.getElement("#treeViewBtn");
    const filePickerContainer = await apiClient.getElement(
      "#filePickerContainer"
    );

    // By default, let's just show the raw XML:
    XmlUtils.displayRawContent(file, viewerContent);
    let isTransformed = false;
    let isTreeView = false;

    // Transform button toggles raw vs. transformed
    transformBtn.addEventListener("click", async () => {
      if (!isTransformed) {
        // Attempt an auto transform
        const success = await XmlUtils.autoTransformXML(file);
        if (success) {
          transformBtn.textContent = "Revert to Raw XML";
          isTransformed = true;
        } else {
          consoleUtils.logWarning(
            "No .xsl/.xslt found automatically. Still raw."
          );
        }
      } else {
        // revert to raw
        await XmlUtils.displayRawContent(file, viewerContent);
        transformBtn.textContent = "Transform XML";
        isTransformed = false;
      }
    });

    // Tree view toggles a collapsible tree
    treeViewBtn.addEventListener("click", async () => {
      if (!isTreeView) {
        await XmlUtils.displayAsTree(file, viewerContent);
        ApiClient.hideElement("#transformBtn");
        treeViewBtn.textContent = "Close Tree View";
      } else {
        // revert to last state
        ApiClient.showElement("#transformBtn");
        if (isTransformed) {
          await XmlUtils.autoTransformXML(file);
          transformBtn.textContent = "Revert to Raw XML";
        } else {
          await XmlUtils.displayRawContent(file, viewerContent);
          transformBtn.textContent = "Transform XML";
        }
        treeViewBtn.textContent = "Tree View";
      }
      isTreeView = !isTreeView;
    });

    // Drag & Drop for XSL
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

            // fetch + parse the XML
            const resultDoc = await apiClient.fetchXML(file, {
              styleEndpoint: droppedFile,
            });

            viewerContent.innerHTML = "";
            viewerContent.appendChild(resultDoc);
            transformBtn.textContent = "Revert to Raw XML";
            isTransformed = true;
          }
        }
      }
    });
  } else if (type === "xls" || type === "xlsx") {
    viewerOptions.innerHTML = `
      <p class="h3 mt-2 mb-5">Sheet (XLS/XLSX) viewer: ${file}</p>
      <button id="sheetJSBtn" class="btn btn-primary mt-2">View with SheetJS</button>
      <button id="rawSheetBtn" class="btn btn-secondary mt-2">Raw View</button>
    `;
    const sheetJSBtn = document.getElementById("sheetJSBtn");
    const rawSheetBtn = document.getElementById("rawSheetBtn");
    if (sheetJSBtn && rawSheetBtn) {
      sheetJSBtn.addEventListener("click", async () => {
        consoleUtils.logInfo("Showing spreadsheet with SheetJS...");
        if (sheetJSView) {
          await XmlUtils.displaySpreadsheet(file, sheetJSView);
          sheetJSView.style.display = "block";
          viewerContent.style.display = "none";
        }
      });
      rawSheetBtn.addEventListener("click", async () => {
        consoleUtils.logInfo("Showing raw spreadsheet content...");
        if (sheetJSView) sheetJSView.style.display = "none";
        viewerContent.style.display = "block";
        await XmlUtils.displayRawContent(file, viewerContent);
      });
    }
    // By default, show raw content
    await XmlUtils.displayRawContent(file, viewerContent);
  } else if (type === "xsd" || type === "xsl") {
    // We can just show raw content
    viewerOptions.innerHTML = `<p class="h3 mt-2 mb-5">Viewing file: ${file}</p>`;
    await XmlUtils.displayRawContent(file, viewerContent);
  } else {
    viewerOptions.innerHTML = `<p class="h3 mt-2 mb-5">Unsupported file type: ${file}.</p>`;
    consoleUtils.logWarning(`Unsupported type: ${type}`);
  }

  // If you want tooltips for .tree-node:
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
      tooltip.style.left = `${event.clientX + 10}px`;
      tooltip.style.top = `${event.clientY + 10}px`;
    }
  });
  document.addEventListener("mouseout", (event) => {
    const related = event.relatedTarget;
    if (!related || !related.closest(".tree-node")) {
      tooltip.style.display = "none";
    }
  });
});
