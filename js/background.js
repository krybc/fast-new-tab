chrome.runtime.onInstalled.addListener(function() {
  let storage = {
    settings: {
      columns: 3,
      background: '1.jpg'
    },
    widgets: []
  };
  chrome.storage.sync.set(storage);
});