(function () {
  "use strict";

  if (window.__tcpipSocketDiagramsInitialized) return;
  window.__tcpipSocketDiagramsInitialized = true;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var figures = Array.prototype.slice.call(
    document.querySelectorAll("[data-tcpip-socket-diagram]")
  );

  function sceneList(element) {
    return (element.getAttribute("data-scenes") || "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
  }

  figures.forEach(function (figure) {
    var steps = Array.prototype.slice.call(figure.querySelectorAll("[data-diagram-step]"));
    var sceneElements = Array.prototype.slice.call(figure.querySelectorAll("[data-scenes]"));
    var playButton = figure.querySelector('[data-diagram-action="play"]');
    var restartButton = figure.querySelector('[data-diagram-action="restart"]');
    var expandButton = figure.querySelector('[data-diagram-action="expand"]');
    var caption = figure.querySelector("[data-diagram-caption]");
    var delay = Number(figure.getAttribute("data-delay")) || 2800;
    var activeStep = 0;
    var wantsPlay = !reducedMotion.matches;
    var isVisible = false;
    var timer = null;

    function render() {
      figure.setAttribute("data-active-step", String(activeStep));
      sceneElements.forEach(function (element) {
        element.classList.toggle("is-active", sceneList(element).indexOf(activeStep) !== -1);
      });
      steps.forEach(function (step, index) {
        step.setAttribute("aria-pressed", index === activeStep ? "true" : "false");
      });
      if (caption && steps[activeStep]) {
        caption.innerHTML = steps[activeStep].getAttribute("data-caption") || "";
      }
      if (playButton) {
        playButton.textContent = wantsPlay ? "일시정지" : "재생";
        playButton.setAttribute("aria-pressed", wantsPlay ? "true" : "false");
      }
    }

    function stopTimer() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    }

    function syncTimer() {
      stopTimer();
      if (!wantsPlay || !isVisible || reducedMotion.matches || steps.length < 2) return;
      timer = window.setInterval(function () {
        activeStep = (activeStep + 1) % steps.length;
        render();
      }, delay);
    }

    steps.forEach(function (step, index) {
      step.addEventListener("click", function () {
        activeStep = index;
        render();
        syncTimer();
      });
    });

    if (playButton) {
      playButton.addEventListener("click", function () {
        wantsPlay = !wantsPlay;
        render();
        syncTimer();
      });
    }

    if (restartButton) {
      restartButton.addEventListener("click", function () {
        activeStep = 0;
        wantsPlay = !reducedMotion.matches;
        render();
        syncTimer();
      });
    }

    if (expandButton) {
      expandButton.addEventListener("click", function () {
        var expanded = !figure.classList.contains("is-expanded");
        figures.forEach(function (otherFigure) {
          otherFigure.classList.remove("is-expanded");
          var otherButton = otherFigure.querySelector('[data-diagram-action="expand"]');
          if (otherButton) {
            otherButton.setAttribute("aria-expanded", "false");
            otherButton.textContent = "크게 보기";
          }
        });
        figure.classList.toggle("is-expanded", expanded);
        expandButton.setAttribute("aria-expanded", expanded ? "true" : "false");
        expandButton.textContent = expanded ? "작게 보기" : "크게 보기";
        document.body.classList.toggle("tsd-expanded", expanded);
      });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        isVisible = entries[0].isIntersecting;
        syncTimer();
      }, { threshold: 0.25 }).observe(figure);
    } else {
      isVisible = true;
    }

    figure.classList.add("is-ready");
    render();
    syncTimer();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    figures.forEach(function (figure) {
      figure.classList.remove("is-expanded");
      var button = figure.querySelector('[data-diagram-action="expand"]');
      if (button) {
        button.setAttribute("aria-expanded", "false");
        button.textContent = "크게 보기";
      }
    });
    document.body.classList.remove("tsd-expanded");
  });
})();
