"use strict";

export class IPropertyFilteringStrategy {
  async process(xmlDoc, expression, scriptType = "any") {
    if (!xmlDoc) {
      throw new Error("Invalid XML document provided.");
    }
    const filteredDoc = document.implementation.createDocument(
      "",
      "root",
      null
    );
    if (!expression) {
      const allNodes = Array.from(xmlDoc.documentElement.childNodes);
      allNodes.forEach((node) =>
        filteredDoc.documentElement.appendChild(
          filteredDoc.importNode(node, true)
        )
      );
    }
    return filteredDoc;
  }
}

export default { IPropertyFilteringStrategy };
