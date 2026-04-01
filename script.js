// ==================== 1. 数据结构生成算法 ====================
function rand(l, r) { return Math.floor(Math.random() * (r - l + 1)) + l; }
function insertSorted(arr, val) {
    let low = 0, high = arr.length - 1;
    while (low <= high) { let mid = Math.floor((low + high) / 2); if (arr[mid] < val) low = mid + 1; else high = mid - 1; }
    arr.splice(low, 0, val);
}

function getEdges_Tree(n) {
    if (n <= 1) return []; if (n === 2) return [[1, 2]];
    let edges = [], degree = new Array(n + 1).fill(1), sequence = [];
    for (let i = 0; i < n - 2; i++) { let node = rand(1, n); sequence.push(node); degree[node]++; }
    let leaves = []; for (let i = 1; i <= n; i++) if (degree[i] === 1) leaves.push(i);
    leaves.sort((a, b) => a - b);
    for (let i = 0; i < n - 2; i++) { let u = leaves.shift(), v = sequence[i]; edges.push([u, v]); if (--degree[v] === 1) insertSorted(leaves, v); }
    edges.push([leaves[0], leaves[1]]); return edges;
}
function getEdges_Chain(n) {
    let edges = []; for (let i = 1; i < n; i++) edges.push([i, i + 1]); return edges;
}
function getEdges_Daisy(n) {
    let edges = []; for (let i = 2; i <= n; i++) edges.push([1, i]); return edges;
}
function getEdges_Binary(n) {
    let edges = [];
    for (let i = 1; i <= n; i++) { if (i * 2 <= n) edges.push([i, i * 2]); if (i * 2 + 1 <= n) edges.push([i, i * 2 + 1]); }
    return edges;
}
function getEdges_Graph(n, m, isDirected) {
    let set = new Set(), edges = [];
    let maxEdges = isDirected ? n * (n - 1) : n * (n - 1) / 2;
    m = Math.min(m, maxEdges);
    while (set.size < m) {
        let u = rand(1, n), v = rand(1, n);
        if (u === v) continue;
        if (!isDirected && u > v) [u, v] = [v, u]; 
        let key = `${u}-${v}`;
        if (!set.has(key)) { set.add(key); edges.push([u, v]); }
    }
    return edges;
}

// ==================== 2. 全局状态与网络图核心 ====================

let nodesDataset = null;
let edgesDataset = null;
let network = null;
let contextNodeId = null;
let contextEdgeId = null;

function getStyleObject(node, updates) {
    node = node || {};
    let isPinned = updates.isPinned !== undefined ? updates.isPinned : (node.isPinned || false);
    let customBorder = updates.customColor !== undefined ? updates.customColor : (node.customColor || '#4e6ef2');
    let label = updates.label !== undefined ? updates.label : (node.label || '');

    return {
        id: node.id || updates.id, label: label, isPinned: isPinned, customColor: customBorder, fixed: isPinned,
        borderWidth: isPinned ? 4 : 2, borderWidthSelected: isPinned ? 4 : 2,
        color: { background: isPinned ? '#f3f4f6' : '#ffffff', border: customBorder, highlight: { background: isPinned ? '#e5e7eb' : '#f0f4ff', border: customBorder } },
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
        nodes: { shape: 'circle', mass: 2.5, borderWidth: 2, borderWidthSelected: 2, font: { color: '#333', size: initNodeSize, face: 'system-ui' }, shadow: true },
        edges: { color: { color: '#999', highlight: '#4e6ef2' }, width: 2, font: { size: 14, align: 'top', background: '#ffffff', strokeWidth: 3, strokeColor: '#ffffff' }, smooth: { type: 'continuous' }, arrows: { to: { enabled: false, scaleFactor: 0.8 } } },
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springConstant: 0.06, springLength: initEdgeLength, damping: 0.75, avoidOverlap: 0.5 }, stabilization: { iterations: 150 } },
        interaction: { hover: true, tooltipDelay: 200, multiselect: true }
    };

    network = new vis.Network(container, data, options);

    network.on("click", function (params) {
        if (params.event.srcEvent.shiftKey && params.nodes.length > 0) {
            updateNodeStyle(params.nodes[0], { isPinned: !nodesDataset.get(params.nodes[0]).isPinned });
            closeContextMenu(); return;
        }
        closeContextMenu();
    });

    network.on("dragStart", function(params) {
        closeContextMenu();
        if (params.nodes.length > 0) {
            const node = nodesDataset.get(params.nodes[0]);
            if (node && node.isPinned) nodesDataset.update({ id: node.id, fixed: false });
        }
    });
    network.on("dragEnd", function(params) {
        if (params.nodes.length > 0) {
            const node = nodesDataset.get(params.nodes[0]);
            if (node && node.isPinned) nodesDataset.update({ id: node.id, fixed: true });
        }
    });

    network.on("oncontext", function (params) {
        params.event.preventDefault(); 
        const nodeId = network.getNodeAt(params.pointer.DOM);
        const edgeId = network.getEdgeAt(params.pointer.DOM);
        
        if (nodeId !== undefined) {
            contextNodeId = nodeId; contextEdgeId = null;
            const node = nodesDataset.get(nodeId);
            document.getElementById('edgeContextMenu').style.display = 'none';
            const menu = document.getElementById('contextMenu');
            menu.style.left = (params.event.clientX + window.scrollX + 10) + 'px';
            menu.style.top = (params.event.clientY + window.scrollY + 10) + 'px';
            menu.style.display = 'flex';
            
            document.getElementById('nodeLabelInput').value = node.label || String(nodeId);
            document.getElementById('nodeColorInput').value = node.customColor || '#4e6ef2';
            setTimeout(() => { document.getElementById('nodeLabelInput').focus(); document.getElementById('nodeLabelInput').select(); }, 50); 
        } else if (edgeId !== undefined) {
            contextEdgeId = edgeId; contextNodeId = null;
            const edge = edgesDataset.get(edgeId);
            document.getElementById('contextMenu').style.display = 'none';
            const menu = document.getElementById('edgeContextMenu');
            menu.style.left = (params.event.clientX + window.scrollX + 10) + 'px';
            menu.style.top = (params.event.clientY + window.scrollY + 10) + 'px';
            menu.style.display = 'flex';
            
            document.getElementById('edgeLabelInput').value = edge.label || '';
            setTimeout(() => { document.getElementById('edgeLabelInput').focus(); document.getElementById('edgeLabelInput').select(); }, 50);
        } else {
            closeContextMenu();
        }
    });

    network.on("zoom", closeContextMenu);
}

// ==================== 3. 文本更新与核心物理修复 ====================

window.renderGraphFromText = function() {
    if (!nodesDataset || !edgesDataset) return;
    
    let isDirected = document.getElementById('isDirected').value === 'true';
    network.setOptions({ edges: { arrows: { to: { enabled: isDirected } } } });

    const text = document.getElementById('output').value.trim();
    if (!text) { nodesDataset.clear(); edgesDataset.clear(); return; }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;
    const n = lines[0].split(/\s+/).map(Number)[0];
    if (isNaN(n) || n > 2000) return; 

    let newNodes = [];
    for (let i = 1; i <= n; i++) {
        let existingNode = nodesDataset.get(i);
        newNodes.push(existingNode ? existingNode : getStyleObject({ id: i }, { label: String(i) }));
    }
    nodesDataset.remove(nodesDataset.getIds().filter(id => id > n));
    nodesDataset.update(newNodes);

    let newEdges = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            let edge = { from: parseInt(parts[0]), to: parseInt(parts[1]) };
            if (parts.length >= 3) { edge.label = parts.slice(2).join(' '); } 
            newEdges.push(edge);
        }
    }
    edgesDataset.clear();
    edgesDataset.add(newEdges);

    // 【关键修复】强制唤醒物理引擎！防止树形结构等低密度图因为坐标不变导致假死休眠。
    setTimeout(() => { if (network) network.startSimulation(); }, 10);
}

// ==================== 4. 快捷键与面板控制 ====================

// 快捷键: Alt + K + 字母 (变色/恢复)
let activeKeys = {};
document.addEventListener('keydown', e => {
    // 屏蔽在输入框里的误触
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    activeKeys[e.key.toLowerCase()] = true;
    activeKeys['alt'] = e.altKey;

    if (activeKeys['alt'] && activeKeys['k']) {
        let color = null;
        const key = e.key.toLowerCase();
        if (key === 'r') color = '#e63946';
        else if (key === 'b') color = '#4e6ef2';
        else if (key === 'g') color = '#2a9d8f';
        else if (key === 'y') color = '#f4a261';
        else if (key === 'p') color = '#9d4edd';
        else if (key === 'd') color = '#333333';

        if (color && network) {
            e.preventDefault();
            let selectedNodes = network.getSelectedNodes();
            if (selectedNodes.length > 0) {
                let updates = selectedNodes.map(id => {
                    let node = nodesDataset.get(id);
                    // 【智能切换逻辑】如果是该色则恢复默认蓝，否则变目标色
                    let newColor = (node.customColor === color) ? '#4e6ef2' : color;
                    return getStyleObject(node, { customColor: newColor });
                });
                nodesDataset.update(updates);
            }
        }
    }
});

document.addEventListener('keyup', e => {
    activeKeys[e.key.toLowerCase()] = false;
    activeKeys['alt'] = e.altKey;
});
window.addEventListener('blur', () => { activeKeys = {}; });

window.updateNodeSize = function(val) { if(network) { network.setOptions({ nodes: { font: { size: parseInt(val) } } }); } }
window.updateEdgeLength = function(val) { if(network) { network.setOptions({ physics: { forceAtlas2Based: { springLength: parseInt(val) } } }); network.startSimulation(); } }
window.pinAll = function() { if(!nodesDataset) return; nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: true }))); }
window.unpinAll = function() { if(!nodesDataset) return; nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: false }))); }

// 树形排版，并彻底修复解除后的假死
window.formatAsTree = function() {
    if (!network || !nodesDataset) return;
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    
    network.setOptions({
        layout: { hierarchical: { enabled: true, direction: 'UD', sortMethod: 'hubsize', nodeSpacing: currentEdgeLen * 1.2, levelSeparation: currentEdgeLen * 1.0 } },
        physics: { enabled: false }
    });

    setTimeout(() => {
        let positions = network.getPositions();
        // 彻底关闭层级布局，重置为力导向物理引擎
        network.setOptions({
            layout: { hierarchical: false },
            physics: { enabled: true, solver: 'forceAtlas2Based' }
        });

        let updates = nodesDataset.get().map(node => {
            let style = getStyleObject(node, { isPinned: true });
            if (positions[node.id]) { style.x = positions[node.id].x; style.y = positions[node.id].y; }
            return style;
        });
        nodesDataset.update(updates);
        network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
    }, 50);
}

window.closeContextMenu = function() {
    document.getElementById('contextMenu').style.display = 'none';
    document.getElementById('edgeContextMenu').style.display = 'none';
    contextNodeId = null; contextEdgeId = null;
}
window.selectColor = function(hexStr) { document.getElementById('nodeColorInput').value = hexStr; saveNodeConfig(); }

window.saveNodeConfig = function() {
    if (contextNodeId !== null) {
        updateNodeStyle(contextNodeId, { label: document.getElementById('nodeLabelInput').value.trim() || String(contextNodeId), customColor: document.getElementById('nodeColorInput').value });
        closeContextMenu();
    }
}

window.saveEdgeConfig = function() {
    if (contextEdgeId !== null) {
        let newWeight = document.getElementById('edgeLabelInput').value.trim();
        let edge = edgesDataset.get(contextEdgeId);
        edgesDataset.update({ id: contextEdgeId, label: newWeight });
        
        if (edge) {
