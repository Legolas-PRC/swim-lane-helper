// host:id,value,enable
// swimLane:id,value,enable


chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // chrome.storage.local 持久化数据到本地
    await chrome.storage.local.set({
      "hostList": [],
      "swimLaneList": []
    });
  }
});