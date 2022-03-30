(async function() {
  window.resizeTo(300, 300);
  let tab = await getCurrentTabId();

  if (isChromeUrl(tab.url)) return;

  let hasScriptInjected = await hasContentScript(tab.id);
  if (!hasScriptInjected) {
    await Promise.all([
      injectContentScript(tab.id, "src/content.js"),
      injectStyles(tab.id, "src/css/grid-overlay.css")
    ]);
  }

  let elements = await getOverlayElements(tab.id);
  displayOverlayElements(elements, tab.id);

  function isChromeUrl(url) {
    return /^chrome:\/\//.test(url);
  }

  function toggleOverlayElement(element, tabId) {
    let msgObj = { index: element.dataset.index };

    switch (element.dataset.state) {
      case "off":
        element.dataset.state = "on";
        element.children[0].innerHTML = `<i class="fas fa-check"></i>`;
        msgObj["message"] = "add";
        break;
      case "on":
        element.dataset.state = "expanded";
        element.children[0].innerHTML = `<i class="fas fa-arrows-alt-v"></i>`;
        msgObj["message"] = "expand";
        break;
      case "expanded":
        element.dataset.state = "off";
        element.children[0].innerHTML = "";
        resetAllElement();
        msgObj["message"] = "remove";
        break;
    }

    chrome.tabs.sendMessage(tabId, msgObj);
  }

  function toggleAllOverlays(element, tabId) {
    let msgObj = { message: "addAll" };
    let checkboxes = Array.from(document.querySelectorAll(".btn-wrapper"));
    if (element.dataset.state === "on") {
      msgObj["isChecked"] = false;
      element.dataset.state = "off";
      element.children[0].innerHTML = "";

      // uncheck all checkboxes which are currently checked
      checkboxes.reverse().forEach(checkbox => {
        if (checkbox.dataset.state === "expanded") {
          checkbox.click();
        } else if (checkbox.dataset.state === "on") {
          checkbox.click();
          checkbox.click();
        }
      });
    } else {
      msgObj["isChecked"] = true;
      element.dataset.state = "on";
      element.children[0].innerHTML = `<i class="fas fa-check"></i>`;

      // check all checkboxes which are not checked yet
      checkboxes.reverse().forEach(checkbox => {
        if (checkbox.dataset.state === "off") {
          checkbox.click();
        }
      });
    }
    chrome.tabs.sendMessage(tabId, msgObj);
  }

  function displayOverlayElements(elements, tabId) {
    if (elements.length <= 1) return;

    document.querySelector(
      ".element-list"
    ).innerHTML = createListOfElementsHTML(elements);

    addButtonListeners(tabId);
  }

  function addButtonListeners(tabId) {
    document.querySelectorAll(".btn-wrapper").forEach(node => {
      node.addEventListener("click", function(event) {
        toggleOverlayElement(this, tabId);
      });
    });

    document
      .querySelector(".all-btn-wrapper")
      .addEventListener("click", function(event) {
        toggleAllOverlays(this, tabId);
      });
  }

  function resetAllElement() {
    let all = document.querySelector(".all-btn-wrapper");
    all.dataset.state = "off";
    all.children[0].innerHTML = "";
  }

  function createListOfElementsHTML(elements) {
    const ALL_BTN_STATE = elements.pop()[1] ? "on" : "off";
    let icon = (ALL_BTN_STATE == "on" ? `<i class="fas fa-check"></i>` : "");
    let resultHTML = `<div class="toggle-wrapper all-btn-wrapper" data-state=${allState}><button class="btn">${icon}</button><span class="element-name">all</span></div>`;

    elements.forEach((element, index) => {
      let name = element[0];
      let hasOverlay = element[1];
      let isExpanded = hasOverlay && Boolean(element[2]) ? true : false;
      let btnState = "off";
      let icon = "";
      if (hasOverlay) {
        if (isExpanded) {
          btnState = "expanded";
          icon = `<i class="fas fa-arrows-alt-v"></i>`;
        } else {
          btnState = "on";
          icon = `<i class="fas fa-check"></i>`;
        }
      }

      resultHTML += `<div class="toggle-wrapper btn-wrapper" data-index=${index} data-state=${btnState}><button class="btn">${icon}</button><span class="element-name">${name}</span></div>`;
    });

    return resultHTML;
  }

  function getOverlayElements(tabId) {
    return new Promise((resolve, reject) => {
      let msgObj = { message: "list" };

      chrome.tabs.sendMessage(tabId, msgObj, response => {
        if (!response) {
          reject(chrome.runtime.lastError);
          return;
        }
        if (!response.list) {
          reject(
            new Error("content script did not reply with list of elements")
          );
          return;
        }
        resolve(response.list);
      });
    });
  }

  async function getCurrentTabId() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
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
})();
