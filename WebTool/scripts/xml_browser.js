"use strict";

// Utility function to get URL parameters
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

// Update the Raw Browsing link using the 'folder' parameter
function updateRawBrowserLink() {
  const folder = getQueryParam("folder") || ".";
  const link = document.getElementById("rawbrowserlink");
  link.href = `${folder}`;
}

// Fetch the list of items (files/directories) for the given folder
async function fetchItemList(folder) {
  document.getElementById("folderInfo").textContent = `Browsing folder: ${
    folder === "." ? "root" : folder
  }`;
  try {
    const response = await fetch(`/api?folder=${encodeURIComponent(folder)}`);
    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    displayItems(data);
  } catch (error) {
    document.getElementById("itemList").innerHTML =
      "Error loading items: " + error;
  }
}

// Display file and directory items on the page
function displayItems(items) {
  const itemListDiv = document.getElementById("itemList");
  itemListDiv.innerHTML = "";
  if (items.length === 0) {
    itemListDiv.innerHTML = "No items found.";
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";

    if (item.type === "directory") {
      // For directories, create a link to navigate deeper into the folder structure.
      const folderPath = item.path.startsWith("/")
        ? item.path.substring(1)
        : item.path;
      const link = document.createElement("a");
      link.href = `xmlbrowser.html?folder=${encodeURIComponent(folderPath)}`;
      link.className = "raw-file-link";
      link.textContent = item.name + "/";
      div.appendChild(link);
    } else {
      // For files, create multiple elements:
      // 1. Raw view link (opens in a new tab)
      const rawLink = document.createElement("a");
      rawLink.href = item.path;
      rawLink.target = "_blank";
      rawLink.textContent = item.name;
      div.appendChild(rawLink);

      // 2. "Enhanced Viewer" button for viewing in-browser.
      const supportedExtensions = ["xml", "xsd", "xls", "xlsx", "xmd"];
      const fileExtension = item.name.split(".").pop().toLowerCase();
      if (supportedExtensions.includes(fileExtension)) {
        const openButton = document.createElement("button");
        openButton.textContent = "Open in Enhanced Viewer";
        openButton.className = "btn btn-primary btn-sm ms-2 external-link";
        openButton.addEventListener("click", () =>
          openInBrowser(item.path, fileExtension)
        );
        div.appendChild(openButton);
      }

      // 3. External launch link (appended last)
      const fileParam = item.path.startsWith("/")
        ? item.path.substring(1)
        : item.path;
      const extLink = document.createElement("a");
      extLink.href = `/launch?file=${encodeURIComponent(fileParam)}`;
      extLink.textContent = "Open in External Application";
      extLink.className = "btn btn-secondary btn-sm ms-2 external-link";
      extLink.target = "_blank";
      div.appendChild(extLink);
    }
    itemListDiv.appendChild(div);
  });
}

// Opens a new window with the viewer page and passes the file path and type
function openInBrowser(filePath, fileExtension) {
  // Build a URL for viewer.html with query parameters for file and type
  const viewerUrl = `viewer.html?file=${encodeURIComponent(
    filePath
  )}&type=${encodeURIComponent(fileExtension)}`;
  window.open(viewerUrl, "_blank", "noopener,noreferrer");
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  updateRawBrowserLink();
  const folder = getQueryParam("folder") || ".";
  fetchItemList(folder);
});
