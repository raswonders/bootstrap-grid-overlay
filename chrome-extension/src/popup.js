(async function() {
  window.resizeTo(300, 300);

  let tabId = await getCurrentTabId();
  let hasScript = await hasContentScript(tabId);

  if (!hasScript) {
    await injectContentScript(tabId, "src/content.js");
    await injectStyles(tabId, "src/grid-overlay.css");
  }

  let elements = await getOverlayElements(tabId);
  updateElementsInDOM(elements, tabId);
})();

function toggleOverlayElement(checkboxElem, tabId) {
  let msgObj = { index: checkboxElem.dataset.index };
  if (checkboxElem.checked) {
    msgObj["message"] = "add";
    chrome.tabs.sendMessage(tabId, msgObj);
  } else {
    msgObj["message"] = "remove";
    chrome.tabs.sendMessage(tabId, msgObj);
  }
}

function toggleAllOverlays(checkboxElem) {
  let checkboxes = document.querySelectorAll(".bootstrap-element");
  if (checkboxElem.checked) {
    // check all checkboxes which are not checked yet
    checkboxes.forEach(checkbox => {
      if (!checkbox.checked) {
        checkbox.click();
      }
    });
  } else {
    // uncheck all checkboxes which are currently checked
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        checkbox.click();
      }
    });
  }
}

function updateElementsInDOM(elements, tabId) {
  let contentHTML = createListOfElementsHTML(elements);
  document.querySelector(".element-list").innerHTML = contentHTML;

  // Add event listeners to bootstrap element checkboxes
  let checkboxes = document.querySelectorAll(".bootstrap-element");
  checkboxes.forEach(node => {
    node.addEventListener("change", function(event) {
      toggleOverlayElement(this, tabId);
    });
  });

  // Add event listener for all checkbox
  let all = document.querySelector("#checkbox-all");
  all.addEventListener("change", function(event) {
    toggleAllOverlays(this);
  });
}

function addActionToCheckboxes(nodelist, tabId) {
  Array.from(nodelist).forEach(node => {
    node.addEventListener("change", function(event) {
      toggleOverlayElement(this, tabId);
    });
  });
}

function createListOfElementsHTML(elements) {
  let resultHTML = `<div><input type="checkbox" id="checkbox-all"><label for="checkbox-all">all</label></div>`;
  elements.forEach((element, index) => {
    let id = `checkbox${index}`;
    let name = element[0];
    let state = element[1] ? "checked" : "";
    resultHTML += `<div><input type="checkbox" class="bootstrap-element" id="${id}" data-index="${index}" ${state}><label for="${id}">${name}</label></div>`;
  });

  return resultHTML;
}

function getOverlayElements(tabId) {
  return new Promise((resolve, reject) => {
    let msgObj = { message: "list" };
    chrome.tabs.sendMessage(tabId, msgObj, response => {
      if (!response) {
        chrome.runtime.lastError && reject(false);
      } else {
        resolve(response);
      }
    });
  });
}

// identify tab, that it's running in
async function getCurrentTabId() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab.id;
}

// resolves as true if content script is already injected
function hasContentScript(tabId) {
  return new Promise((resolve, reject) => {
    let msgObj = { message: "ping" };
    chrome.tabs.sendMessage(tabId, msgObj, response => {
      if (!response) {
        chrome.runtime.lastError && resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function injectContentScript(tabId, filePath) {
  return new Promise((resolve, reject) => {
    let details = {
      target: { tabId: tabId },
      files: [filePath]
    };

    chrome.scripting.executeScript(details, injectionResult => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(injectionResult);
      }
    });
  });
}

function injectStyles(tabId, filePath) {
  return new Promise((resolve, reject) => {
    let details = {
      target: { tabId: tabId },
      files: [filePath]
    };

    chrome.scripting.insertCSS(details, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
