"use strict";

/**
 * A collection of utility functions for manipulating and interacting with URL query parameters and HTML content.
 */
export const QueryTools = {
  /**
   * Retrieves a query parameter value from the URL.
   *
   * @param {string} name - The name of the parameter to retrieve.
   * @param {boolean} [decode=true] - Whether to decode the parameter value.
   * @returns {string|null} The value of the query parameter, or null if not found.
   */
  getParam: (name, decode = true) => {
    const value = decode
      ? QueryTools.decodeUrl(
          new URLSearchParams(window.location.search).get(name)
        )
      : new URLSearchParams(window.location.search).get(name);

    return value ? value.replace(/^=+/, "") : null; // Trim leading `=` characters
  },
  /**
   * Sets a query parameter and updates the browser URL.
   * @param {string} name - The parameter name.
   * @param {string} value - The parameter value.
   */
  setParam: (name, value, encode = true) => {
    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);
    const encodedValue = encode ? encodeURIComponent(value) : value;
    params.set(name, encodedValue);
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
  /**
   * Decodes a URL-encoded string.
   *
   * @param {string} url - The URL-encoded string to decode.
   * @returns {string} The decoded URL.
   */
  decodeUrl: (url) => {
    return decodeURIComponent(url);
  },
  /**
   * Retrieves all query parameters from the URL as an object.
   *
   * @returns {Object} An object containing key-value pairs of query parameters.
   */
  getAllParams: () => {
    Object.fromEntries(new URLSearchParams(window.location.search));
  },

  /**
   * Fetches data from the given endpoint with query parameters.
   *
   * @param {string} endpoint - The endpoint URL to fetch data from.
   * @param {Object} params - An object containing query parameter key-value pairs.
   * @returns {Promise<Object>} A promise that resolves to the response JSON data.
   * @throws {Error} If the fetch operation fails.
   */
  fetchWithParams: async (endpoint, params) => {
    const query = QueryTools.buildQuery(params);
    const response = await fetch(`${endpoint}?${query}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json(); // Assuming the response is JSON
  },

  /**
   * Escapes HTML special characters in a given text string.
   *
   * @param {string} text - The text string to be escaped.
   * @returns {string} - The escaped text string with HTML special characters replaced by their corresponding entities.
   */
  escapeHtml: (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
};

export default QueryTools;
