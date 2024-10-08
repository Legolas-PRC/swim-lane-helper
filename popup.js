var currentSwimLane = '';

// 不单独存域名和泳道，只通过dynamic rule来存储
// dynamic rule：Persist across browser sessions and extension upgrades and are managed using JavaScript while an extension is in use.
function hostList() {
    return {
        newItem: '',
        items: [],
        async init() {
            const rules = await chrome.declarativeNetRequest.getDynamicRules();
            console.log(rules);
            this.items = rules.map(element => {
                return {
                    "id": element.id,
                    "host": element.condition.urlFilter.slice(2),
                    "enable": element.action.redirect.transform.host == element.condition.urlFilter.slice(2)
                }
            }) || [];
            console.log(this.items);
        },
        async addItem() {
            const newItem = this.newItem.trim();
            if (newItem === '') return;
            const hostList = this.items.map(element => element.host);
            const idList = this.items.map(element => element.id);
            if (hostList.includes(newItem)) {
                console.log("域名已存在");
                return;
            }

            addHost(newItem, idList.length === 0 ? 1 : Math.max(...idList) + 1);
            this.init();
        },
        async removeItem() {
            const item = this.$data.item;
            deleteHost(item);
            this.init();
        },
        setItem(event) {
            this.newItem = event.target.value;
        },
        async toggle(event) {
            const status = event.target.checked;
            const item = this.$data.item;
            const rules = await chrome.declarativeNetRequest.getDynamicRules({ruleIds:[item.id]});
            const rule = rules[0];
            console.log(rule);
            console.log(rule.condition);
            if (status) {
                const host = rule.condition.urlFilter.slice(2);
                rule.action.redirect.transform.host = currentSwimLane === '' ? host : currentSwimLane + "-sl-" + host;
            } else {
                rule.action.redirect.transform.host = rule.condition.urlFilter.slice(2);
            }
            const deleteIdList = [item.id];
            const updateList = [rule];
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: deleteIdList,
                addRules: updateList
            });
        }
    }
}

// 泳道需要单独存，因为同时只能有一个泳道生效
// 
function swimLaneList() {
    return {
        newItem: '',
        items: [],
        async init() {
            const { swimLaneList } = await chrome.storage.local.get("swimLaneList");
            console.log(swimLaneList);
            this.items = swimLaneList || [];
            console.log(this.items);
        },
        async addItem() {
            const newItem = this.newItem.trim();
            if (newItem === '') return;
            const { swimLaneList } = await chrome.storage.local.get("swimLaneList");
            const valueList = swimLaneList.map(element => element.value);
            if (valueList.includes(newItem)) {
                console.log("泳道已存在");
                return;
            }


            // 将其他泳道状态设为false
            swimLaneList.forEach(element => {
                element.enable = false;
            });
            swimLaneList.push({
                "value": newItem,
                "enable": true
            });
            await chrome.storage.local.set({ swimLaneList });

            enbaleSwimLane(newItem);
            this.init();
        },
        async removeItem(event) {
            console.log(event);
            const item = this.$data.item;
            var { swimLaneList } = await chrome.storage.local.get("swimLaneList");
            swimLaneList = swimLaneList.filter(element => element.value != item.value);
            invalidateSwimlane(item.value);
            await chrome.storage.local.set({ swimLaneList });
            this.init();
        },
        setItem(event) {
            this.newItem = event.target.value;
        },
        async toggle(event) {
            const status = event.target.checked;
            const item = this.$data.item;
            const { swimLaneList } = await chrome.storage.local.get("swimLaneList");

            if (status) {
                swimLaneList.forEach(element => {
                    if (element.value === item.value) {
                        element.enable = true;
                    } else {
                        element.enable = false;
                    }
                })
                enbaleSwimLane(item.value);
            } else {
                swimLaneList.forEach(element => {
                    if (element.value === item.value) {
                        element.enable = false;
                    }
                })
                invalidateSwimlane(item.value);
            }
            await chrome.storage.local.set({ swimLaneList });
            this.init();
        }
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('hostList', hostList);
    Alpine.data('swimLaneList', swimLaneList);
})

async function refreshSwimLane() {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = rules.map(element => element.id);

    rules.forEach(element => {
        const host = element.condition.urlFilter.slice(2);
        const redirectHost = currentSwimLane === '' ? host : currentSwimLane + '-sl-' + host;
        element.action.redirect.transform.host = redirectHost;
    })
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeRuleIds,
        addRules: rules,
    })
    console.log(currentSwimLane);
    console.log(rules);
}

async function addHost(newHost, id) {
    console.log("newHost:" + newHost, "id:" + id);
    const urlFilter = "||" + newHost;
    const redirectHost = currentSwimLane === '' ? newHost : currentSwimLane + '-sl-' + newHost;
    // id怎么取
    const rule = {
        "id": id,
        "priority": 1,
        "action": {
            "type": "redirect",
            "redirect": {
                "transform": { "host": redirectHost }
            }
        },
        "condition": {
            "urlFilter": urlFilter,
            "resourceTypes": ["main_frame"]
        }
    }
    const newRules = [rule];
    await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
    });
}

async function deleteHost(hostItem) {
    const removeRuleIds = [hostItem.id];

    await chrome.declarativeNetRequest.updateDynamicRules({
        "removeRuleIds": removeRuleIds
    });
}

async function enbaleSwimLane(swimLane) {
    currentSwimLane = swimLane;
    await chrome.storage.local.set({ currentSwimLane });
    refreshSwimLane();
}

async function invalidateSwimlane(swimLane) {
    if (swimLane === currentSwimLane) {
        currentSwimLane = '';
        await chrome.storage.local.set({ currentSwimLane });
        refreshSwimLane();
    }
}