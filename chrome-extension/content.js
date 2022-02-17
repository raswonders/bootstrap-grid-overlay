(function() {
  /* On/Off switch */
  if (localStorage.getItem("bootstrap-grid-overlay")) {
    cleanUp();
    return;
  } else {
    localStorage.setItem("bootstrap-grid-overlay", "1");
  }

  /* Detects all bootstrap row elements */

  let rows = document.body.querySelectorAll(".row");

  appendStyles();
  /* Creates overlay div and appends it to page */
  let overlayEl = document.createElement("div");
  overlayEl.id = "grid-overlay";
  document.body.appendChild(overlayEl);
  /* Inits row:grid Map() for all rows which has been detected */

  let visibleOverlays = new Map();
  rows.forEach(row => {
    visibleOverlays.set(row, initGridOverlay(row));
  });
  function cleanUp() {
    /* remove grid element from DOM */
    let overlayEl = document.querySelector("#grid-overlay");
    if (overlayEl) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    /* remove stylesheet element from DOM */

    let styleSheetEl = document.querySelector("#grid-overlay-style");
    if (styleSheetEl) {
      styleSheetEl.parentNode.removeChild(styleSheetEl);
    }
    /* remove event listeners from DOM */

    window.removeEventListener("resize", updateOverlays);
    window.removeEventListener("scroll", updateOverlays);
    /* clear localStorage */

    localStorage.removeItem("bootstrap-grid-overlay");
  }
  /* Append grid-overlay styles */

  function appendStyles() {
    let styles = ` #grid-overlay { --green: rgba(194, 221, 182, 0.4); --blue: rgba(141, 187, 226, 0.4); --pink: rgba(255, 0, 220, 0.6); --white: rgba(255, 255, 255, 0.8); pointer-events: none; position: fixed; display: block; width: 100%; height: 100%; top: 0; left: 0; right: 0; bottom: 0; z-index: 2; } .grid-overlay-row { position: absolute; display: flex; flex-wrap: nowrap; outline: 1px dotted var(--pink); /* Counters the fact grid-overlay isn't enclosed in container */ margin-left: 0; margin-right: 0; margin-top: 0; } .grid-overlay-col { min-width: 0; min-height: 0; color: var(--white); background-image:linear-gradient(to bottom,  var(--blue) 0%,  var(--blue) 100%), linear-gradient(to bottom, var(--green) 0%, var(--green) 100%); background-clip: content-box, padding-box; } .grid-overlay-col div { text-align: center; } `;
    let styleSheet = document.createElement("style");
    styleSheet.id = "grid-overlay-style";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
  }
  /* Inits grid overlay */
  function initGridOverlay(rowElem) {
    let allowedClassesRegExp = /\b(gx-[0-5]|gy-[0-5]|row)\b/;
    gridOverlay = document.createElement("div");
    /* Copy classes from row to overlay */
    rowElem.classList.forEach(cls => {
      if (allowedClassesRegExp.test(cls)) {
        gridOverlay.classList.add(cls);
      }
    });
    gridOverlay.classList.add("grid-overlay-row");
    /* Create overlay columns */
    for (let i = 1; i <= 12; i++) {
      columnEl = document.createElement("div");
      columnEl.innerHTML = `<div>${i}</div>`;
      columnEl.classList.add("grid-overlay-col");
      columnEl.classList.add("col-1");
      gridOverlay.appendChild(columnEl);
    }
    return document.getElementById("grid-overlay").appendChild(gridOverlay);
  }
  /* Updates position of single overlay */
  function positionGridOverlay(row, grid) {
    /* learns position of a row */
    rowRect = row.getBoundingClientRect();
    rowBorderWidth = (rowRect.width - row.clientWidth) / 2;
    /* positions grid overlay */
    grid.style.left = `${rowRect.left + rowBorderWidth}px`;
    grid.style.top = `${rowRect.top + rowBorderWidth}px`;
    grid.style.width = `${row.clientWidth}px`;
    grid.style.height = `${row.clientHeight}px`;
  }
  /* Updates position of all overlays on page */
  let updateOverlayTimeout = 0;
  function updateOverlays() {
    /* resets timeout of scheduled update */
    clearTimeout(updateOverlayTimeout);
    updateOverlayTimeout = setTimeout(() => {
      for (let [row, grid] of visibleOverlays.entries()) {
        positionGridOverlay(row, grid);
      }
    }, 0);
  }
  updateOverlays();
  window.addEventListener("resize", updateOverlays);
  window.addEventListener("scroll", updateOverlays);
})();
