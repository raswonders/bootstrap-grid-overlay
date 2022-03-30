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
  displayOverlayElementsUI(elements, tab.id);
  addButtonListeners(tab.id);

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

  function displayOverlayElementsUI(elements, tabId) {
    if (elements.length <= 1) return;

    document.querySelector(".element-list").innerHTML = createElementListHTML(
      elements
    );
  }

  function addButtonListeners(tabId) {
    addOverlayBtnListeners(tabId);
    addAllBtnListener(tabId);
  }

  function addOverlayBtnListeners(tabId) {
    const BTNS = Array.from(document.querySelectorAll(".btn-wrapper"));
    BTNS.forEach(node => {
      node.addEventListener("click", function(event) {
        toggleOverlayElement(this, tabId);
      });
    });
  }

  function addAllBtnListener(tabId) {
    const BTN = document.querySelector(".all-btn-wrapper");
    BTN.addEventListener("click", function(event) {
      toggleAllOverlays(this, tabId);
    });
  }

  function resetAllElement() {
    let all = document.querySelector(".all-btn-wrapper");
    all.dataset.state = "off";
    all.children[0].innerHTML = "";
  }

  function createAllBtnTemplate(elements) {
    const BTN = elements.pop();
    const BTN_IS_CHECKED = BTN[1];
    const BTN_STATE = BTN_IS_CHECKED ? "on" : "off";
    const BTN_ICON = BTN_IS_CHECKED ? `<i class="fas fa-check"></i>` : "";

    return `
      <div class="toggle-wrapper all-btn-wrapper" data-state=${BTN_STATE}>
        <button class="btn">${BTN_ICON}</button>
        <span class="element-name">all</span>
      </div>
    `;
  }

  function createOverlayBtnTemplate(button, index) {
    let label, hasOverlay, isExpanded;
    [label, hasOverlay, isExpanded] = button;

    let btnState = "off";
    let btnIcon = "";

    if (hasOverlay) {
      btnState = "on";
      btnIcon = `<i class="fas fa-check"></i>`;
    }

    if (isExpanded) {
      btnState = "expanded";
      btnIcon = `<i class="fas fa-arrows-alt-v"></i>`;
    }

    return `
        <div class="toggle-wrapper btn-wrapper" data-index=${index} data-state=${btnState}>
          <button class="btn">${btnIcon}</button>
          <span class="element-name">${label}</span>
        </div>
      `;
  }

  function createElementListHTML(elements) {
    let result = createAllBtnTemplate(elements);

    elements.forEach((element, index) => {
      result += createOverlayBtnTemplate(element, index);
    });

    return result;
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
