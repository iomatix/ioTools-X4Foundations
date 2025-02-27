"use strict";

import { XmlUtils } from "../xml/xml_utils.js";


document.addEventListener("DOMContentLoaded", () => {
  console.log("[scriptproperties.js] DOMContentLoaded - Starting up...");

  // For debugging, let's see if we can find these elements:
  const expressionInput = document.getElementById("expression");
  const divXMLDisplay = document.getElementById("divXMLDisplay");
  const showMdCheckbox = document.getElementById("show_md");
  const showAiCheckbox = document.getElementById("show_ai");
  const sortCheckbox = document.getElementById("sort");
  const statusIndicator = document.getElementById("statusIndicator");
  const hintStatus = window.$ ? $("#hintStatus") : null;

  if (!expressionInput || !divXMLDisplay) {
    console.error("[scriptproperties.js] Missing required elements. Aborting.");
    return;
  }

  // Create the viewer with default or explicit paths to your XML + XSL.
  const viewer = new XmlUtils.DocumentationViewer({
    expressionInput,
    divXMLDisplay,
    showMdCheckbox,
    showAiCheckbox,
    sortCheckbox,
    statusIndicator,
    hintStatus,
    xmlFile: "scriptproperties.xml",
    xslFile: "scriptproperties.xsl",
  });

  // Attach event listeners for the filter/sort checkboxes.
  expressionInput.addEventListener("input", () => viewer.debouncedUpdate());
  showMdCheckbox.addEventListener("change", () => viewer.debouncedUpdate());
  showAiCheckbox.addEventListener("change", () => viewer.debouncedUpdate());
  sortCheckbox.addEventListener("change", () => viewer.debouncedUpdate());

  // Initialize the viewer (loads the XML + XSL).
  viewer.init();

  // Buttons for toggling transform vs. raw vs. tree.
  const transformBtn = document.getElementById("transformBtn");
  const treeViewBtn = document.getElementById("treeViewBtn");

  let isTransformed = true; // track whether we are in transform or raw mode
  if (transformBtn) {
    transformBtn.addEventListener("click", async () => {
      if (isTransformed) {
        // revert to raw
        await XmlUtils.displayRawContent(viewer.xmlFile, divXMLDisplay);
        transformBtn.textContent = "Transform XML";
      } else {
        // transform again
        await viewer.transformXML();
        transformBtn.textContent = "Revert to Raw XML";
      }
      isTransformed = !isTransformed;
    });
  }

  let isTreeView = false;
  if (treeViewBtn) {
    treeViewBtn.addEventListener("click", async () => {
      if (!isTreeView) {
        // show tree
        await XmlUtils.displayAsTree(viewer.xmlFile, divXMLDisplay);
        treeViewBtn.textContent = "Close Tree View";
      } else {
        // revert to last transform
        if (isTransformed) {
          await viewer.transformXML();
          transformBtn.textContent = "Revert to Raw XML";
        } else {
          await XmlUtils.displayRawContent(viewer.xmlFile, divXMLDisplay);
          transformBtn.textContent = "Transform XML";
        }
        treeViewBtn.textContent = "Tree View";
      }
      isTreeView = !isTreeView;
    });
  }

  // Drag + Drop for XSL
  const filePickerContainer = document.getElementById("filePickerContainer");
  if (filePickerContainer) {
    // Also, to prevent the browser from opening the file if user drops outside:
    document.addEventListener("dragover", (e) => e.preventDefault());
    document.addEventListener("drop", (e) => e.preventDefault());

    filePickerContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      filePickerContainer.classList.add("dragover");
    });
    filePickerContainer.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      filePickerContainer.classList.remove("dragover");
    });
    filePickerContainer.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      filePickerContainer.classList.remove("dragover");
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        for (const file of files) {
          if (file.name.endsWith(".xsl") || file.name.endsWith(".xslt")) {
            console.log("[scriptproperties.js] Dropped XSL file:", file.name);
            window.activeXslFile = file;
            XmlUtils.updateXslFileName(file);
            // parse the XSL from the file
            const xslText = await new Response(file).text();
            const parser = new DOMParser();
            viewer.xslDoc = parser.parseFromString(xslText, "application/xml");
            // re-transform
            viewer.transformXML();
          }
        }
      }
    });
  }

  // Tooltip for tree nodes
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
