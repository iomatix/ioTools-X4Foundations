"use strict";

import ApiClient from "../shared/api_client.js";
import QueryTools from "../shared/query_tools.js";
import { SharedLibs } from "../shared/shared_libs.js";
const console = SharedLibs.ConsoleUtils;
const apiClient = SharedLibs.ApiClient;
const sharedEnums = SharedLibs.SharedEnums;
const filePathUtils = SharedLibs.FilePathUtils;
const queryTools = SharedLibs.QueryTools;
const sortUtils = SharedLibs.SortUtils;

/**
 * Updates the href attribute of the given link element to point to the
 * currently selected folder, or the root folder if none is selected.
 *
 * @param {string} selector - A CSS selector for the link element to update.
 * @returns {void}
 */
function updateRawBrowsingLink(selector) {
  const folder = queryTools.getParam("folder") || ".";
  const link = apiClient.getElement(selector);
  link.href = `${folder}`;
}

/**
 * Displays a list of items in a folder in the given HTML element.
 *
 * @param {array} items - An array of item objects with the following properties:
 *   - name {string}: The name of the item.
 *   - type {string}: The type of item (either "directory" or "file").
 *   - path {string}: The path of the item.
 * @param {string} selector - A CSS selector for the HTML element to display the items in.
 * @param {string} [sortMode=SharedEnums.SORT_MODE.ALPHA_WITH_PARENT] - The sort mode to use for the items.
 *   - `SharedEnums.SORT_MODE.ALPHA`: Sort alphabetically with special characters first.
 *   - `SharedEnums.SORT_MODE.ALPHA_WITH_PARENT`: Sort alphabetically with special characters first and `../` on top.
 *   - `SharedEnums.SORT_MODE.DEFAULT`: No sorting, display items in the order they are given.
 */
async function displayItems(items, selector, sortMode) {
  const itemListDiv = await apiClient.getElement(selector);
  itemListDiv.innerHTML = "";

  console.logDebug(`Displaying ${items.length} items`);
  if (items.length === 0) {
    itemListDiv.innerHTML = "No items found.";
    return;
  }

  // Apply sorting of items
  items = await sortUtils.sortItems(items, sortMode);

  // Rendering logic
  let divFolders = [];
  let divFiles = [];
  items.forEach((item) => {
    const divFolder = apiClient.createElement("div", {
      class: "item folder-item",
    });
    const divFile = apiClient.createElement("div", {
      class: "item file-item",
    });

    if (item.type === "directory") {
      /* For directories, create a link to navigate deeper into the folder structure. */
      const folderPath = filePathUtils.normalize(item.path);
      const folderUrl =  QueryTools.buildUrl("xmlbrowser.html", {folder: folderPath});
      const link = apiClient.createElement("a", {
        href: folderUrl,
        class: "raw-file-link",
        textContent: item.name + "/",
      });
      divFolder.appendChild(link);
      divFolders.push(divFolder);
    } else {
      /* For files, create multiple elements: */
      // 1. Raw view link (opens in a new tab)
      const rawLink = apiClient.createElement("a", {
        href: item.path,
        class: "raw-file-link",
        target: "_blank",
        textContent: item.name,
      });
      divFile.appendChild(rawLink);

      // 2. "Enhanced Viewer" button for viewing in-browser.
      const supportedExtensions = ["xml", "xsd", "xls", "xlsx", "xmd"];
      const fileExtension = filePathUtils.getFileExtension(item.name);
      if (supportedExtensions.includes(fileExtension)) {
        const openButton = apiClient.createPrimaryButton(
          "Open in Enhanced Viewer",
          () => apiClient.openFileInBrowser(item.path, fileExtension)
        );
        divFile.appendChild(openButton);
      }

      // 3. External App launch link (appended last)
      const fileParam = filePathUtils.normalize(item.path);
      const extUrl = QueryTools.buildUrl("/launch", {file: fileParam});
      const extLink = apiClient.createElement("a", {
        href: extUrl,
        target: "_blank",
        textContent: "Open in External Application",
        class: "btn btn-secondary btn-sm ms-2 external-link",
      });
      divFile.appendChild(extLink);
      divFiles.push(divFile);
    }
  });

  // Appending to the itemListDiv, Folders first
  divFolders.forEach((divFolder) => {
    itemListDiv.appendChild(divFolder);
  });
  divFiles.forEach((divFile) => {
    itemListDiv.appendChild(divFile);
  });
}

/* Initialize the page */
document.addEventListener("DOMContentLoaded", () => {
  updateRawBrowsingLink("#rawBrowsingLink");
  const currentFolder = queryTools.getParam("folder") || ".";
  ApiClient.getElement("#dirInfo", {
    textContent: (currentFolder && currentFolder !== '.') ? `${currentFolder}` : '',
  });
  apiClient.fetchResourceList(
    "/api",
    {
      folder: currentFolder,
      sortMode: sharedEnums.SORT_MODE.ALPHA_WITH_PARENT,
    },
    {},
    displayItems
  );
  console.logDebug(`Current folder: ${currentFolder}`);
});
