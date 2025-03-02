document.addEventListener("DOMContentLoaded", () => {
  const goToBrowser = document.getElementById("goToBrowser");
  const goToScriptProperties = document.getElementById("goToScriptProperties");
  const goToJobEditor = document.getElementById("goToJobEditor");

  goToBrowser.addEventListener("click", () => {
    window.location.href = goToBrowser.dataset.href;
  });
  goToScriptProperties.addEventListener("click", () => {
    window.location.href = goToScriptProperties.dataset.href;
  });
  goToJobEditor.addEventListener("click", () => {
    window.location.href = goToJobEditor.dataset.href;
  });
});
