"use strict";

import { IPropertyFilteringStrategy } from "./i_property_filtering_strategy.js";
import {
  nodeMatchesExpression,
  hasMatchingDescendant,
} from "./xml_filter_utils.js";

export class GenericXMLFilteringStrategy extends IPropertyFilteringStrategy {
  async process(xmlDoc, expression, scriptType = "any") {
    const filteredDoc = document.implementation.createDocument(
      "",
      "root",
      null
    );
    const root = filteredDoc.documentElement;

    function filterNode(node) {
      const matches = nodeMatchesExpression(node, expression);
      const hasMatchingDescendantNode = hasMatchingDescendant(node, expression);
      if (matches || hasMatchingDescendantNode) {
        const clone = filteredDoc.importNode(node, false);
        Array.from(node.childNodes).forEach((child) => {
          const childClone = filterNode(child);
          if (childClone) clone.appendChild(childClone);
        });
        return clone;
      }
      return null;
    }

    const filteredRoot = filterNode(xmlDoc.documentElement);
    if (filteredRoot) root.appendChild(filteredRoot);
    return filteredDoc;
  }
}

export default { GenericXMLFilteringStrategy };
