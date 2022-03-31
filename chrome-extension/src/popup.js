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

  function toggleOverlayBtn(element, tabId) {
    const update = { index: element.dataset.index };

    switch (element.dataset.state) {
      case "off":
        switchBtnState(element, "on");
        update.message = "add";
        break;
      case "on":
        switchBtnState(element, "expanded");
        update.message = "expand";
        break;
      case "expanded":
        switchBtnState(element, "off");
        update.message = "remove";
        resetAllBtn();
        break;
    }

    notifyContentScript(tabId, update);
  }

  function notifyContentScript(tabId, msg) {
    chrome.tabs.sendMessage(tabId, msg);
  }

  function switchBtnState(btnWrapper, state) {
    const btn = btnWrapper.children[0];
    const iconNone = "";
    const iconCheck = `<i class="fas fa-check"></i>`;
    const iconExpand = `<i class="fas fa-arrows-alt-v"></i>`;

    switch (state) {
      case "on":
        btnWrapper.dataset.state = "on";
        btn.innerHTML = iconCheck;
        break;
      case "off":
        btnWrapper.dataset.state = "off";
        btn.innerHTML = iconNone;
        break;
      case "expanded":
        btnWrapper.dataset.state = "expanded";
        btn.innerHTML = iconExpand;
        break;
    }
  }

  function toggleAllBtn(element, tabId) {
    const msgObj = {};
    const buttons = Array.from(document.querySelectorAll(".btn-wrapper"));
    const btn = element.children[0];

    if (element.dataset.state === "on") {
      switchBtnState(element, "off");
      msgObj.message = "removeAll";

      // uncheck all buttons which are currently checked
      buttons.reverse().forEach(btn => {
        if (btn.dataset.state === "expanded") {
          btn.click();
        } 
        
        if (btn.dataset.state === "on") {
          btn.click();
          btn.click();
        }
      });
    } else {
      msgObj.message = "addAll";
      switchBtnState(element, "on");

      // check all buttons which are not checked yet
      buttons.reverse().forEach(btn => {
        if (btn.dataset.state === "off") {
          btn.click();
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
    const buttons = Array.from(document.querySelectorAll(".btn-wrapper"));
    buttons.forEach(node => {
      node.addEventListener("click", function(event) {
        toggleOverlayBtn(this, tabId);
      });
    });
  }

  function addAllBtnListener(tabId) {
    const btn = document.querySelector(".all-btn-wrapper");
    btn.addEventListener("click", function(event) {
      toggleAllBtn(this, tabId);
    });
  }

  function resetAllBtn() {
    let all = document.querySelector(".all-btn-wrapper");
    all.dataset.state = "off";
    all.children[0].innerHTML = "";
  }

  function createAllBtnTemplate(elements) {
    const btn = elements.pop();
    const btnIsChecked = btn[1];
    const btnState = btnIsChecked ? "on" : "off";
    const btnIcon = btnIsChecked ? `<i class="fas fa-check"></i>` : "";

    return `
      <div class="toggle-wrapper all-btn-wrapper" data-state=${btnState}>
        <button class="btn">${btnIcon}</button>
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
