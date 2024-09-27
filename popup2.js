document.addEventListener('alpine:init', () => {
    Alpine.data('hostList', hostList);
    Alpine.data('swimLaneList', swimLaneList);
})

function hostList() {
    return {
        newItem: "",
        items: [],
        async init() {
            const { hostList } = await chrome.storage.local.get("hostList");
            console.log(hostList);
            this.items = hostList || [];
            console.log(this.items);
            refreshDynamicRule();
        },
        setItem(event) {
            this.newItem = event.target.value;
        },
        async addItem() {
            const newItem = this.newItem.trim();
            if (newItem === "") return;

            const { hostList } = await chrome.storage.local.get("hostList");
            const duplicateHost = hostList.find(element => element.value === newItem);
            if (duplicateHost) {
                console.log("host:" + newItem + "已存在");
            }

            const idList = hostList.map(element => element.id);
            const id = idList.length === 0 ? 1 : Math.max(...idList) + 1;
            const newHostItem = {
                "id": id,
                "value": newItem,
                "enable": true,
                "uniqueId": "host-" + id
            }

            hostList.push(newHostItem);
            await updateStorage("hostList", hostList);
            this.init();
        },
        async removeItem() {
            const item = this.$data.item;
            await deleteFromStorage("hostList", item);
            this.init();
        },
        async toggle(event) {
            const item = this.$data.item;
            const status = event.target.checked;
            const { hostList } = await chrome.storage.local.get("hostList");
            hostList.forEach(element => {
                if (element.id === item.id) {
                    element.enable = status;
                }
            });
            await updateStorage("hostList", hostList);
            this.init();
        }
    }
}

function swimLaneList() {
    return {
        newItem: "",
        items: [],
        async init() {
            const { swimLaneList } = await chrome.storage.local.get("swimLaneList");
            console.log(swimLaneList);
            this.items = swimLaneList || [];
            console.log(this.items);
            refreshDynamicRule();
        },
        setItem(event) {
            this.newItem = event.target.value;
        },
        async addItem() {
            const newItem = this.newItem.trim();
            if (newItem === "") return;

            const { swimLaneList } = await chrome.storage.local.get("swimLaneList");
            const duplicateSwimLane = swimLaneList.find(element => element.value === newItem);
            if (duplicateSwimLane) {
                console.log("swimLane:" + newItem + "已存在");
            }

            const idList = swimLaneList.map(element => element.id);
            const id = idList.length === 0 ? 1 : Math.max(...idList) + 1;
            const newHostItem = {
                "id": id,
                "value": newItem,
                "enable": true,
                "uniqueId": "swimLane-" + id
            }

            // todo 使其他泳道不可用
            swimLaneList.forEach(element => element.enable = false);
            swimLaneList.push(newHostItem);
            await updateStorage("swimLaneList", swimLaneList);
            this.init();
        },
        async removeItem() {
            const item = this.$data.item;
            await deleteFromStorage("swimLaneList", item);
            this.init();
        },
        async toggle(event) {
            const item = this.$data.item;
            const status = event.target.checked;
            console.log(status);
            const { swimLaneList } = await chrome.storage.local.get("swimLaneList");

            if (status) {
                swimLaneList.forEach(element => {
                    if (element.enable) {
                        element.enable = false;
                    }
                    if (element.id === item.id) {
                        element.enable = true;
                    }
                });
            } else {
                swimLaneList.forEach(element => {
                    if (element.id === item.id) {
                        element.enable = false;
                    }
                });
            }

            await updateStorage("swimLaneList", swimLaneList);
            this.init();
        }
    }
}

async function refreshDynamicRule() {
    const { hostList } = await chrome.storage.local.get("hostList");

    const { swimLaneList } = await chrome.storage.local.get("swimLaneList");
    const currentSwimLane = swimLaneList.find(element => element.enable);

    const ruleList = await chrome.declarativeNetRequest.getDynamicRules();
    const idList = ruleList.map(element => element.id);

    var redirectHostPrefix;
    if (currentSwimLane) {
        redirectHostPrefix = currentSwimLane.value + "-sl-";
    } else {
        redirectHostPrefix = "";
    }

    const newRuleList = hostList
        .filter(element => element.enable)
        .map(element => {

            return {
                "id": element.id,
                "priority": 1,
                "action": {
                    "type": "redirect",
                    "redirect": {
                        "transform": { "host": redirectHostPrefix + element.value }
                    }
                },
                "condition": {
                    "urlFilter": "||" + element.value,
                    "resourceTypes": ["main_frame"]
                }
            }

        });

    console.log(newRuleList);
    const ruleOptions = {
        removeRuleIds: idList
    }
    if (newRuleList.length > 0) {
        ruleOptions.addRules = newRuleList;
    }

    await chrome.declarativeNetRequest.updateDynamicRules(ruleOptions);
}

async function updateStorage(key, value) {
    await chrome.storage.local.set({
        [key]: value
    });
}

async function addToStorage(key, addItem) {
    const listObject = await chrome.storage.local.get(key);
    const list = listObject[key];
    list.push(addItem);
    await updateStorage(key, list);
}

async function deleteFromStorage(key, deletedItem) {
    const listObject = await chrome.storage.local.get(key);
    const list = listObject[key];
    const newList = list.filter(element => element.id != deletedItem.id);
    await updateStorage(key, newList);
}