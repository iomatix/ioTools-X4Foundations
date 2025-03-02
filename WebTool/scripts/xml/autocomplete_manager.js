"use strict";

import { handleKeywordLookup } from "./xml_autocomplete_utils.js";

export class AutocompleteManager {
  constructor(inputElement, keywords) {
    if (!inputElement) throw new Error("Input element is required");
    this.inputElement = inputElement;
    this.keywords = keywords || [];
    this.cache = new Map();
  }

  init() {
    try {
      if (!window.jQuery || !jQuery.fn.autocomplete) {
        console.warn(
          "jQuery UI autocomplete not found. Autocomplete disabled."
        );
        return false;
      }

      jQuery(this.inputElement).autocomplete({
        source: (request, response) => {
          try {
            const term = request.term.trim().toLowerCase();
            if (this.cache.has(term)) {
              response(this.cache.get(term));
              return;
            }
            const suggestions = handleKeywordLookup(term, this.keywords);
            this.cache.set(term, suggestions);
            response(suggestions);
          } catch (error) {
            console.error(`Autocomplete source error: ${error.message}`);
            response([]);
          }
        },
        minLength: 0,
        delay: 300,
      });
      return true;
    } catch (error) {
      console.error(`Autocomplete initialization failed: ${error.message}`);
      return false;
    }
  }
}
