chrome.action.onClicked.addListener(tab => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: [ "src/content.js" ]
  });
  chrome.scripting.insertCSS({
    target { tabId: tab.id },
    files: [ "src/grid-overlay.css" ]
  });
});
