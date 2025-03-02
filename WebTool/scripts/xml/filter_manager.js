"use strict";

import { GenericXMLFilteringStrategy } from "./generic_filtering_strategy.js";
import { ScriptPropertiesStrategy } from "./script_properties_strategy.js";

export class FilterManager {
  getStrategy(xmlDoc) {
    if (!xmlDoc) return new GenericXMLFilteringStrategy();
    return xmlDoc.documentElement.nodeName === "scriptproperties"
      ? new ScriptPropertiesStrategy()
      : new GenericXMLFilteringStrategy();
  }

  async applyFilter(xmlDoc, expression, scriptType = "any") {
    const strategy = this.getStrategy(xmlDoc);
    return await strategy.process(xmlDoc, expression, scriptType);
  }
}
