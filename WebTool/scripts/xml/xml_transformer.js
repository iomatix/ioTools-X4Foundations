"use strict";

export class XmlTransformer {
  constructor(xslFile) {
    this.xslDoc = null;
    this.xslFile = xslFile;
  }

  async loadXsl() {
    if (!this.xslFile) return null;
    const response = await fetch(this.xslFile);
    const text = await response.text();
    this.xslDoc = new DOMParser().parseFromString(text, "application/xml");
    console.log(`XSL loaded: ${!!this.xslDoc} for ${this.xslFile}`);
    return this.xslDoc;
  }

  async transform(
    xmlDoc,
    expression,
    mode,
    container,
    scriptType = "any",
    sort = false
  ) {
    console.log(
      `Starting transform with mode: ${mode}, expression: ${expression}, scriptType: ${scriptType}, sort: ${sort}`
    );
    if (!xmlDoc || !container) return;

    let resultDoc;
    try {
      if (mode !== "raw" && mode !== "tree" && this.xslDoc) {
        const processor = new XSLTProcessor();
        processor.importStylesheet(this.xslDoc);
        processor.setParameter(null, "expression", expression || "");
        processor.setParameter(null, "scripttype", scriptType);
        processor.setParameter(null, "sort", sort.toString());

        console.log(
          "Input XML:",
          new XMLSerializer().serializeToString(xmlDoc)
        ); // Debug input
        resultDoc = processor.transformToFragment(xmlDoc, document);

        if (!resultDoc) {
          throw new Error("XSLT transformation returned null");
        }

        console.log("Transformed resultDoc type:", resultDoc.nodeType); // Debug output type

        const wrapper = document.createElement("div");
        wrapper.className = "xsl-output";
        wrapper.appendChild(resultDoc);
        resultDoc = wrapper;
      } else if (mode === "raw") {
        resultDoc = document.createDocumentFragment();
        const pre = document.createElement("pre");
        pre.textContent = new XMLSerializer().serializeToString(xmlDoc);
        resultDoc.appendChild(pre);
      } else {
        resultDoc = document.createDocumentFragment(); // Fallback to tree handled by caller
      }
      container.replaceChildren(resultDoc);
      console.log(`Transformed XML in ${mode} mode`);
    } catch (error) {
      console.error(`Transformation failed: ${error.message}`);
      container.innerHTML = `<div class="alert alert-danger">Transformation failed: ${error.message}</div>`;
    }
    return resultDoc;
  }
}
