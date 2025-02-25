"use strict";

import ConsoleStyles from "./console_scripts.js";
import { ApiClient, SharedEnums, FilePathUtils, QueryTools } from "./shared_lib.js";

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
 * Displays a list of items in a specified HTML element, with optional sorting.
 *
 * This function populates a DOM element, identified by the given selector,
 * with a list of items. Each item is rendered as a `div` with a class of
 * "item", and includes appropriate links and buttons based on its type.
 * Directories provide navigation links, while files offer options for
 * raw view, enhanced viewer, and external application launch.
 *
 * Sorting is applied based on the specified sort mode, which can be
 * alphabetical or alphabetical with parent directories (`../`) on top.
 *
 * @param {Array<Object>} items - The list of items to display, where each
 *   item is an object with properties like `name`, `type`, and `path`.
 * @param {string} selector - A CSS selector for the target DOM element 
 *   where items will be displayed.
 * @param {string} [sortMode=SharedEnums.SORT_MODE.ALPHA_WITH_PARENT] - The
 *   sorting mode to apply to the items, defaulting to alphabetical with
 *   parent directories prioritized.
 */
function displayItems(items, selector, sortMode = SharedEnums.SORT_MODE.ALPHA_WITH_PARENT) {
  const itemListDiv = ApiClient.getElement(selector);
  itemListDiv.innerHTML = "";

  if (items.length === 0) {
    itemListDiv.innerHTML = "No items found.";
    return;
  }

  // Apply sorting based on sortMode
  if (sortMode === SharedEnums.SORT_MODE.ALPHA || sortMode === SharedEnums.SORT_MODE.ALPHA_WITH_PARENT) {
    let parentDir = items.filter((item) => item.name === "../");
    let otherItems = items.filter((item) => item.name !== "../");

    // Sort alphabetically (case-insensitive)
    otherItems.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    // If ALPHA_WITH_PARENT, ensure `../` stays on top
    if (sortMode === SharedEnums.SORT_MODE.ALPHA_WITH_PARENT) {
      items = [...parentDir, ...otherItems];
    } else {
      items = otherItems; // Pure alphabetical sorting without `../`
    }
  }


  items.forEach((item) => {
    const div = ApiClient.createElement("div", {
      class: "item",
    });

    if (item.type === "directory") {
      /* For directories, create a link to navigate deeper into the folder structure. */
      const folderPath = FilePathUtils.normalize(item.path);
      const link = ApiClient.createElement("a", {
        href: `xmlbrowser.html?folder=${encodeURIComponent(folderPath)}`,
        class: "raw-file-link",
        textContent: item.name + "/",
      });
      div.appendChild(link);
    } else {
      /* For files, create multiple elements: */
      // 1. Raw view link (opens in a new tab)
      const rawLink = ApiClient.createElement("a", {
        href: item.path,
        class: "raw-file-link",
        target: "_blank",
        textContent: item.name,
      });
      div.appendChild(rawLink);

      // 2. "Enhanced Viewer" button for viewing in-browser.
      const supportedExtensions = ["xml", "xsd", "xls", "xlsx", "xmd"];
      const fileExtension = FilePathUtils.getFileExtension(item.name);
      if (supportedExtensions.includes(fileExtension)) {
        const openButton = ApiClient.createPrimaryButton(
          "Open in Enhanced Viewer",
          () => ApiClient.openFileInBrowser(item.path, fileExtension)
        );
        div.appendChild(openButton);
      }

      // 3. External App launch link (appended last)
      const fileParam = FilePathUtils.normalize(item.path);
      const extLink = ApiClient.createElement("a", {
        href: `/launch?file=${encodeURIComponent(fileParam)}`,
        target: "_blank",
        textContent: "Open in External Application",
        class: "btn btn-secondary btn-sm ms-2 external-link",
      });
      div.appendChild(extLink);
    }
    itemListDiv.appendChild(div);
  });
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  updateRawBrowsingLink("#rawBrowsingLink");
  
  const currentFolder = QueryTools.getParam("folder") || ".";
  ApiClient.fetchResourceList("/api", { folder: currentFolder }, {}, displayItems);
  ConsoleStyles.logDebug(`Current folder: ${currentFolder}`);
});
