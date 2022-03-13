(async function() {
  let tabId = await getCurrentTabId();
  let hasScript = await hasContentScript(tabId);

  if (!hasScript) {
    await injectContentScript(tabId, "src/content.js");
    await injectStyles(tabId, "src/grid-overlay.css");
  }
})();

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

// let details = { target: { tabId: currentTab.id }, files: ["src/content.js"] };
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
