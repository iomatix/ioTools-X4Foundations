"use strict";

export function nodeMatchesExpression(node, expression) {
  if (!expression) return true;
  const parts = expression.split(".");
  let currentNode = node;
  for (const part of parts) {
    try {
      const regex = new RegExp(part, "i");
      const name = currentNode.getAttribute("name") || currentNode.nodeName;
      if (!regex.test(name) && !regex.test(currentNode.textContent))
        return false;
      currentNode = Array.from(currentNode.children).find((child) =>
        regex.test(child.getAttribute("name") || child.nodeName)
      );
      if (!currentNode && part !== parts[parts.length - 1]) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function hasMatchingDescendant(node, expression) {
  // Check if node is an Element (nodeType === 1) before calling querySelectorAll
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  return Array.from(node.querySelectorAll("*")).some((descendant) =>
    nodeMatchesExpression(descendant, expression)
  );
}

export default { nodeMatchesExpression, hasMatchingDescendant };
