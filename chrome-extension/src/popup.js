(async function() {
  window.resizeTo(300, 300);
  let tab = await getCurrentTabId();
  let tabId = tab.id;

  if (isChromeUrl(tab.url)) {
    return;
  }

  let hasScript = await hasContentScript(tabId);

  if (!hasScript) {
    await injectContentScript(tabId, "src/content.js");
    await injectStyles(tabId, "src/css/grid-overlay.css");
  }

  let elements = await getOverlayElements(tabId);
  updateElementsInDOM(elements, tabId);

  function isChromeUrl(url) {
    return /^chrome:\/\//.test(url);
  }

  function toggleOverlayElement(element, tabId) {
    let msgObj = { index: element.dataset.index };

    switch(element.dataset.state) {
      case "off":
        element.dataset.state = "on";
        element.children[0].innerHTML = `<i class="fas fa-check"></i>`;
        msgObj["message"] = "add";
        break;
      case "on": 
        element.dataset.state = "expanded";
        element.children[0].innerHTML = `<i class="fas fa-expand"></i>`;
        msgObj["message"] = "expand";
        break;
      case "expanded":
        element.dataset.state = "off";
        element.children[0].innerHTML = "";
        msgObj["message"] = "remove";
        break;
    }

    chrome.tabs.sendMessage(tabId, msgObj);
  }

  function toggleAllOverlays(checkboxElem, tabId) {
    let msgObj = { message: "addAll" };
    let checkboxes = Array.from(
      document.querySelectorAll(".bootstrap-element")
    );
    if (checkboxElem.checked) {
      msgObj["isChecked"] = true;
      // check all checkboxes which are not checked yet
      checkboxes.reverse().forEach(checkbox => {
        if (!checkbox.checked) {
          checkbox.click();
        }
      });
    } else {
      msgObj["isChecked"] = false;
      // uncheck all checkboxes which are currently checked
      checkboxes.reverse().forEach(checkbox => {
        if (checkbox.checked) {
          checkbox.click();
        }
      });
    }
    chrome.tabs.sendMessage(tabId, msgObj);
  }

  function updateElementsInDOM(elements, tabId) {
    elementList = document.querySelector(".element-list");

    if (elements.length > 1) {
      hideNoElementsMsg();
      elementList.innerHTML = createListOfElementsHTML(elements);

      // Add event listeners to bootstrap element checkboxes
      let checkboxes = document.querySelectorAll(".three-state");
      checkboxes.forEach(node => {
        node.addEventListener("click", function(event) {
          toggleOverlayElement(this, tabId);
        });
      });

      // Add event listener for all checkbox
      // let all = document.querySelector("#checkbox-all");
      // all.addEventListener("change", function(event) {
      //   toggleAllOverlays(this, tabId);
      // });
    }
  }

  function hideNoElementsMsg() {
    document.querySelector(".no-elements").style.display = "none";
  }

  function addActionToCheckboxes(nodelist, tabId) {
    Array.from(nodelist).forEach(node => {
      node.addEventListener("change", function(event) {
        toggleOverlayElement(this, tabId);
      });
    });
  }

  function createListOfElementsHTML(elements) {
    let allState = elements.pop()[1] ? "on" : "off";
    let resultHTML = `<div class="wrapper two-state" data-state=${allState}><button class="btn"></button><span class="element-name">all</span></div>`;

    elements.forEach((element, index) => {
      let name = element[0];
      let hasOverlay = element[1];
      let isExpanded = (hasOverlay && Boolean(element[2])) ? true : false;
      let btnState = "off";
      if(hasOverlay) {
        if(isExpanded) {
          btnState = "expanded";
        }
        btnState = "on"
      }

      resultHTML += `<div class="wrapper three-state" data-index=${index} data-state=${btnState}><button class="btn"></button><span class="element-name">${name}</span></div>`;
    });

    return resultHTML;
  }

  function getOverlayElements(tabId) {
    return new Promise((resolve, reject) => {
      let msgObj = { message: "list" };
      chrome.tabs.sendMessage(tabId, msgObj, response => {
        if (!response) {
          reject(chrome.runtime.lastError);
        } else if (!response.list) {
          reject(new Error("content script did not reply list message"));
        } else {
          resolve(response.list);
        }
      });
    });
  }

  // identify tab, that it's running in
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
