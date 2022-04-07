(function() {
  const bootstrapRE = /^(row|container|container\-(fluid|sm|md|lg|xl|xxl))$/;

  listenForCommands();

  class Overlay {
    constructor(bootstrapElements) {
      this.elementMap = createElementMap(bootstrapElements);
      this.rootElement = createOverlayRoot("grid-overlay");
      this.allIsChecked = false;
    }

    list() {
      // Return info about element and whether its overlay is being shown
      let overlayDetails = [];

      for (let [realElem, overlayElem] of this.elementMap) {
        let name = "unknown";
        realElem.classList.forEach(cls => {
          if (bootstrapRE.test(cls)) {
            name = cls;
          }
        });
        if (overlayElem) {
          overlayDetails.push([name, true, overlayElem.classList.contains("expanded")]);
        } else {
          overlayDetails.push([name, false]);
        }
      }
      // "all" checkbox state
      overlayDetails.push(["all", this.allIsChecked]);
      return overlayDetails;
    }

    add(index) {
      let element = this.getRealElement(index);
      this.elementMap.set(element, createOverlayElement(element));
      this.updateOverlays();
      element.scrollIntoView();
    }

    expand(index) {
      let element = this.getOverlayElement(index);
      element.classList.add("expanded");
      this.updateOverlays();
    }

    addAll() {
      overlay.allIsChecked = true;
    }

    removeAll() {
      overlay.allIsChecked = false;
    }

    remove(index) {
      let element = this.getRealElement(index);
      let overlayElement = this.getOverlayElement(index);
      overlayElement.parentNode.removeChild(overlayElement);
      this.elementMap.set(element, null);
      this.updateOverlays();
    }

    getRealElement(index) {
      return Array.from(this.elementMap.keys())[index];
    }

    getOverlayElement(index) {
      return Array.from(this.elementMap.values())[index];
    }

    updateOverlays(updateOverlayTimeout = 0) {
      /* resets timeout of scheduled update */
      clearTimeout(updateOverlayTimeout);
      updateOverlayTimeout = setTimeout(() => {
        for (let [realElem, overlayElem] of this.elementMap.entries()) {
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

  function createElementMap(elements) {
    const map = new Map();
    elements.forEach(elem => {
      map.set(elem, null);
    });

    return map;
  }

  function createOverlayRoot(elementId) {
    let overlayRoot = document.querySelector(`#${elementId}`);

    if (!overlayRoot) {
      overlayRoot = document.createElement("div");
      overlayRoot.id = elementId;
      overlayRoot = document.body.appendChild(overlayRoot);
    }

    overlayRoot.innerHTML = "";
    return overlayRoot;
  }

  function listenForCommands() {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      let response = { success: true };
  
      switch (request.message) {
        case "list":
          response.list = overlay.list();
          break;
        case "add":
          overlay.add(+request.index);
          break;
        case "expand":
          overlay.expand(+request.index);
          break;
        case "remove":
          overlay.remove(+request.index);
          overlay.removeAll();
          break;
        case "addAll":
          overlay.addAll();
          break;
        case "removeAll":
          overlay.removeAll();
          break;
      }
  
      sendResponse(response);
      return true;
    });
  }

  function createOverlayElement(element) {
    if (element.classList.contains("row")) {
      return createRowOverlay(element);
    } else {
      return createContainerOverlay(element);
    }
  }

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
    let allowedClassesRegExp = /\b(no-gutters|gx-[0-5]|g-((sm|md|lg|xl|xxl)-)?[0-5]|row)\b/;
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
    if (overlayElem.classList.contains("expanded")) {
      overlayElem.style.height = `100vh`;
      overlayElem.style.top = `0px`;
    } else {
      overlayElem.style.top = `${realElemRect.top + realElemBorderWidth}px`;
      overlayElem.style.height = `${realElem.clientHeight}px`;
    }
    overlayElem.style.width = `${realElem.clientWidth}px`;
    overlayElem.style.left = `${realElemRect.left + realElemBorderWidth}px`;
  }

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
