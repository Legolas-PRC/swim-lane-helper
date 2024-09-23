var currentSwimLane = '';

// 不单独存域名和泳道，只通过dynamic rule来存储
// dynamic rule：Persist across browser sessions and extension upgrades and are managed using JavaScript while an extension is in use.
function hostList() {
    return {
        newItem: '',
        items: [],
        async init() {
            // 获取存储的 hostList
            // const { hostList } = await chrome.storage.local.get('hostList');
            // this.items = hostList || [];
            // console.log(hostList);
            // console.log(await chrome.declarativeNetRequest.getDynamicRules());
            const rules = await chrome.declarativeNetRequest.getDynamicRules();
            console.log(rules);
            this.items = rules.map(element => {
                return {
                    "id": element.id,
                    "host": element.condition.urlFilter.slice(2)
                }
            }) || [];
            console.log(this.items);
        },
        async addItem() {
            // 修改配置项
            // if (this.newItem.trim() === '') return;
            // const { hostList } = await chrome.storage.local.get('hostList');
            // if (hostList.map(element => element.host).includes(this.newItem)) {
            //     console.log("域名已存在");
            //     return;
            // }
            // const { currentMaxId } = await chrome.storage.local.get("currentMaxId");
            // const hostItem = {
            //     "id": currentMaxId + 1,
            //     "host": this.newItem.trim()
            // };
            // hostList.push(hostItem);
            // this.items = hostList;
            // addHost(hostItem);
            // await chrome.storage.local.set({ hostList });
            // await chrome.storage.local.set({ currentMaxId: currentMaxId + 1 });
            const newItem = this.newItem.trim();
            if (newItem === '') return;
            const hostList = this.items.map(element => element.host);
            const idList = this.items.map(element => element.id);
            if (hostList.includes(newItem)) {
                console.log("域名已存在");
                return;
            }
            addHost(newItem, Math.max(idList) + 1);
            this.init();
        },
        async removeItem() {
            // // 修改配置项
            // const item = this.$data.item;
            // var { hostList } = await chrome.storage.local.get('hostList');
            // hostList = hostList.filter(host => host.id != item.id);
            // this.items = hostList;
            // deleteHost(item);
            // await chrome.storage.local.set({ hostList });
            const item = this.$data.item;
            deleteHost(item);
            this.init();
        },
        setItem(event) {
            this.newItem = event.target.value;
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
        async removeItem() {
            const item = this.$data.item;
            console.log(this);
            console.log(this.$data);
            console.log(this.$data.item);
            var { swimLaneList } = await chrome.storage.local.get("swimLaneList");
            swimLaneList = swimLaneList.filter(element => element.value != item.value);
            invalidateSwimlane(item.value);
            await chrome.storage.local.set({ swimLaneList });
            this.init();
        },
        setItem(event) {
            this.newItem = event.target.value;
        },
        async toggle(event){
            const status = event.target.checked;
            const item = this.$data.item;
            console.log(this);
            console.log(this.$data);
            console.log(item);
            const { swimLaneList } = await chrome.storage.local.get("swimLaneList");


            if(status){
                swimLaneList.forEach(element => {
                    if(element.value === item.value){
                        element.enable = true;
                    }else{
                        element.enable = false;
                    }
                })
                enbaleSwimLane(item.value);
            }else{
                swimLaneList.forEach(element =>{
                    if(element.value === item.value){
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
    rules.forEach(element => {
        const host = element.condition.urlFilter.slice(2);
        const redirectHost = currentSwimLane === '' ? host : currentSwimLane + '-sl-' + host;
        element.action.redirect.transform.host = redirectHost;
    })
}

async function addHost(newHost, id) {
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
    refreshSwimLane();
}

async function invalidateSwimlane(swimLane) {
    if (swimLane === currentSwimLane) {
        currentSwimLane = '';
        refreshSwimLane();
    }
}

