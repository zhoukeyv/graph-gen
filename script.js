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
function getEdges_Chain(n) { let edges = []; for (let i = 1; i < n; i++) edges.push([i, i + 1]); return edges; }
function getEdges_Daisy(n) { let edges = []; for (let i = 2; i <= n; i++) edges.push([1, i]); return edges; }
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

function darkenHex(hex, factor = 0.2) {
    if (!hex || !hex.startsWith('#')) return hex;
    let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
    r = Math.max(0, Math.floor(r * (1 - factor))); g = Math.max(0, Math.floor(g * (1 - factor))); b = Math.max(0, Math.floor(b * (1 - factor)));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ==================== 2. 全局状态与网络图核心 ====================

let nodesDataset = null;
let edgesDataset = null;
let network = null;
let contextNodeId = null;
let contextEdgeId = null;

// 平衡的物理受力模型，不再无限拉长边
const PHYSICS_CONFIG = {
    gravitationalConstant: -40, 
    centralGravity: 0.01,       
    springConstant: 0.08,       
    damping: 0.90,              
    avoidOverlap: 0.5 
};

window.forcePhysicsUpdate = function() {
    if (!network) return;
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    network.setOptions({
        edges: { smooth: { type: 'continuous' } }, 
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: Object.assign({}, PHYSICS_CONFIG, { springLength: currentEdgeLen }) }
    });
    network.startSimulation();
}

function getStyleObject(node, updates) {
    node = node || {};
    let isPinned = updates.isPinned !== undefined ? updates.isPinned : (node.isPinned || false);
    let customBorder = updates.customColor !== undefined ? updates.customColor : (node.customColor || '#4e6ef2');
    let label = updates.label !== undefined ? updates.label : (node.label || '');
    let hoverBorder = darkenHex(customBorder, 0.2); 

    return {
        id: node.id || updates.id, label: label, isPinned: isPinned, customColor: customBorder, 
        fixed: isPinned ? { x: true, y: true } : { x: false, y: false },
        borderWidth: isPinned ? 4 : 2, borderWidthSelected: isPinned ? 4 : 2,
        color: { 
            background: isPinned ? '#f3f4f6' : '#ffffff', border: customBorder, 
            highlight: { background: isPinned ? '#e5e7eb' : '#f0f4ff', border: customBorder },
            hover: { background: isPinned ? '#e5e7eb' : '#f8f9fa', border: hoverBorder } 
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
        nodes: { shape: 'circle', mass: 4.0, borderWidth: 2, borderWidthSelected: 2, font: { color: '#333', size: initNodeSize, face: 'system-ui' }, shadow: true },
        edges: { color: { color: '#999', highlight: '#4e6ef2' }, width: 2, font: { size: 14, align: 'top', background: '#ffffff', strokeWidth: 3, strokeColor: '#ffffff' }, smooth: { type: 'continuous' }, arrows: { to: { enabled: false, scaleFactor: 0.8 } } },
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: Object.assign({}, PHYSICS_CONFIG, { springLength: initEdgeLength }), stabilization: { iterations: 150 } },
        interaction: { hover: true, tooltipDelay: 200, multiselect: true }
    };

    network = new vis.Network(container, data, options);

    network.on("click", function (params) {
        if (params.event.srcEvent.shiftKey && params.nodes.length > 0) {
            updateNodeStyle(params.nodes[0], { isPinned: !nodesDataset.get(params.nodes[0]).isPinned });
            network.unselectAll(); 
            window.forcePhysicsUpdate(); 
            closeContextMenu(); return;
        }
        closeContextMenu();
    });

    network.on("dragStart", function(params) {
        closeContextMenu();
        if (params.nodes.length > 0) {
            const node = nodesDataset.get(params.nodes[0]);
            if (node && node.isPinned) nodesDataset.update({ id: node.id, fixed: { x: false, y: false } });
        }
    });
    network.on("dragEnd", function(params) {
        if (params.nodes.length > 0) {
            const node = nodesDataset.get(params.nodes[0]);
            if (node && node.isPinned) nodesDataset.update({ id: node.id, fixed: { x: true, y: true } });
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

// ==================== 3. 文本更新 ====================

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

    setTimeout(() => { window.forcePhysicsUpdate(); }, 10);
}

// ==================== 4. 面板控制、快捷键与 BFS树排版 ====================

document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    let color = null;
    if (e.code === 'KeyR') color = '#e63946';
    else if (e.code === 'KeyB') color = '#4e6ef2';
    else if (e.code === 'KeyG') color = '#2a9d8f';
    else if (e.code === 'KeyY') color = '#f4a261';
    else if (e.code === 'KeyP') color = '#9d4edd';
    else if (e.code === 'KeyD') color = '#333333';

    if (color && network) {
        let selectedNodes = network.getSelectedNodes();
        if (selectedNodes.length > 0) {
            e.preventDefault(); 
            let updates = selectedNodes.map(id => {
                let node = nodesDataset.get(id);
                let currentColor = node.customColor || '#4e6ef2';
                let newColor = (currentColor === color) ? '#4e6ef2' : color;
                return getStyleObject(node, { customColor: newColor });
            });
            nodesDataset.update(updates);
        }
    }
});

window.updateNodeSize = function(val) { if(network) { network.setOptions({ nodes: { font: { size: parseInt(val) } } }); } }
window.updateEdgeLength = function(val) { window.forcePhysicsUpdate(); }
window.pinAll = function() { if(!nodesDataset) return; nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: true }))); }
window.unpinAll = function() { if(!nodesDataset) return; nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: false }))); window.forcePhysicsUpdate(); }

window.formatAsTree = function() {
    if (!network || !nodesDataset) return;
    
    let rootInput = document.getElementById('treeRootInput').value;
    let rootId = parseInt(rootInput);
    if (isNaN(rootId) || !nodesDataset.get(rootId)) {
        alert(`图内未找到节点 [${rootInput}]，请检查后重试！`);
        return;
    }

    let adj = {};
    nodesDataset.getIds().forEach(id => adj[id] = []);
    edgesDataset.get().forEach(e => {
        adj[e.from].push(e.to);
        adj[e.to].push(e.from);
    });

    let levels = {};
    let q = [rootId];
    levels[rootId] = 0;

    while (q.length > 0) {
        let curr = q.shift();
        for (let nbr of adj[curr]) {
            if (levels[nbr] === undefined) {
                levels[nbr] = levels[curr] + 1;
                q.push(nbr);
            }
        }
    }

    let levelUpdates = nodesDataset.get().map(n => { return { id: n.id, level: levels[n.id] !== undefined ? levels[n.id] : 0 }; });
    nodesDataset.update(levelUpdates);

    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    
    network.setOptions({
        layout: { hierarchical: { enabled: true, direction: 'U
