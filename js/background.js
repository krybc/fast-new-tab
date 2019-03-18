chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.get(function(result) {
    if (result.settings === undefined) {
      let storage = {
        settings: {
          columns: 3,
          background: '1.jpg'
        },
        widgets: []
      };
      chrome.storage.sync.set(storage);
    }
  });
});
