(function() {
  listenForCommands();

  class Overlay {
    constructor(bootstrapElements) {
      this.elementMap = createElementMap(bootstrapElements);
      this.rootElement = createOverlayRoot("grid-overlay");
      this.allIsChecked = false;
    }

    list() {
      let overlayDetails = [];

      for (let [realElem, overlayElem] of this.elementMap) {
        const name = getOverlayName(realElem);
        const hasOverlay = Boolean(overlayElem);
        const isExpanded = hasOverlay ? overlayElem.classList.contains("expanded") : false;

        overlayDetails.push([name, hasOverlay, isExpanded]);
      }
      
      overlayDetails.push(["all", this.allIsChecked]);
      return overlayDetails;
    }

    add(index) {
      let element = this.getRealElement(index);

      this.elementMap.set(element, createOverlayElement(element));
      this.redrawAll();
      element.scrollIntoView();
    }

    expand(index) {
      let element = this.getOverlayElement(index);

      element.classList.add("expanded");
      this.redrawAll();
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

      removeFromDOM(overlayElement);
      this.elementMap.set(element, null);
    }

    getRealElement(index) {
      return Array.from(this.elementMap.keys())[index];
    }

    getOverlayElement(index) {
      return Array.from(this.elementMap.values())[index];
    }

    redrawAll() {
      setTimeout(() => {
        for (let [realElem, overlayElem] of this.elementMap.entries()) {
          if (overlayElem) redrawOverlay(realElem, overlayElem)
        }
      }, 0);
    }
  }

  let bootstrapElements = document.querySelectorAll(
    '[class^="container"], [class^="row"]'
  );
  let overlay = new Overlay(bootstrapElements);

  function removeFromDOM(element) {
    element.parentNode.removeChild(element);
  }

  function getOverlayName(element) {
    const bootstrapRE = /^(row|container|container\-(fluid|sm|md|lg|xl|xxl))$/;
    let name;

    element.classList.forEach(cls => {
      if (bootstrapRE.test(cls)) {
        name = cls;
      }
    });

    return name
  }

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
    window.removeEventListener("resize", overlay.redrawAll);
    window.removeEventListener("scroll", overlay.redrawAll);

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

  function redrawOverlay(realElem, overlayElem) {
    const realElemRect = realElem.getBoundingClientRect();
    const realElemBorderWidth = (realElemRect.width - realElem.clientWidth) / 2;
    const isExpanded = overlayElem.classList.contains("expanded");
    const width = `${realElem.clientWidth}px`;
    const height = isExpanded ? '100vh' : `${realElem.clientHeight}px`;
    const top = isExpanded ? '0px' : `${realElemRect.top + realElemBorderWidth}px`;
    const left = `${realElemRect.left + realElemBorderWidth}px`;

    overlayElem.style.width = width;
    overlayElem.style.height = height;
    overlayElem.style.top = top;
    overlayElem.style.left = left;
  }

  window.addEventListener("resize", function(event) {
    overlay.redrawAll(overlay);
  });
  window.addEventListener("scroll", function(event) {
    overlay.redrawAll(overlay);
  });
  window.addEventListener("unload", () => {
    localStorage.removeItem("bootstrap-grid-overlay");
  });
})();
