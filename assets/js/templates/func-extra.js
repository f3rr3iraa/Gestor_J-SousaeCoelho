// === Modal de imagem ===
document.addEventListener("click", (e) => {
  const img = e.target.closest("img");
  if (img && img.src && img.closest("table")) {
    const modalImg = document.getElementById("modalImgView");
    modalImg.src = img.src;

    const modal = new bootstrap.Modal(document.getElementById("modalImg"));
    modal.show();
  }
});



