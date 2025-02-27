"use strict";

/**
 * File Path Utilities
 *
 * A collection of utility functions for handling and manipulating file paths.
 *
 * @type {{
 *   normalize: (path: string) => string;
 *   normalizeLeadingSlash: (path: string) => string;
 *   ensureLeadingSlash: (path: string) => string;
 *   join: (...parts: string[]) => string;
 *   isRoot: (path: string) => boolean;
 *   getFileExtension: (filePath: string) => string;
 * }}
 */
export const FilePathUtils = {
  /**
   * Removes leading slashes from a file path.
   *
   * @param {string} path - The file path to normalize.
   * @returns {string} - The normalized file path without leading slashes.
   */
  normalize: (path) => path.replace(/^\/+/, ""),

  /**
   * Removes the leading slash from a file path if it exists.
   *
   * @param {string} path - The file path to normalize.
   * @returns {string} - The file path without a leading slash.
   */
  normalizeLeadingSlash: (path) =>
    path.startsWith("/") ? path.substring(1) : path,

  /**
   * Ensures that a file path starts with a leading slash.
   *
   * @param {string} path - The file path to modify.
   * @returns {string} - The file path with a leading slash.
   */
  ensureLeadingSlash: (path) => (path.startsWith("/") ? path : `/${path}`),

  /**
   * Joins multiple file path parts into a single path.
   *
   * @param {...string} parts - The parts of the path to join.
   * @returns {string} - The joined file path.
   */
  join: (...parts) => parts.map((p) => p.replace(/^\/|\/$/g, "")).join("/"),

  /**
   * Checks if a file path represents the root directory.
   *
   * @param {string} path - The file path to check.
   * @returns {boolean} - True if the path is the root directory, otherwise false.
   */
  isRoot: (path) => path === "." || path === "",

  /**
   * Retrieves the file extension from a file path.
   *
   * @param {string} filePath - The file path to inspect.
   * @returns {string} - The file extension in lowercase.
   */
  getFileExtension: (filePath) => filePath.split(".").pop().toLowerCase(),
};

export default FilePathUtils;
