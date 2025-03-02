"use strict";

import { SharedLibs } from "../shared/shared_libs.js";
import { nodeMatchesExpression } from "./xml_filter_utils.js";

const apiClient = SharedLibs.ApiClient;
const consoleUtils = SharedLibs.ConsoleUtils;

export class TreeRenderer {
  constructor(container) {
    if (!container) throw new Error("Container is required for TreeRenderer");
    this.container = container;
  }

  /**
   * Checks if a node has any descendants that match the expression.
   * @param {Node} node - The XML node to check.
   * @param {string} expression - The filter expression.
   * @returns {boolean} True if a descendant matches the expression.
   */
  hasMatchingDescendant(node, expression) {
    if (!node || !node.children) return false;
    consoleUtils.logDebug(
      `Checking descendants of ${node.nodeName} for expression: ${expression}`
    );
    return Array.from(node.children).some((child) => {
      if (nodeMatchesExpression(child, expression)) {
        consoleUtils.logDebug(`Descendant match: ${child.nodeName}`);
        return true;
      }
      return this.hasMatchingDescendant(child, expression);
    });
  }

  /**
   * Creates a DOM tree node with collapsible behavior and tooltips.
   * @param {Node} node - The XML node to render.
   * @param {string} expression - The filter expression.
   * @returns {HTMLElement} The DOM element (always returns a node, filters visibility).
   */
  createTreeNode(node, expression = "") {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      consoleUtils.logDebug(
        `Skipping invalid node: ${node ? node.nodeName : "null"}`
      );
      return null;
    }

    consoleUtils.logDebug(`Rendering node: ${node.nodeName}`);

    const li = apiClient.createElement("li");
    const span = apiClient.createElement("span", { classList: "tree-node" });

    // Build attributes display
    const attributesList = Array.from(node.attributes).map((attr) =>
      attr.name === "name"
        ? `\n🔹${attr.name}: ${attr.value}`
        : `\n🔸${attr.name}: ${attr.value}`
    );
    const attrDisplay = attributesList.length
      ? ` <span class="tree-attributes">(${attributesList.join(", ")})</span>`
      : "";

    // Build text content display
    const textDisplay =
      node.textContent.trim() && !node.children.length
        ? `: <span class="tree-value">${node.textContent.trim()}</span>`
        : "";

    span.innerHTML = `${node.nodeName}${attrDisplay}${textDisplay}`;

    // Add tooltip
    span.setAttribute(
      "data-tooltip",
      (node.parentElement
        ? `💠Parent: ${node.parentElement.nodeName}`
        : `🔶Root Node`) +
        `\n🔻Element: ${node.nodeName}` +
        (node.getAttribute("type")
          ? `\n🔷Type: ${node.getAttribute("type")}`
          : "") +
        (node.getAttribute("result")
          ? `\n📜Result: ${node.getAttribute("result")}`
          : "") +
        `\n` +
        (attributesList.length
          ? `Attributes: ${attributesList.join(", ")}`
          : "No attributes")
    );

    // Add expand/collapse icon
    const icon = apiClient.createElement("span", { classList: "tree-icon" });
    icon.textContent = node.children.length ? "▶" : "●";
    span.insertBefore(icon, span.firstChild);

    li.appendChild(span);

    // Filter visibility, not existence
    const matches = nodeMatchesExpression(node, expression);
    const hasMatchingDescendantNode = this.hasMatchingDescendant(
      node,
      expression
    );
    if (expression && !matches && !hasMatchingDescendantNode) {
      li.style.display = "none";
      consoleUtils.logDebug(
        `Hiding node ${node.nodeName}: no match or descendants`
      );
    }

    // Render children
    if (node.children.length) {
      consoleUtils.logDebug(
        `Processing ${node.children.length} children for ${node.nodeName}`
      );
      const ul = apiClient.createElement("ul", { classList: "collapsed" });
      Array.from(node.children).forEach((child) => {
        const childNode = this.createTreeNode(child, expression);
        if (childNode) {
          ul.appendChild(childNode);
          consoleUtils.logDebug(`Added child: ${child.nodeName}`);
        }
      });
      if (ul.children.length) {
        li.appendChild(ul);
        consoleUtils.logDebug(
          `Attached ${ul.children.length} children to ${node.nodeName}`
        );
      } else {
        consoleUtils.logDebug(`No children rendered for ${node.nodeName}`);
      }
    } else {
      span.classList.add("tree-node-no-children");
    }

    return li;
  }

  /**
   * Renders the XML document as a collapsible tree in the container.
   * @param {Document} xmlDoc - The XML document to render.
   * @param {string} expression - The filter expression.
   */
  renderTree(xmlDoc, expression = "") {
    try {
      if (!xmlDoc || !xmlDoc.documentElement) {
        throw new Error("Invalid or undefined XML document");
      }

      consoleUtils.logDebug(
        `Rendering tree for document with root: ${xmlDoc.documentElement.nodeName}`
      );

      this.container.innerHTML = "";
      const treeRoot = apiClient.createElement("ul", { classList: "tree" });
      const rootNode = this.createTreeNode(xmlDoc.documentElement, expression);
      if (rootNode) {
        treeRoot.appendChild(rootNode);
        consoleUtils.logDebug("Root node appended to tree");
      } else {
        consoleUtils.logDebug("No root node rendered");
        this.container.innerHTML = "<p>No matching nodes found.</p>";
        return;
      }
      this.container.appendChild(treeRoot);

      // Add event listeners for collapsing and tooltips
      const nodes = this.container.querySelectorAll(".tree-node");
      consoleUtils.logDebug(
        `Found ${nodes.length} tree nodes for event listeners`
      );
      nodes.forEach((node) => {
        node.addEventListener("click", (e) => {
          e.stopPropagation();
          const ul = node.parentElement.querySelector("ul");
          if (ul) {
            ul.classList.toggle("collapsed");
            const icon = node.querySelector(".tree-icon");
            if (icon) {
              icon.textContent = ul.classList.contains("collapsed") ? "▶" : "▼";
              consoleUtils.logDebug(
                `Toggled ${node.textContent.trim()} to ${
                  ul.classList.contains("collapsed") ? "collapsed" : "expanded"
                }`
              );
            }
          }
        });

        node.addEventListener("mouseover", (e) => {
          const tooltip = document.querySelector(".tree-tooltip");
          if (tooltip && node.dataset.tooltip) {
            tooltip.textContent = node.dataset.tooltip;
            tooltip.style.display = "block";
            tooltip.style.left = `${e.clientX + 10}px`;
            tooltip.style.top = `${e.clientY + 10}px`;
          }
        });

        node.addEventListener("mouseout", () => {
          const tooltip = document.querySelector(".tree-tooltip");
          if (tooltip) tooltip.style.display = "none";
        });

        node.addEventListener("mousemove", (e) => {
          const tooltip = document.querySelector(".tree-tooltip");
          if (tooltip) {
            tooltip.style.left = `${Math.min(
              e.clientX + 10,
              window.innerWidth - tooltip.offsetWidth - 10
            )}px`;
            tooltip.style.top = `${Math.min(
              e.clientY + 10,
              window.innerHeight - tooltip.offsetHeight - 10
            )}px`;
          }
        });
      });
    } catch (error) {
      consoleUtils.logError(`Error rendering tree: ${error.message}`);
      this.container.innerHTML = `<p class="alert alert-danger">Error rendering tree: ${error.message}</p>`;
    }
  }
}
