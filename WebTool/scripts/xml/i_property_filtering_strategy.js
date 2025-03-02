"use strict";

export class IPropertyFilteringStrategy {
  async process(xmlDoc, expression) {
    throw new Error("Method 'process' must be implemented by subclasses.");
  }
}