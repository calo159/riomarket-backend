// Botón «Reintentar» de la página sin conexión. Va en un archivo aparte porque la CSP no permite scripts en línea.
document.getElementById('reintentar')?.addEventListener('click', function () {
  window.location.reload();
});
