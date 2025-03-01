"use strict";

import { SharedLibs } from "../shared/shared_libs.js";
import { IPropertyFilteringStrategy } from "./i_property_filtering_strategy.js";

const consoleUtils = SharedLibs.ConsoleUtils;

export class ScriptPropertiesStrategy extends IPropertyFilteringStrategy {
  async process(xmlDoc, expression, scriptType = "any") {
    consoleUtils.logDebug(
      `Filtering scriptproperties with expression: ${expression}, scriptType: ${scriptType}`
    );

    const filteredDoc = document.implementation.createDocument(
      "",
      "scriptproperties",
      null
    );
    const root = filteredDoc.documentElement;

    const parts = expression.split(".").filter(Boolean);
    const isPropertySearch = expression.startsWith(".");
    const isDatatypeSearch = expression.startsWith("$");

    if (!expression || !parts.length) {
      const allKeywords = Array.from(xmlDoc.getElementsByTagName("keyword"));
      const allDatatypes = Array.from(xmlDoc.getElementsByTagName("datatype"));
      allKeywords.forEach((node) =>
        root.appendChild(filteredDoc.importNode(node, true))
      );
      allDatatypes.forEach((node) =>
        root.appendChild(filteredDoc.importNode(node, true))
      );
    } else if (isPropertySearch) {
      const propRegex = new RegExp(parts[0], "i");
      const allNodes = Array.from(
        xmlDoc.getElementsByTagName("keyword")
      ).concat(Array.from(xmlDoc.getElementsByTagName("datatype")));
      allNodes.forEach((node) => {
        const properties = Array.from(node.getElementsByTagName("property"));
        const matchingProps = properties.filter((prop) =>
          propRegex.test(prop.getAttribute("name") || "")
        );
        if (matchingProps.length) {
          const clone = filteredDoc.importNode(node, false);
          matchingProps.forEach((prop) =>
            clone.appendChild(filteredDoc.importNode(prop, true))
          );
          root.appendChild(clone);
        }
      });
    } else {
      const baseTerm = isDatatypeSearch ? parts[0].substring(1) : parts[0];
      const baseRegex = new RegExp(baseTerm, "i");

      let matchingNodes = [];
      if (isDatatypeSearch) {
        matchingNodes = Array.from(
          xmlDoc.getElementsByTagName("datatype")
        ).filter((node) => {
          const name = node.getAttribute("name") || "";
          return (
            baseRegex.test(name) &&
            !(
              node.getAttribute("pseudo") === "true" ||
              node.getAttribute("pseudo") === "1"
            )
          );
        });
      } else {
        matchingNodes = Array.from(
          xmlDoc.getElementsByTagName("keyword")
        ).filter((node) => {
          const name = node.getAttribute("name") || "";
          return (
            baseRegex.test(name) &&
            (!node.getAttribute("script") ||
              node.getAttribute("script") === "any" ||
              scriptType === "any" ||
              node.getAttribute("script") === scriptType)
          );
        });
      }

      matchingNodes.forEach((node) => {
        const clone = filteredDoc.importNode(node, false);
        let currentNodes = Array.from(node.getElementsByTagName("property"));

        if (parts.length > 1) {
          for (let i = 1; i < parts.length; i++) {
            const partRegex = new RegExp(parts[i], "i");
            currentNodes = currentNodes.filter((prop) =>
              partRegex.test(prop.getAttribute("name") || "")
            );
            if (i === parts.length - 1) {
              currentNodes.forEach((prop) =>
                clone.appendChild(filteredDoc.importNode(prop, true))
              );
            }
          }
          if (currentNodes.length) root.appendChild(clone);
        } else {
          currentNodes.forEach((prop) =>
            clone.appendChild(filteredDoc.importNode(prop, true))
          );
          root.appendChild(clone);
        }
      });
    }

    return filteredDoc;
  }
}

export default { ScriptPropertiesStrategy };
