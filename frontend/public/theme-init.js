try {
  const guardado = localStorage.getItem('riomarket.tema');
  const oscuro =
    guardado === 'oscuro' ||
    (!guardado && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', oscuro);
} catch (_) {
  /* almacenamiento no disponible */
}
