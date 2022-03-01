injectContentScript();

// identify tab, that it's running in
async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// injects content script if there isn't one already
async function injectContentScript() {
  let currentTab = await getCurrentTab();
  let msgObj = { message: "ping" };

  // ping tab's content scripts
  // Note: sendMessage doesn't support promises yet
  chrome.tabs.sendMessage(currentTab.id, msgObj, response => {
    // when no reply => inject script
    if (!response && chrome.runtime.lastError) {
      console.log("Content script not detected, injecting...");
      chrome.scripting.executeScript(
        {
          target: { tabId: currentTab.id },
          files: ["src/content.js"]
        },
        result => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
          } else {
            console.log("Content script injected");
          }
        }
      );
      chrome.scripting.insertCSS(
        {
          target: { tabId: currentTab.id },
          files: ["src/grid-overlay.css"]
        },
        result => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
          } else {
            console.log("CSS injected");
          }
        }
      );
    } else {
      console.log("Content script detected, skipping injection");
    }
  });
}
