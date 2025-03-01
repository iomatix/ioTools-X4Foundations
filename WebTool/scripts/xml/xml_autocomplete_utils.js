"use strict";

export function searchPaths(node, parts, prefix) {
  if (!parts.length) {
    return Object.keys(node.children).length > 0 ? [prefix + "."] : [prefix];
  }

  const segment = parts[0].toLowerCase();
  let suggestions = [];
  for (const key in node.children) {
    if (key.toLowerCase().startsWith(segment)) {
      const child = node.children[key];
      suggestions = suggestions.concat(
        parts.length === 1 && Object.keys(child.children).length > 0
          ? [prefix + key + "."]
          : searchPaths(child, parts.slice(1), prefix + key + ".")
      );
    }
  }
  return suggestions;
}

export function handlePropertyLookup(term, propertyTree, globalKeywords) {
  const parts = term.split(".").filter(Boolean);
  return parts.length > 0 && propertyTree.children[parts[0]]
    ? searchPaths(propertyTree, parts, "")
    : globalKeywords.filter((k) => k.toLowerCase().startsWith(parts[0]));
}

export function handleKeywordLookup(term, globalKeywords) {
  return globalKeywords.filter((k) => k.toLowerCase().startsWith(term));
}

export default { searchPaths, handlePropertyLookup, handleKeywordLookup };
