/* Loaded on every page from _layouts/default.html. */
(function () {
  var scrollBtn = document.getElementById("scrollToTopBtn");
  if (!scrollBtn) return;

  function toggleButton() {
    if (window.scrollY > 200) {
      scrollBtn.classList.add("is-visible");
    } else {
      scrollBtn.classList.remove("is-visible");
    }
  }

  window.addEventListener("scroll", toggleButton, { passive: true });
  scrollBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  toggleButton();
})();

(function () {
  var lightbox = document.getElementById("imageLightbox");
  var lightboxImg = document.getElementById("imageLightboxImg");
  var lightboxCaption = document.getElementById("imageLightboxCaption");
  var lightboxClose = document.getElementById("imageLightboxClose");
  if (!lightbox || !lightboxImg || !lightboxCaption || !lightboxClose) return;

  var clickableImages = Array.prototype.slice.call(document.querySelectorAll("article img"));
  if (!clickableImages.length) return;

  var scrollTop = 0;

  function openLightbox(img) {
    var source = img.getAttribute("data-full-src") || img.currentSrc || img.src;
    var caption = img.getAttribute("alt") || "";

    lightboxImg.src = source;
    lightboxImg.alt = caption;

    if (caption) {
      lightboxCaption.textContent = caption;
      lightboxCaption.hidden = false;
    } else {
      lightboxCaption.textContent = "";
      lightboxCaption.hidden = true;
    }

    scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("lightbox-open");
    document.body.style.top = "-" + scrollTop + "px";
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    if (lightbox.hidden) return;

    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = "";
    document.body.classList.remove("lightbox-open");
    document.body.style.top = "";
    window.scrollTo(0, scrollTop);
  }

  clickableImages.forEach(function (img) {
    img.classList.add("lightbox-enabled-image");
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", (img.getAttribute("alt") || "Image") + " - expand");

    img.addEventListener("click", function () {
      openLightbox(img);
    });

    img.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(img);
      }
    });
  });

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox || event.target.hasAttribute("data-lightbox-close")) {
      closeLightbox();
    }
  });

  lightboxClose.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });
})();
