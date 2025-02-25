"use strict";

import ConsoleStyles from "./console_scripts.js";
import {
  ApiClient,
  SharedEnums,
  FilePathUtils,
  QueryTools,
  SortingUtils,
} from "./shared_lib.js";

/**
 * Updates the href attribute of the given link element to point to the
 * currently selected folder, or the root folder if none is selected.
 *
 * @param {string} selector - A CSS selector for the link element to update.
 * @returns {void}
 */
function updateRawBrowsingLink(selector) {
  const folder = QueryTools.getParam("folder") || ".";
  const link = ApiClient.getElement(selector);
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
function displayItems(items, selector, sortMode) {
  const itemListDiv = ApiClient.getElement(selector);
  itemListDiv.innerHTML = "";

  ConsoleStyles.logDebug(`Displaying ${items.length} items`);
  if (items.length === 0) {
    itemListDiv.innerHTML = "No items found.";
    return;
  }

  // Apply sorting of items
  items = SortingUtils.sortItems(items, sortMode);

  // Rendering logic
  let divFolders = [];
  let divFiles = [];
  items.forEach((item) => {
    const divFolder = ApiClient.createElement("div", {
      class: "item folder-item",
    });
    const divFile = ApiClient.createElement("div", {
      class: "item file-item",
    });

    if (item.type === "directory") {
      /* For directories, create a link to navigate deeper into the folder structure. */
      const folderPath = FilePathUtils.normalize(item.path);
      const link = ApiClient.createElement("a", {
        href: `xmlbrowser.html?folder=${encodeURIComponent(folderPath)}`,
        class: "raw-file-link",
        textContent: item.name + "/",
      });
      divFolder.appendChild(link);
      divFolders.push(divFolder);
    } else {
      /* For files, create multiple elements: */
      // 1. Raw view link (opens in a new tab)
      const rawLink = ApiClient.createElement("a", {
        href: item.path,
        class: "raw-file-link",
        target: "_blank",
        textContent: item.name,
      });
      divFile.appendChild(rawLink);

      // 2. "Enhanced Viewer" button for viewing in-browser.
      const supportedExtensions = ["xml", "xsd", "xls", "xlsx", "xmd"];
      const fileExtension = FilePathUtils.getFileExtension(item.name);
      if (supportedExtensions.includes(fileExtension)) {
        const openButton = ApiClient.createPrimaryButton(
          "Open in Enhanced Viewer",
          () => ApiClient.openFileInBrowser(item.path, fileExtension)
        );
        divFile.appendChild(openButton);
      }

      // 3. External App launch link (appended last)
      const fileParam = FilePathUtils.normalize(item.path);
      const extLink = ApiClient.createElement("a", {
        href: `/launch?file=${encodeURIComponent(fileParam)}`,
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

  const currentFolder = QueryTools.getParam("folder") || ".";
  ApiClient.fetchResourceList("/api", { folder: currentFolder, sortMode: SharedEnums.SORT_MODE.ALPHA_WITH_PARENT }, {}, displayItems);
  ConsoleStyles.logDebug(`Current folder: ${currentFolder}`);
});
