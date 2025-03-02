"use strict";

import { nodeMatchesExpression } from "./xml_filter_utils.js";

export class GenericXMLFilteringStrategy {
  async process(xmlDoc, expression) {
    const filteredDoc = xmlDoc.cloneNode(true);
    const nodes = filteredDoc.getElementsByTagName("*");
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (!nodeMatchesExpression(nodes[i], expression)) {
        nodes[i].parentNode.removeChild(nodes[i]);
      }
    }
    return filteredDoc;
  }
}
