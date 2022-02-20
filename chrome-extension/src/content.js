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

  /* Creates overlay div and appends it to page */
  let overlayEl = document.createElement("div");
  overlayEl.id = "grid-overlay";
  document.body.appendChild(overlayEl);
  /* Inits row:grid Map() for all rows which has been detected */

  let visibleOverlays = new Map();
  rows.forEach(row => {
    visibleOverlays.set(row, createRowOverlay(row));
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

  /* Inits grid overlay */
  function createRowOverlay(rowElem) {
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
  window.addEventListener("unload", () => {
    localStorage.removeItem("bootstrap-grid-overlay");
  })
})();
