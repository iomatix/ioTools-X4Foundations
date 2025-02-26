"use strict";

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

export default FilePathUtils;