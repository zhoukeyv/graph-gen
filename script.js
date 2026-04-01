// ==================== 1. 数据生成算法 ====================
function rand(l, r) { return Math.floor(Math.random() * (r - l + 1)) + l; }
function insertSorted(arr, val) {
    let low = 0, high = arr.length - 1;
    while (low <= high) { let mid = Math.floor((low + high) / 2); if (arr[mid] < val) low = mid + 1; else high = mid - 1; }
    arr.splice(low, 0, val);
}
function genTree(n) {
    if (n <= 1) return n + '\n'; if (n === 2) return n + '\n1 2\n';
    let edges = [], degree = new Array(n + 1).fill(1), sequence = [];
    for (let i = 0; i < n - 2; i++) { let node = rand(1, n); sequence.push(node); degree[node]++; }
    let leaves = []; for (let i = 1; i <= n; i++) if (degree[i] === 1) leaves.push(i);
    leaves.sort((a, b) => a - b);
    for (let i = 0; i < n - 2; i++) { let u = leaves.shift(), v = sequence[i]; edges.push(`${u} ${v}`); if (--degree[v] === 1) insertSorted(leaves, v); }
    edges.push(`${leaves[0]} ${leaves[1]}`); return n + '\n' + edges.join('\n');
}
function genChain(n) {
    if (n <= 1) return n + '\n'; let res = n + '\n';
    for (let i = 1; i < n; i++) res += i + ' ' + (i + 1) + '\n'; return res.trim();
}
function genDaisy(n) {
    if (n <= 1) return n + '\n'; let res = n + '\n';
    for (let i = 2; i <= n; i++) res += '1 ' + i + '\n'; return res.trim();
}
function genBinary(n) {
    if (n <= 1) return n + '\n'; let res = n + '\n';
    for (let i = 1; i <= n; i++) { if (i * 2 <= n) res += i + ' ' + (i * 2) + '\n'; if (i * 2 + 1 <= n) res += i + ' ' + (i * 2 + 1) + '\n'; }
    return res.trim();
}
function genGraph(n, m) {
    let set = new Set(); m = Math.min(m, n * (n - 1) / 2);
    while (set.size < m) { let u = rand(1, n), v = rand(1, n); if (u === v) continue; if (u > v) [u, v] = [v, u]; set.add(u + ' ' + v); }
    let res = n + ' ' + m + '\n'; for (let s of set) res += s + '\n'; return res.trim();
}
function genWeightTree(n, maxw) {
    if (n <= 1) return n + '\n'; if (n === 2) return n + '\n1 2 ' + rand(1, maxw) + '\n';
    let edges = [], degree = new Array(n + 1).fill(1), sequence = [];
    for (let i = 0; i < n - 2; i++) { let node = rand(1, n); sequence.push(node); degree[node]++; }
    let leaves = []; for (let i = 1; i <= n; i++) if (degree[i] === 1) leaves.push(i);
    leaves.sort((a, b) => a - b);
    for (let i = 0; i < n - 2; i++) { let u = leaves.shift(), v = sequence[i], w = rand(1, maxw); edges.push(`${u} ${v} ${w}`); if (--degree[v] === 1) insertSorted(leaves, v); }
    edges.push(`${leaves[0]} ${leaves[1]} ${rand(1, maxw)}`); return n + '\n' + edges.join('\n');
}

// ==================== 2. 全局状态与网络图核心 ====================

let nodesDataset = null;
let edgesDataset = null;
let network = null;
let contextNodeId = null;

// 高级状态机
function getStyleObject(node, updates) {
    node = node || {};
    let isPinned = updates.isPinned !== undefined ? updates.isPinned : (node.isPinned || false);
    let customBorder = updates.customColor !== undefined ? updates.customColor : (node.customColor || '#4e6ef2');
    
    let baseLabel = updates.label !== undefined ? updates.label : (node.baseLabel !== undefined ? node.baseLabel : (node.label || ''));
    if (typeof baseLabel === 'string') { baseLabel = baseLabel.replace(/\s*📌$/, ''); }

    return {
        id: node.id || updates.id,
        baseLabel: baseLabel,
        label: isPinned ? (baseLabel ? baseLabel + ' 📌' : '📌') : baseLabel,
        isPinned: isPinned,
        customColor: customBorder,
        fixed: isPinned,
        borderWidth: isPinned ? 4 : 2,
        borderWidthSelected: isPinned ? 4 : 2, // 【关键修复】被选中时，边框粗细与未选中时保持绝对一致，禁止变粗！
        color: {
            background: isPinned ? '#f3f4f6' : '#ffffff',
            border: customBorder,
            highlight: {
                background: isPinned ? '#e5e7eb' : '#f0f4ff',
                border: customBorder // 选中时依然保持颜色不变
            }
        },
        shadow: isPinned ? { enabled: true, color: 'rgba(0,0,0,0.3)', size: 8, x: 2, y: 2 } : true
    };
}

function updateNodeStyle(nodeId, updates) {
    let node = nodesDataset.get(nodeId);
    if (!node) return;
    nodesDataset.update(getStyleObject(node, updates));
}

function initNetwork() {
    nodesDataset = new vis.DataSet();
    edgesDataset = new vis.DataSet();
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodesDataset, edges: edgesDataset };
    
    const initNodeSize = parseInt(document.getElementById('nodeSize').value);
    const initEdgeLength = parseInt(document.getElementById('edgeLength').value);

    const options = {
        nodes: {
            shape: 'circle',
            mass: 2.5,
            borderWidth: 2,
            borderWidthSelected: 2, // 【关键修复】全局默认禁止变粗
            color: { background: '#ffffff', border: '#4e6ef2', highlight: { background: '#f0f4ff', border: '#3a5cd3' } },
            font: { color: '#333', size: initNodeSize, face: 'system-ui' }, 
            shadow: true
        },
        edges: {
            color: { color: '#999', highlight: '#4e6ef2' },
            width: 2, font: { size: 14, align: 'top', background: '#ffffff' }, smooth: { type: 'continuous' } 
        },
        physics: {
            enabled: true, solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springConstant: 0.06, springLength: initEdgeLength, damping: 0.75, avoidOverlap: 0.5 },
            stabilization: { iterations: 150 } 
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };

    network = new vis.Network(container, data, options);

    network.on("click", function (params) {
        if (params.event.srcEvent.shiftKey && params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodesDataset.get(nodeId);
            updateNodeStyle(nodeId, { isPinned: !node.isPinned });
            closeContextMenu();
            return;
        }
        closeContextMenu();
    });

    network.on("dragStart", function(params) {
        closeContextMenu();
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodesDataset.get(nodeId);
            if (node && node.isPinned) { nodesDataset.update({ id: nodeId, fixed: false }); }
        }
    });
    network.on("dragEnd", function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodesDataset.get(nodeId);
            if (node && node.isPinned) { nodesDataset.update({ id: nodeId, fixed: true }); }
        }
    });

    network.on("oncontext", function (params) {
        params.event.preventDefault(); 
        const nodeId = network.getNodeAt(params.pointer.DOM);
        
        if (nodeId !== undefined) {
            contextNodeId = nodeId;
            const node = nodesDataset.get(nodeId);
            const menu = document.getElementById('contextMenu');
            const labelInput = document.getElementById('nodeLabelInput');
            const colorInput = document.getElementById('nodeColorInput');
            
            menu.style.left = (params.event.clientX + window.scrollX + 10) + 'px';
            menu.style.top = (params.event.clientY + window.scrollY + 10) + 'px';
            menu.style.display = 'flex';
            
            let pureLabel = node.baseLabel !== undefined ? node.baseLabel : (node.label || String(nodeId));
            if (typeof pureLabel === 'string') pureLabel = pureLabel.replace(/\s*📌$/, '');
            labelInput.value = pureLabel;
            
            colorInput.value = node.customColor || '#4e6ef2';
            setTimeout(() => { labelInput.focus(); labelInput.select(); }, 50); 
        } else {
            closeContextMenu();
        }
    });

    network.on("zoom", closeContextMenu);
}

// 文本更新图表
window.renderGraphFromText = function() {
    if (!nodesDataset || !edgesDataset) return;
    const text = document.getElementById('output').value.trim();
    if (!text) { nodesDataset.clear(); edgesDataset.clear(); return; }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;
    const firstLine = lines[0].split(/\s+/).map(Number);
    const n = firstLine[0];
    if (isNaN(n) || n > 2000) return; 

    let newNodes = [];
    for (let i = 1; i <= n; i++) {
        let existingNode = nodesDataset.get(i);
        if (existingNode) { 
            newNodes.push(existingNode); 
        } else { 
            newNodes.push(getStyleObject({ id: i }, { label: String(i) })); 
        }
    }
    const currentNodesIds = nodesDataset.getIds();
    const nodesToRemove = currentNodesIds.filter(id => id > n);
    nodesDataset.remove(nodesToRemove);
    nodesDataset.update(newNodes);

    let newEdges = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            let edge = { from: parts[0], to: parts[1] };
            if (parts.length >= 3 && !isNaN(parts[2])) edge.label = String(parts[2]); 
            newEdges.push(edge);
        }
    }
    edgesDataset.clear();
    edgesDataset.add(newEdges);
}

// ==================== 3. 全局交互响应与面板控制 ====================

window.updateNodeSize = function(val) {
    if(network) { network.setOptions({ nodes: { font: { size: parseInt(val) } } }); }
}
window.updateEdgeLength = function(val) {
    if(network) { 
        network.setOptions({ physics: { forceAtlas2Based: { springLength: parseInt(val) } } });
        network.startSimulation(); 
    }
}

// 【修复】一键全部操作，必须通过 nodesDataset.get() 转为纯数组再 map
window.pinAll = function() {
    if(!nodesDataset) return;
    let updates = nodesDataset.get().map(node => getStyleObject(node, { isPinned: true }));
    nodesDataset.update(updates);
}

window.unpinAll = function() {
    if(!nodesDataset) return;
    let updates = nodesDataset.get().map(node => getStyleObject(node, { isPinned: false }));
    nodesDataset.update(updates);
}

// 【新增】树状自动排版引擎
window.formatAsTree = function() {
    if (!network || !nodesDataset) return;
    
    // 1. 临时开启层级结构引擎，关闭物理引擎以强制排版
    network.setOptions({
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'UD',       // Up-Down 纵向树
                sortMethod: 'directed',// 按照图连接寻找层级
                nodeSpacing: 100,
                levelSeparation: 100
            }
        },
        physics: { enabled: false }
    });

    // 2. 给予引擎 50ms 的时间瞬间计算坐标
    setTimeout(() => {
        let positions = network.getPositions();
        
        // 3. 恢复标准布局引擎
        network.setOptions({
            layout: { hierarchical: { enabled: false } },
            physics: { enabled: true }
        });

        // 4. 将所有节点赋予算出的树坐标，并强制固定（📌）
        let updates = nodesDataset.get().map(node => {
            let style = getStyleObject(node, { isPinned: true });
            if (positions[node.id]) {
                style.x = positions[node.id].x;
                style.y = positions[node.id].y;
            }
            return style;
        });
        nodesDataset.update(updates);
        
        // 5. 视角平滑居中适应
        network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
    }, 50);
}

window.closeContextMenu = function() {
    document.getElementById('contextMenu').style.display = 'none';
    contextNodeId = null;
}

window.selectColor = function(hexStr) {
    document.getElementById('nodeColorInput').value = hexStr;
    saveNodeConfig();
}

window.saveNodeConfig = function() {
    if (contextNodeId !== null) {
        updateNodeStyle(contextNodeId, {
            label: document.getElementById('nodeLabelInput').value.trim() || String(contextNodeId),
            customColor: document.getElementById('nodeColorInput').value
        });
        closeContextMenu();
    }
}

// 生成器业务逻辑
window.updateInputs = function() {
    const n = parseInt(document.getElementById('n').value);
    const mInput = document.getElementById('m');
    const maxwInput = document.getElementById('maxw');
    const type = document.getElementById('type').value;

    mInput.disabled = true; maxwInput.disabled = true;
    if (!isNaN(n)) mInput.max = Math.min(10000, n * (n - 1) / 2);
    if (type === 'graph') mInput.disabled = false;
    if (type === 'w_tree') maxwInput.disabled = false;
}

window.generateData = function() {
    let n = parseInt(document.getElementById('n').value);
    let m = parseInt(document.getElementById('m').value);
    let maxw = parseInt(document.getElementById('maxw').value);
    const type = document.getElementById('type').value;

    if (isNaN(n) || n < 1) n = 10;
    if (n > 300) { alert("为保证性能，可视化节点数暂时限制在 300 以内。"); n = 300; document.getElementById('n').value = 300; }

    let out = '';
    switch (type) {
        case 'tree': out = genTree(n); break;
        case 'chain': out = genChain(n); break;
        case 'daisy': out = genDaisy(n); break;
        case 'binary': out = genBinary(n); break;
        case 'graph': if (isNaN(m) || m < 0) m = n; out = genGraph(n, m); break;
        case 'w_tree': if (isNaN(maxw) || maxw < 1) maxw = 10; out = genWeightTree(n, maxw); break;
    }
    
    document.getElementById('output').value = out;
    renderGraphFromText();
}

window.copyOutput = function() {
    navigator.clipboard.writeText(document.getElementById('output').value).then(() => {
        const fb = document.getElementById('copyFeedback');
        fb.textContent = '已复制！'; fb.style.opacity = 1;
        setTimeout(() => fb.style.opacity = 0, 2000);
    });
}

// ==================== 4. 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    try {
        document.getElementById('type').addEventListener('change', () => { updateInputs(); generateData(); });
        updateInputs();
        initNetwork();
        generateData(); 
    } catch (error) {
        console.error(error);
        alert("应用加载失败，请按 Ctrl + F5 强制刷新浏览器。\n错误信息: " + error.message);
    }
});
