// allow script to be detected from extension by replying "ping" msgs
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "ping") {
    sendResponse({ message: "pong" });
  }
});

(function() {
  /* On/Off switch */
  // if (localStorage.getItem("bootstrap-grid-overlay")) {
  //   cleanUp();
  //   return;
  // } else {
  //   localStorage.setItem("bootstrap-grid-overlay", "1");
  // }

  /* Detects all bootstrap5 container and row elements */
  let containers = document.body.querySelectorAll('[class^="container"]');
  let rows = document.body.querySelectorAll(".row");

  /* Creates overlay div and appends it to page */
  let overlayEl = document.createElement("div");
  overlayEl.id = "grid-overlay";
  document.body.appendChild(overlayEl);

  /* Inits row:grid Map() for all rows which has been detected */
  let visibleOverlays = new Map();
  containers.forEach(el => {
    visibleOverlays.set(el, createContainerOverlay(el));
  });
  rows.forEach(el => {
    visibleOverlays.set(el, createRowOverlay(el));
  });

  function cleanUp() {
    /* remove grid element from DOM */
    let overlayEl = document.querySelector("#grid-overlay");
    if (overlayEl) {
      overlayEl.parentNode.removeChild(overlayEl);
    }

    /* remove event listeners from DOM */
    window.removeEventListener("resize", updateOverlays);
    window.removeEventListener("scroll", updateOverlays);

    /* clear localStorage */
    localStorage.removeItem("bootstrap-grid-overlay");
  }

  /* Creates row overlay */
  function createRowOverlay(rowElem) {
    let allowedClassesRegExp = /\b(gx-[0-5]|gy-[0-5]|row)\b/;
    gridOverlay = document.createElement("div");
    /* Copies classes from real row to overlay */
    rowElem.classList.forEach(cls => {
      if (allowedClassesRegExp.test(cls)) {
        gridOverlay.classList.add(cls);
      }
    });
    gridOverlay.classList.add("grid-overlay-row");
    /* Creates overlay columns */
    for (let i = 1; i <= 12; i++) {
      columnEl = document.createElement("div");
      columnEl.innerHTML = `<div>${i}</div>`;
      columnEl.classList.add("grid-overlay-col");
      columnEl.classList.add("col-1");
      gridOverlay.appendChild(columnEl);
    }
    return document.getElementById("grid-overlay").appendChild(gridOverlay);
  }

  function createContainerOverlay(containerElem) {
    let allowedClassesRegExp = /\b(container|container-(fluid|sm|md|lg|xl|xxl))\b/;
    gridOverlay = document.createElement("div");
    /* Copies classes from real el to overlay */
    containerElem.classList.forEach(cls => {
      if (allowedClassesRegExp.test(cls)) {
        gridOverlay.classList.add(cls);
      }
    });
    gridOverlay.classList.add("grid-overlay-container");
    return document.getElementById("grid-overlay").appendChild(gridOverlay);
  }

  /* Updates position of single overlay */
  function positionOverlayElement(realElem, overlayElem) {
    /* learns position of a real element */
    realElemRect = realElem.getBoundingClientRect();
    realElemBorderWidth = (realElemRect.width - realElem.clientWidth) / 2;

    /* positions overlay element */
    overlayElem.style.left = `${realElemRect.left + realElemBorderWidth}px`;
    overlayElem.style.top = `${realElemRect.top + realElemBorderWidth}px`;
    overlayElem.style.width = `${realElem.clientWidth}px`;
    overlayElem.style.height = `${realElem.clientHeight}px`;
  }

  /* Updates position of all overlays on page */
  let updateOverlayTimeout = 0;
  function updateOverlays() {
    /* resets timeout of scheduled update */
    clearTimeout(updateOverlayTimeout);
    updateOverlayTimeout = setTimeout(() => {
      for (let [realElem, overlayElem] of visibleOverlays.entries()) {
        positionOverlayElement(realElem, overlayElem);
      }
    }, 0);
  }
  updateOverlays();
  window.addEventListener("resize", updateOverlays);
  window.addEventListener("scroll", updateOverlays);
  window.addEventListener("unload", () => {
    localStorage.removeItem("bootstrap-grid-overlay");
  });
})();
