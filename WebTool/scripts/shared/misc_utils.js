"use strict";

export const MiscUtils = {
  withStatus: async (statusSelector, message, asyncFunc) => {
    let statusEl;
    if (statusSelector) {
      statusEl = document.querySelector(statusSelector);
      if (statusEl) statusEl.textContent = message;
    }
    try {
      const result = await asyncFunc();
      return result;
    } catch (error) {
      if (statusEl) statusEl.textContent = `Error: ${error.message}`;
      throw error; // Re-throw for caller to handle
    } finally {
      if (statusEl && !statusEl.textContent.startsWith("Error"))
        statusEl.textContent = "";
    }
  },
};

export default MiscUtils;
