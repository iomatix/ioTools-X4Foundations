"use strict";

import ConsoleUtils from "./console_utils.js";
import QueryTools from "./query_tools.js";

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
    ConsoleUtils.logDebug(`Setting status message: ${message}`);
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
export default StatusManager;
