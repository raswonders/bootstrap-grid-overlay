(function() {
  let bootstrapRE = /^(row|container|container\-(fluid|sm|md|lg|xl|xxl))$/;

  // allow script to be detected from extension by replying "ping" msgs
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // if (request.message === "ping") {
    //   sendResponse({ message: "pong" });
    // }
    switch (request.message) {
      case "ping":
        sendResponse({ message: "pong" });
        break;
      case "list":
        sendResponse(overlay.list());
        break;
      case "add":
        overlay.add(+request.index);
        break;
    }
    return true;
  });

  /* On/Off switch */
  // if (localStorage.getItem("bootstrap-grid-overlay")) {
  //   cleanUp();
  //   return;
  // } else {
  //   localStorage.setItem("bootstrap-grid-overlay", "1");
  // }

  class Overlay {
    constructor(bootstrapElements) {
      // Create map of bootstrap and overlay DOM elements
      this.elementsMap = new Map();
      bootstrapElements.forEach(elem => {
        this.elementsMap.set(elem, null);
      });

      // Append overlay root element to DOM, if it's not already
      let overlayRoot = document.querySelector("#grid-overlay");
      if (!overlayRoot) {
        overlayRoot = document.createElement("div");
        overlayRoot.id = "grid-overlay";
        overlayRoot = document.body.appendChild(overlayRoot);
      }
      overlayRoot.innerHTML = "";
      this.overlayRoot = overlayRoot;
    }

    list() {
      // Return info about element and whether its overlay is being shown
      let mirror = [];
      for (let [realElem, overlayElem] of this.elementsMap) {
        let name = "unknown";
        realElem.classList.forEach(cls => {
          if (bootstrapRE.test(cls)) {
            name = cls;
          }
        });
        mirror.push([name, Boolean(overlayElem)]);
      }
      return mirror;
    }

    add(index) {
      let element = this.getRealElement(index);
      this.elementsMap.set(element, createOverlayElement(element));
      this.updateOverlays();
    }

    getRealElement(index) {
      return Array.from(this.elementsMap.keys())[index];
    }

    updateOverlays(overlay) {
      let updateOverlayTimeout = 0;
      /* resets timeout of scheduled update */
      clearTimeout(updateOverlayTimeout);
      updateOverlayTimeout = setTimeout(() => {
        for (let [realElem, overlayElem] of this.elementsMap.entries()) {
          if (realElem && overlayElem) {
            positionOverlayElement(realElem, overlayElem);
          }
        }
      }, 0);
    }
  }

  let bootstrapElements = document.querySelectorAll(
    '[class^="container"], [class^="row"]'
  );
  let overlay = new Overlay(bootstrapElements);

  overlay.add(1);
  overlay.add(2);
  overlay.add(3);
  overlay.add(4);
  overlay.add(5);

  /* Detects all bootstrap5 container and row elements */
  let containers = document.body.querySelectorAll('[class^="container"]');
  let rows = document.body.querySelectorAll(".row");

  function createOverlayElement(element) {
    if (element.classList.contains("row")) {
      return createRowOverlay(element);
    } else {
      return createContainerOverlay(element);
    }
  }

  // /* Inits row:grid Map() for all rows which has been detected */
  // let visibleOverlays = new Map();
  // containers.forEach(el => {
  //   visibleOverlays.set(el, createContainerOverlay(el));
  // });
  // rows.forEach(el => {
  //   visibleOverlays.set(el, createRowOverlay(el));
  // });

  function cleanUp() {
    /* remove grid element from DOM */
    let overlayEl = document.querySelector("#grid-overlay");
    if (overlayEl) {
      overlayEl.parentNode.removeChild(overlayEl);
    }

    /* remove event listeners from DOM */
    window.removeEventListener("resize", overlay.updateOverlays);
    window.removeEventListener("scroll", overlay.updateOverlays);

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

  // /* Updates position of all overlays on page */
  // function updateOverlays(overlay) {
  //   let updateOverlayTimeout = 0;
  //   /* resets timeout of scheduled update */
  //   clearTimeout(updateOverlayTimeout);
  //   updateOverlayTimeout = setTimeout(() => {
  //     for (let [realElem, overlayElem] of overlay.elementsMap.entries()) {
  //       if (realElem && overlayElem)
  //         positionOverlayElement(realElem, overlayElem);
  //     }
  //   }, 0);
  // }

  window.addEventListener("resize", function(event) {
    overlay.updateOverlays(overlay);
  });
  window.addEventListener("scroll", function(event) {
    overlay.updateOverlays(overlay);
  });
  window.addEventListener("unload", () => {
    localStorage.removeItem("bootstrap-grid-overlay");
  });
})();
