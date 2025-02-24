"use strict";
// Global variable to store a XSL file
let activeXslFile = null;
function updateXslFileName() {
  const xslFileNameEl = document.getElementById("xslFileName");
  if (activeXslFile) {
    // If activeXslFile is a File object, use its "name" property;
    // if it's a string (e.g. from autoTransformXML), display it directly.
    xslFileNameEl.textContent = activeXslFile.name || activeXslFile;
  } else {
    xslFileNameEl.textContent = "No file chosen";
  }
}

// Utility function to get URL parameters
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

// Utility function to create a nested tree structure from XML with attributes (string version)
function createTreeFromXML(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return "";

  // Extract attributes
  let attributes = Array.from(node.attributes || [])
    .map((attr) => `${attr.name}="${attr.value}"`)
    .join(", ");
  let attrDisplay = attributes
    ? ` <span class="tree-attributes">(${attributes})</span>`
    : "";

  // Extract text content
  let textContent = node.textContent.trim();
  let textDisplay =
    textContent && node.children.length === 0
      ? `: <span class="tree-value">${textContent}</span>`
      : "";

  // Prepare tooltip content
  let tooltipContent = `Element: ${node.nodeName}`;
  if (attributes) tooltipContent += `\nAttributes: ${attributes}`;
  if (textContent) tooltipContent += `\nText: ${textContent}`;

  let html = `<li>
        <span class="tree-node" data-tooltip="${tooltipContent.replace(
          /"/g,
          "&quot;"
        )}">
            ${node.nodeName}${attrDisplay}${textDisplay}
        </span>`;

  const children = Array.from(node.childNodes).filter(
    (n) => n.nodeType === Node.ELEMENT_NODE
  );
  if (children.length > 0) {
    html += "<ul>";
    children.forEach((child) => {
      html += createTreeFromXML(child);
    });
    html += "</ul>";
  }
  html += "</li>";
  return html;
}

// DOM-based tree builder (preferred for performance)
function createTreeDOM(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

  const li = document.createElement("li");
  const span = document.createElement("span");
  span.classList.add("tree-node");

  // Build attribute and text info
  const attributes = Array.from(node.attributes || [])
    .map((attr) => `${attr.name}="${attr.value}"`)
    .join(", ");
  const attrDisplay = attributes
    ? ` <span class="tree-attributes">(${attributes})</span>`
    : "";
  const textContent = node.textContent.trim();
  const textDisplay =
    textContent && node.children.length === 0
      ? `: <span class="tree-value">${textContent}</span>`
      : "";
  const tooltipContent =
    `Element: ${node.nodeName}` +
    (attributes ? `\nAttributes: ${attributes}` : "") +
    (textContent ? `\nText: ${textContent}` : "");

  span.innerHTML = `${node.nodeName}${attrDisplay}${textDisplay}`;
  span.setAttribute("data-tooltip", tooltipContent.replace(/"/g, "&quot;"));
  li.appendChild(span);

  if (node.children.length > 0) {
    const ul = document.createElement("ul");
    for (let child of node.children) {
      const childTree = createTreeDOM(child);
      if (childTree) ul.appendChild(childTree);
    }
    li.appendChild(ul);
  }
  return li;
}

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

    // Attach collapse/expand events
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

async function loadFile() {
  const file = getQueryParam("file");
  const type = getQueryParam("type");
  const viewerOptions = document.getElementById("viewerOptions");
  const viewerContent = document.getElementById("viewerContent");

  if (type === "xml") {
    viewerOptions.innerHTML = `
        <p class="h3 mt-2 mb-5">Data (XML) viewer: ${file}</p>
        <div class="base mb-3 p-2" id="filePickerContainer">
            <input type="file"  class="form-control" id="xslFileInput" accept=".xsl,.xslt">
            <label for="xslFileInput" class="h4 mt-2 mb-5 form-label">
            Selected XSL File: <span id="xslFileName">No file chosen</span>
            </label>
            </br>
            <button id="transformBtn" class="btn btn-primary mt-2">Transform XML</button>
            <button id="treeViewBtn" class="btn btn-secondary mt-2">Tree View</button>
        </div>
      `;
    viewerContent.innerHTML = `
        <div class="p-2" id="xmlDisplay"></div>
        <div class="p-3" id="treeViewContainer" style="display: none;"></div>
      `;

    const filePickerContainer = document.getElementById("filePickerContainer");
    const xslFileInput = document.getElementById("xslFileInput");

    // Drag & Drop event handlers
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

    let isTransformed = false;
    const transformBtn = document.getElementById("transformBtn");
    filePickerContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      filePickerContainer.classList.remove("dragover");
      console.log("Drop event fired", e.dataTransfer.files);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // Set the dropped file to the global variable
        Array.from(files).forEach(async (el) => {
          if (el.name.endsWith(".xsl") || el.name.endsWith(".xslt")) {
            console.log("Dropped file:", el.name);
            if (await transformXML(file)) {
              activeXslFile = el;
              isTransformed = true;
              transformBtn.textContent = "Revert to Raw XML";
              updateXslFileName();
            }
          }
        });
      }
    });

    transformBtn.addEventListener("click", async () => {
      if (!isTransformed) {
        const success = await transformXML(file);
        if (success) {
          isTransformed = true;
          transformBtn.textContent = "Revert to Raw XML";
          updateXslFileName();
        } else {
          displayRawContent(file, document.getElementById("xmlDisplay"));
          isTransformed = false;
          transformBtn.textContent = "Transform XML";
        }
      } else {
        displayRawContent(file, document.getElementById("xmlDisplay"));
        isTransformed = false;
        transformBtn.textContent = "Transform XML";
      }
    });

    const transformed = await autoTransformXML(file);
    if (!transformed) {
      displayRawContent(file, document.getElementById("xmlDisplay"));
    } else {
      isTransformed = true;
      transformBtn.textContent = "Revert to Raw XML";
    }

    // Tree View Button Logic
    const treeViewBtn = document.getElementById("treeViewBtn");
    const xmlDisplay = document.getElementById("xmlDisplay");
    const treeViewContainer = document.getElementById("treeViewContainer");

    treeViewBtn.addEventListener("click", async () => {
      if (treeViewContainer.style.display === "none") {
        await displayAsTree(file, treeViewContainer);
        treeViewContainer.style.display = "block";
        xmlDisplay.style.display = "none";
        treeViewBtn.textContent = "Close Tree View";
      } else {
        treeViewContainer.style.display = "none";
        xmlDisplay.style.display = "block";
        treeViewBtn.textContent = "Tree View";
      }
    });
  } else if (type === "xls" || type === "xlsx") {
    viewerOptions.innerHTML = `
    <p class="h3 mt-2 mb-5">Sheet (XLS/XLSX) viewer: ${file}</p>
    <button id="sheetJSBtn" class="btn btn-primary mt-2">View with SheetJS</button>
    <button id="rawSheetBtn" class="btn btn-secondary mt-2">Raw View</button>
  `;
    viewerContent.innerHTML = `
    <div id="sheetJSView" style="display: none;"></div>
    <div id="rawSheetView" style="display: block;"></div>
  `;

    document
      .getElementById("sheetJSBtn")
      .addEventListener("click", async () => {
        await displaySpreadsheet(file, document.getElementById("sheetJSView"));
        document.getElementById("sheetJSView").style.display = "block";
        document.getElementById("rawSheetView").style.display = "none";
      });

    document.getElementById("rawSheetBtn").addEventListener("click", () => {
      displayRawContent(file, document.getElementById("rawSheetView"));
      document.getElementById("rawSheetView").style.display = "block";
      document.getElementById("sheetJSView").style.display = "none";
    });
  } else if (type === "xsd") {
    viewerOptions.innerHTML = `<p class="h3 mt-2 mb-5">Schema (XSD) viewer: ${file}</p>`;
    displayRawContent(file, viewerContent);
  } else if (type === "xmd") {
    viewerOptions.innerHTML = `<p class="h3 mt-2 mb-5">Viewing file: ${file}</p>`;
    displayRawContent(file, viewerContent);
  } else {
    viewerOptions.innerHTML = `<p class="h3 mt-2 mb-5">Unsupported file type: ${file}.</p>`;
  }
}

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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function transformXML(xmlFile) {
  const xslInput = document.getElementById("xslFileInput");
  let xslFile = null;
  if (xslInput.files.length > 0) {
    xslFile = xslInput.files[0];
  } else if (activeXslFile) {
    xslFile = activeXslFile;
  } else {
    alert("Please select or drop an XSL file.");
    return false;
  }
  try {
    const [xmlResponse, xslText] = await Promise.all([
      fetch(xmlFile),
      readFileAsText(xslFile),
    ]);
    if (!xmlResponse.ok) {
      alert("Error loading XML file.");
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
      const xmlDisplay = document.getElementById("xmlDisplay");
      xmlDisplay.innerHTML = "";
      xmlDisplay.appendChild(resultDocument);
      return true;
    } else {
      alert("XSLTProcessor not supported in this browser.");
      return false;
    }
  } catch (err) {
    alert("Error during transformation: " + err);
    return false;
  }
}

async function autoTransformXML(xmlFile) {
  const baseName = xmlFile.replace(/\.xml$/i, "");
  const candidates = [`${baseName}.xsl`, `${baseName}.xslt`];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (response.ok) {
        const xslText = await response.text();
        const xmlResponse = await fetch(xmlFile);
        if (!xmlResponse.ok) {
          console.error("Error loading XML file.");
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
          const viewerContent = document.getElementById("xmlDisplay");
          viewerContent.innerHTML = "";
          viewerContent.appendChild(resultDocument);

          // Convert the candidate URL into a File object
          const candidateResponse = await fetch(candidate);
          const candidateBlob = await candidateResponse.blob();
          // Extract the file name from the URL (adjust if necessary)
          const candidateName = candidate.split("/").pop();
          activeXslFile = new File([candidateBlob], candidateName, {
            type: candidateBlob.type,
          });
          updateXslFileName();

          return true;
        } else {
          console.error("XSLTProcessor not supported.");
          return false;
        }
      }
    } catch (err) {
      console.error("Error fetching candidate XSL file:", candidate, err);
    }
  }
  console.log("No automatic XSL file transformation applied.");
  return false;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function displaySpreadsheet(file, container) {
  try {
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

document.addEventListener("DOMContentLoaded", () => {
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

document.addEventListener("DOMContentLoaded", loadFile);
