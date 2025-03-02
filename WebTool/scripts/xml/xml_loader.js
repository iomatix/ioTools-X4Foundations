"use strict";

import { SharedLibs } from "../shared/shared_libs.js";

const consoleUtils = SharedLibs.ConsoleUtils;

export class XmlLoader {
  constructor() {
    this.xmlDoc = null;
  }

  async loadXML(fileUrl, chunkSize = 1024 * 1024) {
    // Default 1MB chunks
    consoleUtils.logDebug(`Loading XML from ${fileUrl} with chunking...`);
    try {
      // Initial fetch to get file size
      const headResponse = await fetch(fileUrl, { method: "HEAD" });
      if (!headResponse.ok) {
        throw new Error(
          `HEAD request failed: ${headResponse.status} ${headResponse.statusText}`
        );
      }
      const contentLength = headResponse.headers.get("Content-Length");
      const totalSize = contentLength ? parseInt(contentLength, 10) : null;

      if (!totalSize || totalSize <= chunkSize) {
        // Load fully if small or no size info
        consoleUtils.logDebug(
          `File size (${totalSize || "unknown"}) <= ${chunkSize}, loading fully`
        );
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(
            `HTTP error ${response.status}: ${response.statusText}`
          );
        }
        const xmlText = await response.text();
        const parser = new DOMParser();
        this.xmlDoc = parser.parseFromString(xmlText, "application/xml");
      } else {
        // Chunked loading
        consoleUtils.logDebug(
          `File size ${totalSize} > ${chunkSize}, using chunked loading`
        );
        let offset = 0;
        let fullText = "";
        while (offset < totalSize) {
          const end = Math.min(offset + chunkSize - 1, totalSize - 1);
          const response = await fetch(fileUrl, {
            headers: { Range: `bytes=${offset}-${end}` },
          });
          if (!response.ok) {
            throw new Error(
              `Chunk fetch failed at ${offset}-${end}: ${response.status}`
            );
          }
          const chunkText = await response.text();
          fullText += chunkText;
          offset = end + 1;
          consoleUtils.logDebug(`Processed chunk ${offset}/${totalSize}`);
        }
        const parser = new DOMParser();
        this.xmlDoc = parser.parseFromString(fullText, "application/xml");
      }

      if (this.xmlDoc.querySelector("parsererror")) {
        throw new Error("XML parsing error detected");
      }
      consoleUtils.logDebug(`XML loaded successfully from ${fileUrl}`);
      return this.xmlDoc;
    } catch (error) {
      consoleUtils.logError(`XML loading failed: ${error.message}`);
      this.xmlDoc = document.implementation.createDocument("", "error", null);
      const errorEl = this.xmlDoc.createElement("message");
      errorEl.textContent = `Failed to load XML: ${error.message}`;
      this.xmlDoc.documentElement.appendChild(errorEl);
      return this.xmlDoc;
    }
  }

  getXmlDoc() {
    return this.xmlDoc;
  }
}
