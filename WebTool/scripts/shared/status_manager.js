"use strict";

import ConsoleUtils from "./console_utils.js";
import QueryTools from "./query_tools.js";

export const StatusManager = {
  set: (selectorOrElement, message) => {
    ConsoleUtils.logDebug(`Setting status message: ${message}`);
    let elements;
    if (typeof selectorOrElement === "string") {
      elements = document.querySelectorAll(selectorOrElement);
    } else if (
      selectorOrElement instanceof HTMLElement ||
      selectorOrElement instanceof NodeList
    ) {
      elements =
        selectorOrElement instanceof NodeList
          ? selectorOrElement
          : [selectorOrElement];
    } else {
      ConsoleUtils.logError(
        `Invalid selectorOrElement type: ${typeof selectorOrElement}`
      );
      return;
    }
    elements.forEach((el) => {
      el.textContent = message;
      el.style.display = "block";
    });
  },
  clear: (selectorOrElement) => {
    let elements;
    if (typeof selectorOrElement === "string") {
      elements = document.querySelectorAll(selectorOrElement);
    } else if (
      selectorOrElement instanceof HTMLElement ||
      selectorOrElement instanceof NodeList
    ) {
      elements =
        selectorOrElement instanceof NodeList
          ? selectorOrElement
          : [selectorOrElement];
    } else {
      ConsoleUtils.logError(
        `Invalid selectorOrElement type: ${typeof selectorOrElement}`
      );
      return;
    }
    elements.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
  },
  setFromQueryParam: (paramName, selector) => {
    const message = QueryTools.getParam(paramName);
    if (message) {
      StatusManager.set(selector, message);
    }
  },
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
