

// // Get arrays containing new and old rules
// const newRules = await getNewRules();
// const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
// const oldRuleIds = oldRules.map(rule => rule.id);

// // Use the arrays to update the dynamic rules
// await chrome.declarativeNetRequest.updateDynamicRules({
//   removeRuleIds: oldRuleIds,
//   addRules: newRules
// });
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // chrome.storage.local 持久化数据到本地
    await chrome.storage.local.set({
      "hostList": [
      ],
      "currentMaxId": 1
    });
  }
});