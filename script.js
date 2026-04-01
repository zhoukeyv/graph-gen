// ==================== 1. 数据结构生成算法重构 (解耦权重与结构) ====================
function rand(l, r) { return Math.floor(Math.random() * (r - l + 1)) + l; }
function insertSorted(arr, val) {
    let low = 0, high = arr.length - 1;
    while (low <= high) { let mid = Math.floor((low + high) / 2); if (arr[mid] < val) low = mid + 1; else high = mid - 1; }
    arr.splice(low, 0, val);
}

// 基础边集获取
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
        if (!isDirected && u > v) [u, v] = [v, u]; // 无向图防重
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
        id: node.id || updates.id,
        label: label,
        isPinned: isPinned,
        customColor: customBorder,
        fixed: isPinned,
        borderWidth: isPinned ? 4 : 2,
        borderWidthSelected: isPinned ? 4 : 2,
        color: {
            background: isPinned ? '#f3f4f6' : '#ffffff',
            border: customBorder,
            highlight: { background: isPinned ? '#e5e7eb' : '#f0f4ff', border: customBorder }
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
            shape: 'circle', mass: 2.5, borderWidth: 2, borderWidthSelected: 2, 
            color: { background: '#ffffff', border: '#4e6ef2', highlight: { background: '#f0f4ff', border: '#3a5cd3' } },
            font: { color: '#333', size: initNodeSize, face: 'system-ui' }, shadow: true
        },
        edges: {
            color: { color: '#999', highlight: '#4e6ef2' },
            width: 2, font: { size: 14, align: 'top', background: '#ffffff', strokeWidth: 3, strokeColor: '#ffffff' }, 
            smooth: { type: 'continuous' },
            arrows: { to: { enabled: false, scaleFactor: 0.8 } } // 默认无向
        },
        physics: {
            enabled: true, solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springConstant: 0.06, springLength: initEdgeLength, damping: 0.75, avoidOverlap: 0.5 },
            stabilization: { iterations: 150 } 
        },
        interaction: { hover: true, tooltipDelay: 200, multiselect: true }
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
        } 
        else if (edgeId !== undefined) {
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

// 文本渲染 (并同步刷新箭头方向)
window.renderGraphFromText = function() {
    if (!nodesDataset || !edgesDataset) return;
    
    let isDirected = document.getElementById('isDirected').value === 'true';
    network.setOptions({ edges: { arrows: { to: { enabled: isDirected } } } });

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
        if (existingNode) { newNodes.push(existingNode); } 
        else { newNodes.push(getStyleObject({ id: i }, { label: String(i) })); }
    }
    const currentNodesIds = nodesDataset.getIds();
    const nodesToRemove = currentNodesIds.filter(id => id > n);
    nodesDataset.remove(nodesToRemove);
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
}

// ==================== 3. 快捷操作与事件绑定 ====================

// 快捷键: 换色
document.addEventListener('keydown', function(e) {
    if (e.altKey) {
        let color = null;
        switch(e.key.toLowerCase()) {
            case 'r': color = '#e63946'; break; // Red
            case 'b': color = '#4e6ef2'; break; // Blue
            case 'g': color = '#2a9d8f'; break; // Green
            case 'y': color = '#f4a261'; break; // Yellow
            case 'p': color = '#9d4edd'; break; // Purple
            case 'd': color = '#333333'; break; // Dark
        }
        if (color && network) {
            e.preventDefault();
            let selectedNodes = network.getSelectedNodes();
            if (selectedNodes.length > 0) {
                let updates = selectedNodes.map(id => getStyleObject(nodesDataset.get(id), { customColor: color }));
                nodesDataset.update(updates);
            }
        }
    }
});

window.updateNodeSize = function(val) {
    if(network) { network.setOptions({ nodes: { font: { size: parseInt(val) } } }); }
}
window.updateEdgeLength = function(val) {
    if(network) { 
        network.setOptions({ physics: { forceAtlas2Based: { springLength: parseInt(val) } } });
        network.startSimulation(); 
    }
}

window.pinAll = function() {
    if(!nodesDataset) return;
    nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: true })));
}

window.unpinAll = function() {
    if(!nodesDataset) return;
    nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: false })));
}

// 树形排版（间距完美跟随用户的弹簧长度设置）
window.formatAsTree = function() {
    if (!network || !nodesDataset) return;
    
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    
    network.setOptions({
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'UD',       
                sortMethod: 'hubsize', 
                nodeSpacing: currentEdgeLen * 1.2,    // 随用户设置放大/缩小
                levelSeparation: currentEdgeLen * 1.0 // 随用户设置放大/缩小
            }
        },
        physics: { enabled: false }
    });

    setTimeout(() => {
        let positions = network.getPositions();
        network.setOptions({
            layout: { hierarchical: { enabled: false } },
            physics: { enabled: true }
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

window.saveEdgeConfig = function() {
    if (contextEdgeId !== null) {
        let newWeight = document.getElementById('edgeLabelInput').value.trim();
        let edge = edgesDataset.get(contextEdgeId);
        edgesDataset.update({ id: contextEdgeId, label: newWeight });
        
        if (edge) {
            let text = document.getElementById('output').value;
            let lines = text.split('\n');
            let isDirected = document.getElementById('isDirected').value === 'true';
            
            for (let i = 1; i < lines.length; i++) {
                let parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 2) {
                    let u = parseInt(parts[0]), v = parseInt(parts[1]);
                    // 匹配边 (无向图允许反向匹配，有向图必须严格按 u->v 匹配)
                    let match = isDirected ? (u == edge.from && v == edge.to) 
                                           : ((u == edge.from && v == edge.to) || (u == edge.to && v == edge.from));
                    if (match) {
                        lines[i] = newWeight ? `${u} ${v} ${newWeight}` : `${u} ${v}`;
                        break; 
                    }
                }
            }
            document.getElementById('output').value = lines.join('\n');
        }
        closeContextMenu();
    }
}

// 三维下拉框的联动逻辑
window.updateInputs = function() {
    const n = parseInt(document.getElementById('n').value);
    const mInput = document.getElementById('m');
    const maxwInput = document.getElementById('maxw');
    
    const struct = document.getElementById('graphStructure').value;
    const isDirSelect = document.getElementById('isDirected');
    const isWSelect = document.getElementById('isWeighted');

    // 如果选了树的派生形态，则死锁为无向
    if (struct !== 'graph') {
        isDirSelect.value = "false";
        isDirSelect.disabled = true;
        mInput.disabled = true;
    } else {
        isDirSelect.disabled = false;
        mInput.disabled = false;
    }

    let isDir = isDirSelect.value === 'true';
    if (!isNaN(n)) mInput.max = isDir ? n * (n - 1) : Math.min(10000, n * (n - 1) / 2);
    
    maxwInput.disabled = (isWSelect.value === 'false');
    
    // 如果下拉框产生变化，同步修改箭头显示，但不重新生成数据，而是刷新一下现有渲染
    renderGraphFromText();
}

window.generateData = function() {
    let n = parseInt(document.getElementById('n').value);
    let m = parseInt(document.getElementById('m').value);
    let maxw = parseInt(document.getElementById('maxw').value);
    
    const struct = document.getElementById('graphStructure').value;
    const isDirected = (document.getElementById('isDirected').value === 'true');
    const isWeighted = (document.getElementById('isWeighted').value === 'true');

    if (isNaN(n) || n < 1) n = 10;
    if (n > 300) { alert("为保证性能，可视化节点数暂时限制在 300 以内。"); n = 300; document.getElementById('n').value = 300; }
    if (isNaN(m) || m < 0) m = n;
    if (isNaN(maxw) || maxw < 1) maxw = 10;

    let edges = [];
    switch (struct) {
        case 'tree': edges = getEdges_Tree(n); break;
        case 'chain': edges = getEdges_Chain(n); break;
        case 'daisy': edges = getEdges_Daisy(n); break;
        case 'binary': edges = getEdges_Binary(n); break;
        case 'graph': edges = getEdges_Graph(n, m, isDirected); break;
    }

    if (isWeighted) { edges = edges.map(e => [e[0], e[1], rand(1, maxw)]); }

    let out = struct === 'graph' ? `${n} ${edges.length}\n` : `${n}\n`;
    for(let e of edges) { out += e.join(' ') + '\n'; }
    
    document.getElementById('output').value = out.trim();
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
        ['graphStructure', 'isDirected', 'isWeighted'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => { updateInputs(); generateData(); });
        });
        document.getElementById('n').addEventListener('change', updateInputs);
        
        updateInputs();
        initNetwork();
        generateData(); 
    } catch (error) {
        console.error(error);
        alert("应用加载失败，请按 Ctrl + F5 强制刷新浏览器。\n错误信息: " + error.message);
    }
});
