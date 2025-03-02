"use strict";

import { SharedLibs } from "../shared/shared_libs.js";
import { IPropertyFilteringStrategy } from "./i_property_filtering_strategy.js";
import { nodeMatchesExpression } from "./xml_filter_utils.js";

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

    const parts = (expression || "").split(".").filter(Boolean);
    const isPropertySearch = expression?.startsWith(".");
    const isDatatypeSearch = expression?.startsWith("$");

    if (!expression || !parts.length) {
      const keywords = xmlDoc.getElementsByTagName("keyword");
      const datatypes = xmlDoc.getElementsByTagName("datatype");
      Array.from(keywords).forEach((node) => {
        const nodeScript = node.getAttribute("script") || "any";
        if (
          scriptType === "any" ||
          nodeScript === "any" ||
          nodeScript === scriptType
        ) {
          root.appendChild(filteredDoc.importNode(node, true));
        }
      });
      Array.from(datatypes).forEach((node) => {
        if (
          !(
            node.getAttribute("pseudo") === "true" ||
            node.getAttribute("pseudo") === "1"
          )
        ) {
          root.appendChild(filteredDoc.importNode(node, true));
        }
      });
    } else if (isPropertySearch) {
      const propRegex = new RegExp(parts[0], "i");
      const allNodes = [
        ...xmlDoc.getElementsByTagName("keyword"),
        ...xmlDoc.getElementsByTagName("datatype"),
      ];
      for (const node of allNodes) {
        const nodeScript = node.getAttribute("script") || "any";
        if (
          scriptType !== "any" &&
          nodeScript !== "any" &&
          nodeScript !== scriptType
        )
          continue;

        const properties = node.getElementsByTagName("property");
        const matchingProps = Array.from(properties).filter((prop) =>
          propRegex.test(prop.getAttribute("name") || "")
        );
        if (matchingProps.length) {
          const clone = filteredDoc.importNode(node, false);
          matchingProps.forEach((prop) =>
            clone.appendChild(filteredDoc.importNode(prop, true))
          );
          root.appendChild(clone);
        }
      }
    } else {
      const baseTerm = isDatatypeSearch ? parts[0].substring(1) : parts[0];
      const baseRegex = new RegExp(baseTerm, "i");

      let matchingNodes = [];
      if (isDatatypeSearch) {
        matchingNodes = Array.from(
          xmlDoc.getElementsByTagName("datatype")
        ).filter(
          (node) =>
            baseRegex.test(node.getAttribute("name") || "") &&
            !(
              node.getAttribute("pseudo") === "true" ||
              node.getAttribute("pseudo") === "1"
            )
        );
      } else {
        matchingNodes = Array.from(
          xmlDoc.getElementsByTagName("keyword")
        ).filter((node) => {
          const nodeScript = node.getAttribute("script") || "any";
          return (
            baseRegex.test(node.getAttribute("name") || "") &&
            (scriptType === "any" ||
              nodeScript === "any" ||
              nodeScript === scriptType)
          );
        });
      }

      for (const node of matchingNodes) {
        const clone = filteredDoc.importNode(node, false);
        let currentProps = Array.from(node.getElementsByTagName("property"));

        if (parts.length > 1) {
          for (let i = 1; i < parts.length; i++) {
            const partRegex = new RegExp(parts[i], "i");
            currentProps = currentProps.filter((prop) =>
              partRegex.test(prop.getAttribute("name") || "")
            );
            if (i === parts.length - 1) {
              currentProps.forEach((prop) =>
                clone.appendChild(filteredDoc.importNode(prop, true))
              );
            }
          }
          if (currentProps.length) root.appendChild(clone);
        } else {
          currentProps.forEach((prop) =>
            clone.appendChild(filteredDoc.importNode(prop, true))
          );
          root.appendChild(clone);
        }
      }
    }

    if (!root.childNodes.length) {
      const noMatch = filteredDoc.createElement("no-match");
      noMatch.textContent = `No matching properties or keywords found for "${expression}".`;
      root.appendChild(noMatch);
    }

    return filteredDoc;
  }
}

export default { ScriptPropertiesStrategy };
