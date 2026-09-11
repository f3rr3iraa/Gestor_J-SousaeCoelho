// === Modal de imagem ===
document.addEventListener("click", (e) => {
  const img = e.target.closest("img");
  if (!img || !img.src || !img.closest("table")) return;

  const modalImg = document.getElementById("modalImgView");
  const modalEl = document.getElementById("modalImg");
  if (!modalImg || !modalEl) return; // esta página não tem o modal de imagem

  modalImg.src = img.src;
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
});