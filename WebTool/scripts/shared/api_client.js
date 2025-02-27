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

    ConsoleUtils.logDebug(`Fetching resource from endpoint: ${endpoint}...`);
    if (statusSelector)
      StatusManager.set(
        statusSelector,
        `Fetching from endpoint: ${endpoint}...`
      );
    try {
      const query = QueryTools.buildQuery(params);
      ConsoleUtils.logDebug(`Query: ${query} for endpoint: ${endpoint}`);
      const response = await fetch(`${endpoint}?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
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
  fetchXML: async (endpoint, options = {}) => {
    const { styleEndpoint, statusSelector = ".default-fetch-status" } = options;

    ConsoleUtils.logDebug(`Fetching from path: ${endpoint}...`);
    if (statusSelector)
      StatusManager.set(
        statusSelector,
        `Fetching XML from path: ${endpoint}...`
      );
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xmlText = await response.text();
      ConsoleUtils.logDebug(`XML from ${endpoint} loaded successfully.`);

      const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");

      if (styleEndpoint) {
        if (window.XSLTProcessor) {
          const xsltResponse = await fetch(styleEndpoint);
          if (!xsltResponse.ok) throw new Error(`HTTP ${xsltResponse.status}`);
          const xsltText = await xsltResponse.text();
          const xsltDoc = new DOMParser().parseFromString(
            xsltText,
            "application/xml"
          );
          const xsltProcessor = new XSLTProcessor();
          if (xsltDoc) xsltProcessor.importStylesheet(xsltDoc);
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
    const {
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
    styles = [],
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
    ApiClient.createElement("a", {
      class: "btn btn-secondary btn-sm ms-2 external-link",
      href: url,
      textContent: text,
      target: "_blank",
    }),

  /**
   * Finds and returns an element based on a given selector and options.
   *
   * @param {string} selector - A CSS selector to query the DOM for.
   * @param {Object} [options={}] - An object containing additional options to style or configure the element.
   * @param {Element} [options.context=document] - The context element to search within.
   * @param {Element[]} [options.children] - An array of child elements to append to the found element.
   * @param {Object} [options.data-*] - An object containing data attributes to set on the element.
   * @param {Object} [options.style] - An object containing CSS styles to apply to the element.
   * @param {function} [options.on*] - A function to add as an event listener for the given event name.
   * @param {Object} [options.*] - Any other key-value pairs will be set directly on the element.
   * @returns {Element} The found element.
   *
   * Example usage:
   * ```js
   * // Find a button with the ID 'submit-btn' and add an onClick handler and some styles
   * const submitButton = await getElement('#submit-btn', {
   *   style: {
   *     backgroundColor: '#4CAF50',
   *     color: 'white',
   *     padding: '10px 20px'
   *   },
   *   onClick: (event) => {
   *     alert('Submit button clicked!');
   *   }
   * });
   *
   * // Append a new child element to the found button
   * const span = document.createElement('span');
   * span.textContent = ' Click Me';
   * await getElement('#submit-btn', { children: [span] });
   * ```
   */
  getElement: async (selector, options = {}) => {
    let el;

    if (options.context) {
      el = options.context.querySelector(selector);
    } else {
      el = document.querySelector(selector);
    }

    // Check if element exists
    Object.entries(options).forEach(([key, value]) => {
      if (
        !el ||
        (!Object.prototype.toString.call(el) === "[Element]" &&
          key.startsWith("data-"))
      ) {
        throw new Error(`Missing element: ${selector}`);
      }

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
  /**
   * Shows an element.
   *
   * @param {string} selector - The CSS selector of the element to show.
   * @param {Object} [options={}] - Optional parameters to apply to the element.
   * @returns {Promise<HTMLElement>} The shown element.
   */
  showElement: async (selector, options = {}) => {
    const el = await ApiClient.getElement(selector, options);
    if (!el) {
      ConsoleUtils.logError(`Element with id ${selector} not found !`);
    } else {
    el.style.display = "block";
    }
    return el;
  },

  /**
   * Hides an element.
   *
   * @param {string} selector - The CSS selector of the element to hide.
   * @param {Object} [options={}] - Optional parameters to apply to the element.
   * @returns {Promise<HTMLElement>} The hidden element.
   */
  hideElement: async (selector, options = {}) => {
    const el = await ApiClient.getElement(selector, options);
    if (!el) {
      ConsoleUtils.logError(`Element with id ${selector} not found !`);
    } else {
      el.style.display = "none";
    }
    return el;
  },
  /**
   * Toggles the visibility of an element.
   *
   * @param {string} selector - The CSS selector of the element to toggle.
   * @param {Object} [options={}] - Optional parameters to apply to the element.
   * @returns {Promise<HTMLElement>} The toggled element.
   */
  toggleVisibility: async (selector, options = {}) => {
    const el = await ApiClient.getElement(selector, options);
    if (!el) {
      throw Error(`Element with id ${selector} not found !`);
    } 
    if (el.style.display === "none") {
      await ApiClient.showElement(selector, options);
    } else {
      await ApiClient.hideElement(selector, options);
    }

    return el;
  },
};
export default ApiClient;
