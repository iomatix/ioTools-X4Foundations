"use strict";

import ConsoleUtils from "./console_utils.js";
import QueryTools from "./query_tools.js";
import StatusManager from "./status_manager.js";
import SharedEnums from "./shared_enums.js";

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
  openFileInBrowser: async (filePath, fileExtension) => {
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
   * @param {Object} params An object containing query parameters and additional settings.
   * @param {Object} [options] Optional configuration options for the request.
   * @param {string} [options.statusSelector] The selector for the element
   *   where the status of the request will be displayed.
   *
   * @returns {Promise<Object>} The JSON response from the server.
   */
  fetchResource: async (endpoint, params = {}, options = {}) => {
    if (typeof params !== "object" || params === null) {
      throw new Error("params must be an object.");
    }
    const { statusSelector = ".default-fetch-status" } = options;
    ConsoleUtils.logDebug(`Fetching resource from endpoint: ${endpoint}...`);
    if (statusSelector)
      StatusManager.set(
        statusSelector,
        `Fetching from endpoint: ${endpoint}...`
      );
    try {
      const data = await QueryTools.fetchWithParams(endpoint, params);
      ConsoleUtils.logDebug(
        `Query: ${QueryTools.buildQuery(params)} for endpoint: ${endpoint}`
      );
      return data;
    } catch (error) {
      ConsoleUtils.logError(`Failed to load ${endpoint}: ${error.message}`);
      throw error;
    } finally {
      if (statusSelector) StatusManager.clear(statusSelector);
    }
  },

  /**
   * Fetches an XML document from the specified path and optionally transforms
   * it using an XSLT stylesheet.
   *
   * @param {string} endpoint - The URL path from which to fetch the XML document.
   * @param {Object} [params={}] - Optional query parameters to include in the request.
   * @param {Object} [options={}] - Optional configuration options for the request.
   * @param {string} [options.statusSelector=".default-fetch-status"] - Selector for the status element to update.
   * @param {string} [options.styleEndpoint] - The URL path for the XSLT stylesheet used for transforming the XML.
   *
   * @returns {Promise<Document>} A promise that resolves to the fetched XML document,
   * or the transformed XML document if an XSLT endpoint is provided.
   *
   * @throws Will throw an error if the fetch fails or the response is not ok.
   */
  fetchXML: async (endpoint, params = {}, options = {}) => {
    const { styleEndpoint, statusSelector = ".default-fetch-status" } = options;
    if (typeof params !== "object" || params === null) {
      throw new Error("params must be an object.");
    }
    const query = QueryTools.buildQuery(params);
    const fullEndpoint = query ? `${endpoint}?${query}` : endpoint;
    ConsoleUtils.logDebug(`Fetching from path: ${fullEndpoint}...`);

    ConsoleUtils.logDebug(`Fetching from path: ${endpoint}...`);
    if (statusSelector)
      StatusManager.set(
        statusSelector,
        `Fetching XML from path: ${endpoint}...`
      );
    try {
      const response = await fetch(fullEndpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xmlText = await response.text();
      ConsoleUtils.logDebug(`XML from ${endpoint} loaded successfully.`);

      // Parser Error Checking
      const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
      const parserError = xmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        throw new Error(`XML parsing error: ${parserError[0].textContent}`);
      }

      if (styleEndpoint) {
        if (window.XSLTProcessor) {
          let xsltDoc = styleEndpoint;
          if (!(styleEndpoint instanceof Document)) {
            // Handle URL case
            const xsltResponse = await fetch(styleEndpoint);
            if (!xsltResponse.ok)
              throw new Error(`HTTP ${xsltResponse.status}`);
            const xsltText = await xsltResponse.text();
            xsltDoc = new DOMParser().parseFromString(
              xsltText,
              "application/xml"
            );
          }
          const xsltProcessor = new XSLTProcessor();
          xsltProcessor.importStylesheet(xsltDoc);
          const resultDocument = xsltProcessor.transformToDocument(xmlDoc);
          ConsoleUtils.logDebug(`XML transformed successfully using XSLT.`);
          return resultDocument;
        } else {
          throw new Error("XSLT Processing is not supported in this browser.");
        }
      } else {
        return xmlDoc;
      }
    } catch (error) {
      ConsoleUtils.logError(`Failed to load ${endpoint}: ${error.message}`);
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
    if (typeof displayCallback !== "function") {
      throw new Error("displayCallback must be a function.");
    }
    const {
      sortMode = SharedEnums.SORT_MODE.ALPHA_WITH_PARENT,
      infoObjSelector = "#dirInfo",
      fileItemsSelector = "#fileItems",
      statusSelector = ".default-fetch-status",
      folderParam = "folder",
    } = options;

    if (statusSelector)
      StatusManager.set(
        statusSelector,
        `Fetching items from endpoint: ${endpoint}...`
      );
    try {
      const folderValue = QueryTools.getParam(folderParam);
      const folderDisplay =
        !folderValue || folderValue === "." ? "root" : folderValue;
      ApiClient.getElement(
        infoObjSelector
      ).textContent = `Current Directory: ${folderDisplay}`;

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
   * @param {function} [options.onInput] - The event handler for the "input" events.
   * @returns {Element} - The created element.
   *
   * Example usage:
   * ```js
   * // Create a simple button with an onClick event handler and some styles
   * const button = createElement('button', {
   *   class: 'btn-primary',
   *   style: {
   *     padding: '10px 20px',
   *     fontSize: '16px'
   *   },
   *   children: ['Click Me'],
   *   onClick: (event) => {
   *     alert('Button clicked!');
   *   }
   * });
   *
   * // Append the button to the document body
   * document.body.appendChild(button);
   * ```
   */
  createElement: (tag, options = {}) => {
    const el = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
      if (key === "class") {
        el.className = value;
      } else if (key === "children") {
        value.forEach((child) => {
          if (typeof child === "string" || typeof child === "number") {
            el.appendChild(document.createTextNode(child));
          } else if (child instanceof Node) {
            el.appendChild(child);
          }
        });
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
   * Creates a card container div element with specified styles and children.
   *
   * @param {string} id       - The ID of the div element
   * @param {string|string[]|null} classNames - Class names for styling. Defaults to "container p-2 card-container".
   * @param {object|null} styles    - CSS styles configuration. Defaults to an empty object.
   * @param {any[]|null} children   - Child elements to include inside the div. Defaults to an empty array.
   *
   * @returns {HTMLElement} A div element with the specified attributes and child content.
   */
  createCardContainer: (
    id,
    classNames = "container p-2 card-container",
    styles = {},
    children = []
  ) => {
    return ApiClient.createElement("div", {
      id: id,
      class: classNames,
      style: styles,
      children: children,
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
    styles = {},
    children = []
  ) => {
    return ApiClient.createElement("div", {
      class: classNames,
      style: styles,
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

  /**
   * @private
   * Creates a button element with consistent styling and event handling
   */
  _createButtonElement(btnClass, text, onClick) {
    const btn = this.createElement("button", {
      class: `btn ${btnClass} btn-sm ms-2`,
      textContent: text,
    });
    if (onClick) btn.addEventListener("click", onClick);
    return btn;
  },

  // Method to create a primary button
  createPrimaryButton(text, onClick) {
    return this._createButtonElement("btn-primary", text, onClick);
  },

  // Method to create a secondary button
  createSecondaryButton(text, onClick) {
    return this._createButtonElement("btn-secondary", text, onClick);
  },

  // Method to create a danger button
  createDangerButton(text, onClick) {
    return this._createButtonElement("btn-danger", text, onClick);
  },

  // Method to create a success button
  createSuccessButton(text, onClick) {
    return this._createButtonElement("btn-success", text, onClick);
  },

  // Method to create a warning button
  createWarningButton(text, onClick) {
    return this._createButtonElement("btn-warning", text, onClick);
  },

  // Method to create an info button
  createInfoButton(text, onClick) {
    return this._createButtonElement("btn-info", text, onClick);
  },

  // Method to create an external link
  createExternalLink(text, url) {
    return this.createElement("a", {
      class: "btn btn-secondary btn-sm ms-2 external-link",
      href: url,
      textContent: text,
      target: "_blank",
    });
  },
  /**
   * Applies options to the given element.
   *
   * @param {HTMLElement} el - The element to apply options to.
   * @param {Object} options - The options to apply to the element.
   */
  applyOptionsToElement: (el, options) => {
    Object.entries(options).forEach(([key, value]) => {
      if (key === "children") {
        value.forEach((child) => el.appendChild(child));
      } else if (key.startsWith("data-")) {
        el.setAttribute(key, value);
      } else if (key === "style") {
        Object.assign(el.style, value);
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (["id", "className", "textContent"].includes(key)) {
        el[key] = value; // Only allow specific safe properties
      }
    });
  },

  /**
   * Gets the element(s) matching the selector.
   *
   * @param {string} selector - The CSS selector of the element(s) to get.
   * @param {Object} [options={}] - Optional parameters to apply to the element(s).
   * @param {HTMLElement} [options.context] - Optional context element to search within.
   * @returns {HTMLElement|NodeList} The found element(s) or throws an error if none found.
   */
  getElement: (selector, options = {}) => {
    if (typeof selector !== "string") {
      console.error("Invalid selector type:", selector);
      throw new Error(
        `Selector must be a string, got ${typeof selector} (${selector})`
      );
    }
    let elements;
    if (options.context && options.context instanceof HTMLElement) {
      elements = options.context.querySelectorAll(selector);
    } else {
      elements = document.querySelectorAll(selector);
    }
    if (elements.length === 0) {
      throw new Error(`Missing element(s): ${selector}`);
    }
    elements.forEach((el) => ApiClient.applyOptionsToElement(el, options));
    return elements.length === 1 ? elements[0] : elements;
  },

  /**
   * Shows element(s) by setting display to "block".
   * @param {string} selector - The CSS selector of the element(s) to show.
   * @param {Object} [options={}] - Optional parameters to apply to the element(s).
   * @returns {Promise<HTMLElement|NodeList>} The shown element(s).
   */
  showElement: async (selector, options = {}) => {
    const elements = ApiClient.getElement(selector, options);
    const elementArray =
      elements instanceof NodeList ? Array.from(elements) : [elements];
    elementArray.forEach((el) => (el.style.display = "block"));
    return elements; // Return original format
  },

  /**
   * Hides element(s) by setting display to "none".
   * @param {string} selector - The CSS selector of the element(s) to hide.
   * @param {Object} [options={}] - Optional parameters to apply to the element(s).
   * @returns {Promise<HTMLElement|NodeList>} The hidden element(s).
   */
  hideElement: async (selector, options = {}) => {
    const elements = ApiClient.getElement(selector, options);
    const elementArray =
      elements instanceof NodeList ? Array.from(elements) : [elements];
    elementArray.forEach((el) => (el.style.display = "none"));
    return elements;
  },

  /**
   * Toggles the visibility of element(s).
   * @param {string} selector - The CSS selector of the element(s) to toggle.
   * @param {Object} [options={}] - Optional parameters to apply to the element(s).
   * @returns {Promise<HTMLElement|NodeList>} The toggled element(s).
   */
  toggleVisibility: async (selector, options = {}) => {
    const elements = ApiClient.getElement(selector, options);
    const elementArray =
      elements instanceof NodeList ? Array.from(elements) : [elements];
    elementArray.forEach((el) => {
      el.style.display = el.style.display === "none" ? "block" : "none";
    });
    return elements;
  },

  /**
   * Toggles the max-width of element(s) between a specified value and their default state.
   * @param {string} selector - CSS selector of target element(s)
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.maxWidth="100%"] - Maximum width when expanded
   * @returns {HTMLElement|NodeList} The modified element(s)
   */
  toggleMaxWidth: (selector, options = { maxWidth: "100%" }) => {
    const elements = ApiClient.getElement(selector); // Throws if no elements found

    // Normalize elements to an array for consistent handling
    const elementArray =
      elements instanceof NodeList ? Array.from(elements) : [elements];

    elementArray.forEach((element) => {
      const currentWidth = element.style.maxWidth;
      const targetWidth = options.maxWidth || "100%"; // Use provided value or default

      // Toggle: if current maxWidth matches target, reset it; otherwise, apply target
      element.style.maxWidth = currentWidth === targetWidth ? "" : targetWidth;

      // Apply additional options, ensuring maxWidth isn't overridden
      const optionsWithoutMaxWidth = { ...options };
      delete optionsWithoutMaxWidth.maxWidth;
      ApiClient.applyOptionsToElement(element, optionsWithoutMaxWidth);
    });

    // Return original elements in the same format as received
    return elements;
  },

  /**
   * Applies scrollable styles to a container.
   *
   * This function modifies the container's CSS styles to allow both horizontal and vertical scrolling
   * when the content overflows. It sets a maximum height to the container and prevents text wrapping
   * for wide content such as spreadsheets.
   *
   * @param {HTMLElement} container - The container element to apply the scrollable styles to.
   *
   * Example usage:
   * ```javascript
   * const containerElement = document.querySelector('.scrollable-container');
   * ApiClient.makeScrollable(containerElement);
   * ```
   */
  makeScrollable: (container) => {
    Object.assign(container.style, {
      overflowX: "auto", // Horizontal scroll when content overflows
      overflowY: "auto", // Vertical scroll when content overflows
      maxHeight: "80vh", // Limit height to trigger vertical scroll if needed
      whiteSpace: "nowrap", // Prevent wrapping for wide content (e.g., spreadsheets)
    });
  },
};
export default ApiClient;
