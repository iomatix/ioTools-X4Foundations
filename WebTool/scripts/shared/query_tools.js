"use strict";

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
  
  export default QueryTools;
