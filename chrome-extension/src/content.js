(function() {
  "use strict";

  class Overlay {
    constructor(bootstrapElements) {
      this.elementMap = createElementMap(bootstrapElements);
      this.allIsChecked = false;
    }

    list() {
      let overlayDetails = [];

      for (let [realElem, overlayElem] of this.elementMap) {
        const name = getOverlayName(realElem);
        const hasOverlay = Boolean(overlayElem);
        const isExpanded = hasOverlay
          ? overlayElem.classList.contains("expanded")
          : false;

        overlayDetails.push([name, hasOverlay, isExpanded]);
      }

      overlayDetails.push(["all", this.allIsChecked]);
      return overlayDetails;
    }

    add(index) {
      let element = this.getRealElement(index);
      let overlayElement = createOverlayElement(element);
      
      this.elementMap.set(element, overlayElement);
      this.attachToDOM(overlayElement)
      this.redrawAll();
      element.scrollIntoView();
    }

    attachToDOM(element) {
      if (!this.rootElement) this.rootElement = createOverlayRoot("grid-overlay");
      this.rootElement.appendChild(element);
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
          if (overlayElem) redrawOverlay(realElem, overlayElem);
        }
      }, 0);
    }
  }

  function findBootstrapElements() {
    return document.querySelectorAll('[class^="container"], [class^="row"]');
  }

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

    return name;
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
    chrome.runtime.onMessage.addListener(function(
      request,
      sender,
      sendResponse
    ) {
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

  function copyClasses(sourceElement, destElement, classFilterRE) {
    sourceElement.classList.forEach(cls => {
      if (classFilterRE.test(cls)) destElement.classList.add(cls);
    });
  }

  function createColumns(element) {
    for (let i = 1; i <= 12; i++) {
      element.innerHTML += `
        <div class="grid-overlay-col col-1">
          <div>${i}</div>
        </div>
      `
    }
  }

  function createOverlayElement(element) {
    const isRow = element.classList.contains("row");

    if (isRow) return createRowOverlay(element);
    return createContainerOverlay(element);
  }

  function createRowOverlay(rowElem) {
    const allowedClassRE = /\b(no-gutters|gx-[0-5]|g-((sm|md|lg|xl|xxl)-)?[0-5]|row)\b/;
    const overlayElem = document.createElement("div");

    copyClasses(rowElem, overlayElem, allowedClassRE);
    overlayElem.classList.add("grid-overlay-row");
    createColumns(overlayElem);
    return overlayElem;
  }

  function createContainerOverlay(containerElem) {
    const allowedClassRE = /\b(container|container-(fluid|sm|md|lg|xl|xxl))\b/;
    const overlayElem = document.createElement("div");
    
    copyClasses(containerElem, overlayElem, allowedClassRE);
    overlayElem.classList.add("grid-overlay-container");
    return overlayElem;
  }

  function redrawOverlay(realElem, overlayElem) {
    const realElemRect = realElem.getBoundingClientRect();
    const realElemBorderWidth = (realElemRect.width - realElem.clientWidth) / 2;
    const isExpanded = overlayElem.classList.contains("expanded");
    const width = `${realElem.clientWidth}px`;
    const height = isExpanded
      ? "100vh" 
      : `${realElem.clientHeight}px`;
    const top = isExpanded
      ? "0px"
      : `${realElemRect.top + realElemBorderWidth}px`;
    const left = `${realElemRect.left + realElemBorderWidth}px`;

    overlayElem.style.width = width;
    overlayElem.style.height = height;
    overlayElem.style.top = top;
    overlayElem.style.left = left;
  }

  function redrawAllOn(...events) {
    events.forEach(event => {
      window.addEventListener(event, function(e) {
        overlay.redrawAll(overlay);
      });
    });
  }

  let bsElements = findBootstrapElements();
  const overlay = new Overlay(bsElements);

  listenForCommands();
  redrawAllOn("scroll", "resize");
})();
