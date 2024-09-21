// 搞一个全局id
const currentSwimLane = '57318-mnfaw';

function listManager() {
    return {
        newItem: '',
        items: [],
        async init() {
            // 获取存储的 hostList
            const { hostList } = await chrome.storage.local.get('hostList');
            this.items = hostList || [];
            console.log(hostList);
            console.log(await chrome.declarativeNetRequest.getDynamicRules());
        },
        async addItem() {
            // 修改配置项
            if (this.newItem.trim() === '') return;
            const { hostList } = await chrome.storage.local.get('hostList');
            if (hostList.map(element => element.host).includes(this.newItem)) {
                console.log("域名已存在");
                return;
            }
            const { currentMaxId } = await chrome.storage.local.get("currentMaxId");
            const hostItem = {
                "id": currentMaxId + 1,
                "host": this.newItem.trim()
            };
            hostList.push(hostItem);
            this.items = hostList;
            addHost(hostItem);
            await chrome.storage.local.set({ hostList });
            await chrome.storage.local.set({ currentMaxId: currentMaxId + 1 });
        },
        async removeItem() {
            // 修改配置项
            const item = this.$data.item;
            var { hostList } = await chrome.storage.local.get('hostList');
            hostList = hostList.filter(host => host.id != item.id);
            this.items = hostList;
            deleteHost(item);
            await chrome.storage.local.set({ hostList });
        },
        setItem(event) {
            this.newItem = event.target.value;
        }
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('listManager', listManager);
})

async function addHost(hostItem) {
    const urlFilter = "||" + hostItem.host;
    const redirectHost = currentSwimLane + '-sl-' + hostItem.host;
    // id怎么取
    const rule = {
        "id": hostItem.id,
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
    console.log(await chrome.declarativeNetRequest.getDynamicRules());
}

async function deleteHost(hostItem) {
    const removeRuleIds = [hostItem.id];

    await chrome.declarativeNetRequest.updateDynamicRules({
        "removeRuleIds": removeRuleIds
    });
    console.log(await chrome.declarativeNetRequest.getDynamicRules());
}

