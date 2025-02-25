"use strict";

import ConsoleStyles from "./console_scripts.js";

/* ENUMS */
export const SharedEnums = {
  SORT_MODE: {
    DEFAULT: "default", // No sorting
    ALPHA: "alpha", // Alphabetical sorting
    ALPHA_WITH_PARENT: "alpha_with_parent", // Alphabetical with `../` on top
    DATE_NEWEST: "date_newest", // Sort by date (newest first)
    DATE_OLDEST: "date_oldest", // Sort by date (oldest first)
    TYPE: "type", // Sort by item type (folders first)
    SIZE_LARGEST: "size_largest", // Sort by size (largest first)
    SIZE_SMALLEST: "size_smallest", // Sort by size (smallest first)
  },
};
  
/**
 * Global Client Methods
 *
 * @type {{ openFileInBrowser: (filePath: string, fileExtension: string) => void; fetchResource: (endpoint: string, params?: { statusSelector?: string; }) => Promise<any>; fetchXML: (pathEndpoint: string, params?: { ...; }) => Promise<...>; ... 13 more ...; getElement: (selector: string, options?: { ...; }) => Element; }}
 */
export const ApiClient = {
  /**
   * Open a file in a new tab using the viewer.html file with the query
   * parameters `file` and `type` set to the provided file path and extension.
   * This will open the file in a new tab with the viewer.html file as the
   * entry point.
   * @param {string} filePath The path to the file to open.
   * @param {string} fileExtension The file extension to associate with the
   * file.
   */
  openFileInBrowser: (filePath, fileExtension) => {
    // Build a URL with query parameters for file and type
    const viewerUrl = QueryTools.buildUrl("viewer.html", {
      file: encodeURIComponent(filePath),
      type: encodeURIComponent(fileExtension),
    });
    window.open(viewerUrl, "_blank", "noopener, noreferrer");
  },

  /**
   * Fetches a resource from the given endpoint and returns the JSON response.
   *
   * @param {string} endpoint The URL of the resource to fetch.
   * @param {Object} [params] Optional query parameters to include in the request.
   * @param {Object} [options] Optional configuration options for the request.
   * @param {string} [options.statusSelector] The selector for the element
   *   where the status of the request will be displayed.
   *
   * @returns {Promise<Object>} The JSON response from the server.
   */
  fetchResource: async (endpoint, params, options = {}) => {
    const { statusSelector = ".default-fetch-status" } = options;

    ConsoleStyles.logDebug(`Fetching resource from endpoint: ${endpoint}...`);
    if (statusSelector)
      StatusManager.set(
        statusSelector,
        `Fetching from endpoint: ${endpoint}...`
      );
    try {
      const query = QueryTools.buildQuery(params);
      ConsoleStyles.logDebug(`Query: ${query} for endpoint: ${endpoint}`);
      const response = await fetch(`${endpoint}?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      ConsoleStyles.logError(`Failed to load ${endpoint}: ${error.message}`);
      throw error;
    } finally {
      if (statusSelector) StatusManager.clear(statusSelector);
    }
  },


/**
 * Fetches an XML document from the specified path and optionally transforms
 * it using an XSLT stylesheet.
 *
 * @param {string} pathEndpoint - The URL path from which to fetch the XML document.
 * @param {Object} [params={}] - Optional query parameters to include in the request.
 * @param {Object} [options={}] - Optional configuration options for the request.
 * @param {string} [options.statusSelector=".default-fetch-status"] - Selector for the status element to update.
 * @param {string} [options.xsltEndpoint] - The URL path for the XSLT stylesheet used for transforming the XML.
 *
 * @returns {Promise<Document>} A promise that resolves to the fetched XML document,
 * or the transformed XML document if an XSLT endpoint is provided.
 *
 * @throws Will throw an error if the fetch fails or the response is not ok.
 */

  fetchXML: async (pathEndpoint, params = {}, options = {}) => {
    const { statusSelector = ".default-fetch-status", xsltEndpoint } = options;
  
    ConsoleStyles.logDebug(`Fetching from path: ${pathEndpoint}...`);
    if (statusSelector)
      StatusManager.set(
        statusSelector,
        `Fetching XML from path: ${pathEndpoint}...`
      );
    try {
      const response = await fetch(pathEndpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xmlText = await response.text();
      ConsoleStyles.logDebug(`XML from ${pathEndpoint} loaded successfully.`);
      
      const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
  
      if (xsltEndpoint) {
        const xsltResponse = await fetch(xsltEndpoint);
        if (!xsltResponse.ok) throw new Error(`HTTP ${xsltResponse.status}`);
        const xsltText = await xsltResponse.text();
        const xsltDoc = new DOMParser().parseFromString(xsltText, "application/xml");
  
        const xsltProcessor = new XSLTProcessor();
        xsltProcessor.importStylesheet(xsltDoc);
        
        const resultDocument = xsltProcessor.transformToDocument(xmlDoc);
        ConsoleStyles.logDebug(`XML transformed successfully using XSLT.`);
        return resultDocument;
      } else {
        return xmlDoc;
      }
    } catch (error) {
      ConsoleStyles.logError(
        `Failed to load ${pathEndpoint}: ${error.message}`
      );
      throw error;
    } finally {
      if (statusSelector) StatusManager.clear(statusSelector);
    }
  },
  

  
  /**
   * Fetches a list of resources from a specified endpoint with given parameters.
   *
   * @param {string} endpoint - The endpoint URL to fetch the resource list from.
   * @param {Object} params - An object containing query parameters and additional settings.
   * @param {Object} options - An object containing additional options.
   * @param {string} [options.folderParam="folder"] - The query parameter key to use for the current folder.
   * @param {string} [options.infoObjSelector="#dirInfo"] - The CSS selector for the element to display the current folder in.
   * @param {string} [options.fileItemsSelector="#fileItems"] - The CSS selector for the element to display the items in.
   * @param {string} [options.statusSelector=".default-fetch-status"] - The CSS selector for the status element to update during the fetch process.
   * @param {Function} displayCallback - A callback function to call with the fetched data, selector for the items element, and sort mode.
   * @returns {Promise<void>} - A promise that resolves when the data has been fetched and displayed.
   * @throws Will throw an error if the fetch fails or the response is not ok.
   */
  fetchResourceList: async (
    endpoint,
    params = {},
    options = {},
    displayCallback
  ) => {
    const {
      folderParam = "folder",
      sortMode = SharedEnums.SORT_MODE.ALPHA_WITH_PARENT,
      infoObjSelector = "#dirInfo",
      fileItemsSelector = "#fileItems",
      statusSelector = ".default-fetch-status",
    } = options;

    if (statusSelector)
        StatusManager.set(
          statusSelector,
          `Fetching items from endpoint: ${endpoint}...`
        );
    try {
    const folderParam = QueryTools.getParam("folder");
    const folderDisplay =
      !folderParam || folderParam === "." ? "root" : folderParam;
    ApiClient.getElement(infoObjSelector).textContent = `Current Directory: ${folderDisplay}`;

      const data = await ApiClient.fetchResource(endpoint, params, options);
      return displayCallback(data, fileItemsSelector, sortMode);
    } catch (error) {
      console.error(`Error loading items: ${error}`);
      throw error;
    } finally {
      if (statusSelector) StatusManager.clear(statusSelector);
    }
  },

  /**
   * Creates an HTML element with the specified tag and options.
   * @param {string} tag - The HTML tag name.
   * @param {Object} [options={}] - Options to customize the element.
   * @param {string} [options.class] - The CSS class name(s) to apply.
   * @param {Element[]} [options.children] - The child elements to append.
   * @param {Object} [options.style] - CSS styles to apply to the element.
   * @param {function} [options.onClick] - The event handler for the "click" event.
   * @param {function} [options.onInput] - The event handler for the "input" event.
   * @returns {Element} - The created element.
   */
  createElement: (tag, options = {}) => {
    const el = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
      if (key === "class") {
        el.className = value;
      } else if (key === "children") {
        value.forEach((child) => el.appendChild(child));
      } else if (key.startsWith("data-")) {
        el.setAttribute(key, value);
      } else if (key === "style") {
        Object.assign(el.style, value);
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el[key] = value;
      }
    });
    return el;
  },

  /**
   * Creates a container element with the specified class names, styles, and children.
   * @param {string} [classNames="container p-2"] - The CSS class names to apply.
   * @param {Object} [styles={}] - CSS styles to apply to the element.
   * @param {Element[]} [children=[]] - The child elements to append.
   * @returns {Element} - The created element.
   */
  createContainer: (
    classNames = "container p-2",
    styles = {},
    children = []
  ) => {
    const div = ApiClient.createElement("div", {
      class: classNames,
      style: styles,
      children: children,
    });
    return div;
  },

  /**
   * Creates a card container element with the specified id and class names.
   * @param {string} id - The id attribute for the container element.
   * @param {string} [classNames="container p-2 card-container"] - The CSS class names to apply.
   * @returns {Element} - The created container element.
   */
  createCardContainer: (id, classNames = "container p-2 card-container") => {
    return ApiClient.createElement("div", {
      id: id,
      class: classNames,
      style: styles,
    });
  },

  /**
   * Creates a menu container element with the specified class names and children.
   * @param {string} [classNames="container p-2 menu-container"] - The CSS class names to apply.
   * @param {Element[]} [children=[]] - The child elements to append.
   * @returns {Element} - The created container element.
   */
  createMenuContainer: (
    classNames = "container p-2 menu-container",
    children = []
  ) => {
    return ApiClient.createElement("div", {
      class: classNames,
      children: children,
    });
  },

  /**
   * Creates a container element with the specified id, class names, and styles
   * to display status information.
   * @param {string} id - The id attribute for the container element.
   * @param {string} [classNames="container p-2 default-fetch-status"] - The CSS class names to apply.
   * @param {Object} [styles={ display: "none" }] - CSS styles to apply to the element.
   * @returns {Element} - The created container element.
   */
  createStatusContainer: (
    id,
    classNames = "container p-2 default-fetch-status",
    styles = { display: "none" }
  ) => {
    return ApiClient.createElement("div", {
      id: id,
      class: classNames,
      style: styles,
    });
  },

  createPrimaryButton: (text, onClick) => {
    const btn = ApiClient.createElement("button", {
      class: "btn btn-primary btn-sm ms-2",
      textContent: text,
    });
    btn.addEventListener("click", onClick);
    return btn;
  },
  createSecondaryButton: (text, onClick) => {
    const btn = ApiClient.createElement("button", {
      class: "btn btn-secondary btn-sm ms-2",
      textContent: text,
    });
    btn.addEventListener("click", onClick);
    return btn;
  },

  createDangerButton: (text, onClick) => {
    const btn = ApiClient.createElement("button", {
      class: "btn btn-danger btn-sm ms-2",
      textContent: text,
    });
    btn.addEventListener("click", onClick);
    return btn;
  },

  createSuccessButton: (text, onClick) => {
    const btn = ApiClient.createElement("button", {
      class: "btn btn-success btn-sm ms-2",
      textContent: text,
    });
    btn.addEventListener("click", onClick);
    return btn;
  },

  createWarningButton: (text, onClick) => {
    const btn = ApiClient.createElement("button", {
      class: "btn btn-warning btn-sm ms-2",
      textContent: text,
    });
    btn.addEventListener("click", onClick);
    return btn;
  },

  createInfoButton: (text, onClick) => {
    const btn = ApiClient.createElement("button", {
      class: "btn btn-info btn-sm ms-2",
      textContent: text,
    });
    btn.addEventListener("click", onClick);
    return btn;
  },

  createExternalLink: (text, url) =>
    createElement("a", {
      class: "btn btn-secondary btn-sm ms-2 external-link",
      href: url,
      textContent: text,
      target: "_blank",
    }),

  /**
   * Finds and returns an element based on a given selector and options.
   *
   * @param {string} selector - A CSS selector to query the DOM for.
   * @param {Object} options - An object containing additional options to style or configure the element.
   * @param {Element} [options.context=document] - The context element to search within.
   * @param {Element[]} [options.children] - An array of child elements to append to the found element.
   * @param {Object} [options.data-*] - An object containing data attributes to set on the element.
   * @param {Object} [options.style] - An object containing CSS styles to apply to the element.
   * @param {function} [options.on*] - A function to add as an event listener for the given event name.
   * @param {Object} [options.*] - Any other key-value pairs will be set directly on the element.
   * @returns {Element} The found element.
   */
  getElement: (selector, options = {}) => {
    let el;

    if (options.context) {
      el = options.context.querySelector(selector);
    } else {
      el = document.querySelector(selector);
    }

    Object.entries(options).forEach(([key, value]) => {
      if (key === "children") {
        value.forEach((child) => el.appendChild(child));
      } else if (key.startsWith("data-")) {
        el.setAttribute(key, value);
      } else if (key === "style") {
        Object.assign(el.style, value);
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el[key] = value;
      }
    });

    return el;
  },
};

/**
 * Query URL Query Tools
 *
 * @type {{ getParam: (name: any) => any; setParam: (name: string, value: string) => void; buildQuery: (params: any) => any; buildUrl: (baseUrl: string, params: any) => string; getAllParams: () => any; fetchWithParams: (endpoint: any, params: any) => unknown; }}
 */
export const QueryTools = {
  getParam: (name) => {
    const value = new URLSearchParams(window.location.search).get(name);
    return value ? value.replace(/^=+/, "") : null; // Trim leading `=` characters
  },
  /**
   * Sets a query parameter and updates the browser URL.
   * @param {string} name - The parameter name.
   * @param {string} value - The parameter value.
   */
  setParam: (name, value) => {
    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);
    params.set(name, value);
    window.history.replaceState({}, "", `${url.pathname}?${params}`);
  },
  buildQuery: (params) => new URLSearchParams(params).toString(),

  /**
   * Builds a URL with query parameters from a base URL and an object of
   * parameters.
   *
   * @param {string} baseUrl - The base URL to use.
   * @param {Object} params - An object containing query parameter key-value
   * pairs.
   * @returns {string} The resulting URL with query parameters.
   */
  buildUrl: (baseUrl, params) => {
    const query = QueryTools.buildQuery(params);
    return `${baseUrl}?${query}`;
  },
  getAllParams: () =>
    Object.fromEntries(new URLSearchParams(window.location.search)),

  fetchWithParams: async (endpoint, params) => {
    const query = QueryTools.buildQuery(params);
    const response = await fetch(`${endpoint}?${query}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json(); // Assuming the response is JSON
  },
};

/**
 * File Path Utilities
 *
 * @type {{ normalize: (path: any) => any; normalizeLeadingSlash: (path: any) => any; ensureLeadingSlash: (path: any) => any; join: (...parts: {}) => any; isRoot: (path: any) => boolean; getFileExtension: (filePath: any) => any; }}
 */
export const FilePathUtils = {
  normalize: (path) => path.replace(/^\/+/, ""),
  normalizeLeadingSlash: (path) =>
    path.startsWith("/") ? path.substring(1) : path,
  ensureLeadingSlash: (path) => (path.startsWith("/") ? path : `/${path}`),
  join: (...parts) => parts.map((p) => p.replace(/^\/|\/$/g, "")).join("/"),
  isRoot: (path) => path === "." || path === "",
  getFileExtension: (filePath) => filePath.split(".").pop().toLowerCase(),
};




/**
 * Utilities for sorting items
 *
 * @type {{ sortItemsAlpha: (a: any, b: any) => number; sortItemsWithParent: (items: {}, parentName?: string) => {}; sortItemsAlphabetically: (items: {}) => {}; sortItemsByDateNewest: (items: {}) => {}; ... 4 more ...; sortItems: (items: {}, sortMode: string) => {}; }}
 */
export const SortingUtils = {
  /**
   * Sort items alphabetically, with special characters first.
   * @param {object} a - First item to compare.
   * @param {object} b - Second item to compare.
   * @returns {number} A negative value if "a" comes first, a positive value if "b" comes first, or 0 if both are equal.
   */
  sortItemsAlpha: (a, b) => {
    const aFirstChar = a.name[0];
    const bFirstChar = b.name[0];

    const isASpecial = /^[^a-zA-Z0-9]/.test(aFirstChar);
    const isBSpecial = /^[^a-zA-Z0-9]/.test(bFirstChar);

    if (isASpecial && !isBSpecial) return -1;
    if (!isASpecial && isBSpecial) return 1;

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  },

  /**
   * Sorts items so that the parent directory ("../") is always on top, followed by alphabetical sorting of the remaining items.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - name {string}: The name of the item.
   *   - type {string}: The type of item (either "directory" or "file").
   *   - path {string}: The path of the item.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsWithParent: (items, parentName = "../") => {
    let parentDir = items.filter((item) => item.name === parentName);
    let otherItems = items.filter((item) => item.name !== parentName);

    otherItems.sort(SortingUtils.sortItemsAlpha);
    return [...parentDir, ...otherItems];
  },

  /**
   * Sorts items alphabetically, separating folders and files, and then sorting each group.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - name {string}: The name of the item.
   *   - type {string}: The type of item (either "directory" or "file").
   *   - path {string}: The path of the item.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsAlphabetically: (items) => {
    let folders = items.filter((item) => item.type === "directory");
    let files = items.filter((item) => item.type !== "directory");

    folders.sort(SortingUtils.sortItemsAlpha);
    files.sort(SortingUtils.sortItemsAlpha);

    return [...folders, ...files];
  },

  /**
   * Sorts items by date (newest first). If a date is missing for an item, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - date {string}: A date string in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ).
   * @returns {object[]} The sorted array of items.
   */
  sortItemsByDateNewest: (items) => {
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Sorts items by date (oldest first). If a date is missing for an item, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - date {string}: A date string in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ).
   * @returns {object[]} The sorted array of items.
   */
  sortItemsByDateOldest: (items) => {
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  /**
   * Sorts items by type, with folders first, then alphabetically.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - type {string}: The type of item (either "directory" or "file").
   * @returns {object[]} The sorted array of items.
   */
  sortItemsByType: (items) => {
    return items.sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return SortingUtils.sortItemsAlpha(a, b); // Folders are sorted first, then alphabetically
    });
  },

  /**
   * Sorts items by size (largest first). If an item's size is missing, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - size {number}: The size of the item in bytes.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsBySizeLargest: (items) => {
    return items.sort((a, b) => b.size - a.size);
  },

  /**
   * Sorts items by size (smallest first). If an item's size is missing, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - size {number}: The size of the item in bytes.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsBySizeSmallest: (items) => {
    return items.sort((a, b) => a.size - b.size);
  },


  /**
   * Sorts an array of items according to the given sort mode.
   *
   * @param {object[]} items - An array of item objects with the following properties:
   *   - name {string}: The name of the item.
   *   - type {string}: The type of item (either "directory" or "file").
   *   - path {string}: The path of the item.
   *   - date {string}: A date string in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ).
   *   - size {number}: The size of the item in bytes.
   * @param {string} sortMode - The sort mode to use, one of the following:
   *   - `SharedEnums.SORT_MODE.ALPHA`: Sort alphabetically with special characters first.
   *   - `SharedEnums.SORT_MODE.ALPHA_WITH_PARENT`: Sort alphabetically with special characters first and `../` on top.
   *   - `SharedEnums.SORT_MODE.DATE_NEWEST`: Sort by date (newest first).
   *   - `SharedEnums.SORT_MODE.DATE_OLDEST`: Sort by date (oldest first).
   *   - `SharedEnums.SORT_MODE.TYPE`: Sort by type, with folders first, then alphabetically.
   *   - `SharedEnums.SORT_MODE.SIZE_LARGEST`: Sort by size (largest first).
   *   - `SharedEnums.SORT_MODE.SIZE_SMALLEST`: Sort by size (smallest first).
   * @returns {object[]} The sorted array of items.
   */
  sortItems: (items, sortMode) => {
    switch (sortMode) {
      case SharedEnums.SORT_MODE.ALPHA:
        return SortingUtils.sortItemsAlphabetically(items);
      case SharedEnums.SORT_MODE.ALPHA_WITH_PARENT:
        return SortingUtils.sortItemsWithParent(items);
      case SharedEnums.SORT_MODE.DATE_NEWEST:
        return SortingUtils.sortItemsByDateNewest(items);
      case SharedEnums.SORT_MODE.DATE_OLDEST:
        return SortingUtils.sortItemsByDateOldest(items);
      case SharedEnums.SORT_MODE.TYPE:
        return SortingUtils.sortItemsByType(items);
      case SharedEnums.SORT_MODE.SIZE_LARGEST:
        return SortingUtils.sortItemsBySizeLargest(items);
      case SharedEnums.SORT_MODE.SIZE_SMALLEST:
        return SortingUtils.sortItemsBySizeSmallest(items);
      default:
        return items;
    }
  }


};
  
/**
 * Misc Utilities
 *
 * @type {{}}
 */
export const SharedUtils = {};

/**
 * Progress Status Manager
 *
 * @type {{ set: (selector: any, message: any) => void; clear: (selector: any) => void; setFromQueryParam: (paramName: any, selector: any) => void; clearAll: (selector: any) => void; }}
 */
export const StatusManager = {
  /**
   * Sets the text content and displays the elements matching the given
   * CSS selector with the given message.
   *
   * @param {string} selector - A CSS selector for the elements to update.
   * @param {string} message - The new text content for the elements.
   * @returns {void}
   */
  set: (selector, message) => {
    ConsoleStyles.logDebug(`Setting status message: ${message}`);
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.textContent = message;
      el.style.display = "block";
    });
  },
  /**
   * Clears the text content and hides the elements matching the given CSS
   * selector.
   *
   * @param {string} selector - A CSS selector for the elements to clear.
   * @returns {void}
   */
  clear: (selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
  },
  /**
   * Sets the status message from a URL query parameter.
   *
   * @param {string} paramName - The name of the query parameter to retrieve the message from.
   * @param {string} selector - A CSS selector for the elements to update with the message.
   * @returns {void}
   */

  setFromQueryParam: (paramName, selector) => {
    const message = QueryTools.getParam(paramName);
    if (message) {
      StatusManager.set(selector, message);
    }
  },
  /**
   * Clears all status elements matching the given CSS selector if any of the
   * URL query parameters have an empty value.
   *
   * @param {string} selector - A CSS selector for the elements to clear.
   * @returns {void}
   */
  clearAll: (selector) => {
    const params = QueryTools.getAllParams();
    for (const key in params) {
      if (params[key] === "") {
        StatusManager.clear(selector);
      }
    }
  },
};

export default {
  SharedUtils,
  SharedEnums,
  ApiClient,
  ConsoleStyles,
  QueryTools,
  StatusManager,
  FilePathUtils,
  SortingUtils,
};
