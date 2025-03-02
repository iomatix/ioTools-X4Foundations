"use strict";

export function nodeMatchesExpression(node, expression) {
  if (!expression) return true;
  const exprLower = expression.toLowerCase();
  const text = (node.textContent || "").toLowerCase();
  const name = (node.nodeName || "").toLowerCase();
  const attrs = Array.from(node.attributes || [])
    .map((attr) => `${attr.name.toLowerCase()}:${attr.value.toLowerCase()}`)
    .join(" ");
  return (
    text.includes(exprLower) ||
    name.includes(exprLower) ||
    attrs.includes(exprLower)
  );
}
