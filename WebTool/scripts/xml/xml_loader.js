"use strict";

export class XmlLoader {
  constructor() {
    this.xmlDoc = null;
  }

  async loadXML(fileUrl) {
    console.log(`Loading XML from ${fileUrl}...`);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok)
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}`
        );
      const xmlText = await response.text();
      const parser = new DOMParser();
      this.xmlDoc = parser.parseFromString(xmlText, "application/xml");
      if (this.xmlDoc.querySelector("parsererror")) {
        throw new Error("XML parsing error detected");
      }
      return this.xmlDoc;
    } catch (error) {
      console.error(`XML loading failed: ${error.message}`);
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
