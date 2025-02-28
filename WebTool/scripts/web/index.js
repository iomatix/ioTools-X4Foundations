document.addEventListener("DOMContentLoaded", () => {
  const goToXMLBrowser = document.getElementById("goToXMLBrowser");
  const goToScriptProperties = document.getElementById("goToScriptProperties");
  const goToJobEditor = document.getElementById("goToJobEditor");

  goToXMLBrowser.addEventListener("click", () => {
    window.location.href = goToXMLBrowser.dataset.href;
  });
  goToScriptProperties.addEventListener("click", () => {
    window.location.href = goToScriptProperties.dataset.href;
  });
  goToJobEditor.addEventListener("click", () => {
    window.location.href = goToJobEditor.dataset.href;
  });
});
