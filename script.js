function rand(l, r) { return Math.floor(Math.random() * (r - l + 1)) + l; }
function insertSorted(arr, val) { let low = 0, high = arr.length - 1; while (low <= high) { let mid = Math.floor((low + high) / 2); if (arr[mid] < val) low = mid + 1; else high = mid - 1; } arr.splice(low, 0, val); }

function getEdges_Tree(n) { if (n <= 1) return []; if (n === 2) return [[1, 2]]; let edges = [], degree = new Array(n + 1).fill(1), sequence = []; for (let i = 0; i < n - 2; i++) { let node = rand(1, n); sequence.push(node); degree[node]++; } let leaves = []; for (let i = 1; i <= n; i++) if (degree[i] === 1) leaves.push(i); leaves.sort((a, b) => a - b); for (let i = 0; i < n - 2; i++) { let u = leaves.shift(), v = sequence[i]; edges.push([u, v]); if (--degree[v] === 1) insertSorted(leaves, v); } edges.push([leaves[0], leaves[1]]); return edges; }
function getEdges_Chain(n) { let edges = []; for (let i = 1; i < n; i++) edges.push([i, i + 1]); return edges; }
function getEdges_Daisy(n) { let edges = []; for (let i = 2; i <= n; i++) edges.push([1, i]); return edges; }

function getEdges_Binary(n) { 
    if (n <= 1) return [];
    let edges = [];
    let childCount = new Array(n + 1).fill(0);
    let available = [1];
    for (let i = 2; i <= n; i++) {
        let randIdx = rand(0, available.length - 1);
        let u = available[randIdx];
        edges.push([u, i]);
        childCount[u]++;
        if (childCount[u] === 2) available.splice(randIdx, 1);
        available.push(i);
    }
    return edges; 
}

function getEdges_Graph(n, m, isDirected) { let set = new Set(), edges = []; let maxEdges = isDirected ? n * (n - 1) : n * (n - 1) / 2; m = Math.min(m, maxEdges); while (set.size < m) { let u = rand(1, n), v = rand(1, n); if (u === v) continue; if (!isDirected && u > v) [u, v] = [v, u]; let key = `${u}-${v}`; if (!set.has(key)) { set.add(key); edges.push([u, v]); } } return edges; }

function getEdges_Cactus(n, m) {
    if (n <= 1) return [];
    let max_m = n - 1 + Math.floor((n - 1) / 2);
    m = Math.max(n - 1, Math.min(m, max_m)); 
    let extra_edges = m - (n - 1); 
    let edges = [], active = [1], unused = [];
    for (let i = 2; i <= n; i++) unused.push(i);
    unused.sort(() => Math.random() - 0.5);
    while (unused.length > 0) {
        let u = active[rand(0, active.length - 1)];
        if (unused.length >= 2 && extra_edges > 0) {
            let forced = (unused.length <= 2 * extra_edges);
            if (forced || Math.random() < 0.6) {
                let limit = Math.min(6, unused.length - 2 * (extra_edges - 1) + 1);
                let cycleLen = rand(3, Math.max(3, limit));
                let prev = u;
                for (let i = 0; i < cycleLen - 1; i++) {
                    let curr = unused.pop(); edges.push([prev, curr]); active.push(curr); prev = curr;
                    if (i === cycleLen - 2) edges.push([curr, u]);
                }
                extra_edges--; continue;
            }
        }
        let v = unused.pop(); edges.push([u, v]); active.push(v);
    }
    return edges;
}

function getEdges_Bipartite(n, m, isDirected) {
    let set1 = [], set2 = [];
    for (let i = 1; i <= n; i++) { if (Math.random() > 0.5) set1.push(i); else set2.push(i); }
    if (set1.length === 0) set1.push(set2.pop()); if (set2.length === 0) set2.push(set1.pop());
    let maxE = isDirected ? (set1.length * set2.length * 2) : (set1.length * set2.length); m = Math.min(m, maxE);
    let edges = [], existing = new Set(), attempts = 0;
    while (edges.length < m && attempts < m * 10) {
        attempts++; let u = set1[rand(0, set1.length - 1)], v = set2[rand(0, set2.length - 1)];
        if (isDirected && Math.random() > 0.5) [u, v] = [v, u];
        let key = isDirected ? `${u}->${v}` : (u < v ? `${u}-${v}` : `${v}-${u}`);
        if (!existing.has(key)) { existing.add(key); edges.push([u, v]); }
    }
    return edges;
}

function darkenHex(hex, factor = 0.2) { if (!hex || !hex.startsWith('#')) return hex; let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16); r = Math.max(0, Math.floor(r * (1 - factor))); g = Math.max(0, Math.floor(g * (1 - factor))); b = Math.max(0, Math.floor(b * (1 - factor))); return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }

let nodesDataset = null, edgesDataset = null, network = null, contextNodeId = null, contextEdgeId = null;
const PHYSICS_CONFIG = { gravitationalConstant: -40, centralGravity: 0.01, springConstant: 0.08, damping: 0.8 };

let isBCTreeMode = false;
let savedOriginalNodes = null;
let savedOriginalEdges = null;
let bcGeometricPositions = {}; 
let isBCTreeTreeLayout = false; 

window.forcePhysicsUpdate = function() {
    if (!network) return;
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    network.setOptions({ edges: { smooth: { type: 'continuous' } }, physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: Object.assign({}, PHYSICS_CONFIG, { springLength: currentEdgeLen }) } });
    network.startSimulation();
}

function getStyleObject(node, updates) {
    node = node || {};
    let isPinned = updates.isPinned !== undefined ? updates.isPinned : (node.isPinned || false);
    let customBorder = updates.customColor !== undefined ? updates.customColor : (node.customColor || '#4e6ef2');
    let label = updates.label !== undefined ? updates.label : (node.label || '');
    let shape = updates.shape !== undefined ? updates.shape : (node.shape || 'circle');
    let hoverBorder = darkenHex(customBorder, 0.2); 
    
    let colorObj;
    if (shape === 'square') {
        colorObj = { background: '#f4a261', border: '#e76f51', highlight: { background: '#f4a261', border: '#e76f51' }, hover: { background: '#e76f51', border: '#e76f51' } };
    } else {
        colorObj = updates.color || { background: isPinned ? '#f3f4f6' : '#ffffff', border: customBorder, highlight: { background: isPinned ? '#e5e7eb' : '#f0f4ff', border: customBorder }, hover: { background: isPinned ? '#e5e7eb' : '#f8f9fa', border: hoverBorder } };
    }
    
    return { id: node.id || updates.id, label: label, shape: shape, isPinned: isPinned, customColor: customBorder, fixed: isPinned ? { x: true, y: true } : { x: false, y: false }, borderWidth: isPinned ? 4 : 2, borderWidthSelected: isPinned ? 4 : 2, color: colorObj, shadow: isPinned ? { enabled: true, color: 'rgba(0,0,0,0.3)', size: 8, x: 2, y: 2 } : true };
}

function updateNodeStyle(nodeId, updates) { let node = nodesDataset.get(nodeId); if (!node) return; nodesDataset.update(getStyleObject(node, updates)); }

function initNetwork() {
    nodesDataset = new vis.DataSet(); edgesDataset = new vis.DataSet();
    const container = document.getElementById('mynetwork');
    const initNodeSize = parseInt(document.getElementById('nodeSize').value), initEdgeLength = parseInt(document.getElementById('edgeLength').value);
    const options = {
        nodes: { shape: 'circle', mass: 4.0, borderWidth: 2, borderWidthSelected: 2, font: { color: '#333', size: initNodeSize, face: 'Arial, sans-serif' }, shadow: true },
        edges: { color: { color: '#999', highlight: '#4e6ef2' }, width: 2, font: { size: 14, align: 'top', background: '#ffffff', strokeWidth: 3, strokeColor: '#ffffff' }, smooth: { type: 'continuous' }, arrows: { to: { enabled: false, scaleFactor: 0.8 } } },
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: Object.assign({}, PHYSICS_CONFIG, { springLength: initEdgeLength }), stabilization: { iterations: 150 } },
        interaction: { hover: true, tooltipDelay: 200, multiselect: true }
    };
    network = new vis.Network(container, { nodes: nodesDataset, edges: edgesDataset }, options);
    network.on("click", function (params) { if (isBCTreeMode) return; if (params.event.srcEvent.shiftKey && params.nodes.length > 0) { updateNodeStyle(params.nodes[0], { isPinned: !nodesDataset.get(params.nodes[0]).isPinned }); network.unselectAll(); window.forcePhysicsUpdate(); closeContextMenu(); return; } closeContextMenu(); });
    network.on("dragStart", function(params) { closeContextMenu(); if (params.nodes.length > 0) { const node = nodesDataset.get(params.nodes[0]); if (node && node.isPinned) nodesDataset.update({ id: node.id, fixed: { x: false, y: false } }); } });
    network.on("dragEnd", function(params) { if (params.nodes.length > 0) { const node = nodesDataset.get(params.nodes[0]); if (node && node.isPinned) nodesDataset.update({ id: node.id, fixed: { x: true, y: true } }); } });
    network.on("oncontext", function (params) {
        if (isBCTreeMode) { closeContextMenu(); return; }
        params.event.preventDefault(); const nodeId = network.getNodeAt(params.pointer.DOM); const edgeId = network.getEdgeAt(params.pointer.DOM);
        if (nodeId !== undefined) {
            contextNodeId = nodeId; contextEdgeId = null; const node = nodesDataset.get(nodeId); document.getElementById('edgeContextMenu').style.display = 'none'; const menu = document.getElementById('contextMenu'); menu.style.left = (params.event.clientX + window.scrollX + 10) + 'px'; menu.style.top = (params.event.clientY + window.scrollY + 10) + 'px'; menu.style.display = 'flex'; document.getElementById('nodeLabelInput').value = node.label || String(nodeId); document.getElementById('nodeColorInput').value = node.customColor || '#4e6ef2'; setTimeout(() => { document.getElementById('nodeLabelInput').focus(); document.getElementById('nodeLabelInput').select(); }, 50); 
        } else if (edgeId !== undefined) {
            contextEdgeId = edgeId; contextNodeId = null; const edge = edgesDataset.get(edgeId); document.getElementById('contextMenu').style.display = 'none'; const menu = document.getElementById('edgeContextMenu'); menu.style.left = (params.event.clientX + window.scrollX + 10) + 'px'; menu.style.top = (params.event.clientY + window.scrollY + 10) + 'px'; menu.style.display = 'flex'; document.getElementById('edgeLabelInput').value = edge.label || ''; setTimeout(() => { document.getElementById('edgeLabelInput').focus(); document.getElementById('edgeLabelInput').select(); }, 50);
        } else { closeContextMenu(); }
    });
    network.on("zoom", closeContextMenu);
}

function updateLayoutButtonsVisibility() {
    const treeBox = document.getElementById('treeLayoutBox'), bipBtn = document.getElementById('bipartiteLayoutBtn'), cactusBox = document.getElementById('cactusLayoutBox'), bcTreeBtn = document.getElementById('bcTreeBtn');
    if (!nodesDataset || !edgesDataset || !treeBox || !bipBtn || !cactusBox) return;

    const nodes = nodesDataset.getIds().map(String), edges = edgesDataset.get(), n = nodes.length;
    if (n === 0) { treeBox.style.display = 'none'; bipBtn.style.display = 'none'; cactusBox.style.display = 'none'; bcTreeBtn.style.display = 'none'; return; }

    let adj = {}, edgeCount = 0, seenEdges = new Set();
    nodes.forEach(id => adj[id] = []);
    edges.forEach(e => {
        let u = String(e.from), v = String(e.to);
        if (u === v) { adj[u].push(u); } 
        else { let key = u < v ? `${u}-${v}` : `${v}-${u}`; if (!seenEdges.has(key)) { seenEdges.add(key); edgeCount++; } adj[u].push(v); adj[v].push(u); }
    });

    let isBipartite = true, color = {}, connectedComponents = 0;
    for (let i = 0; i < n; i++) {
        let startNode = nodes[i];
        if (color[startNode] === undefined) {
            connectedComponents++; let q = [startNode]; color[startNode] = 0;
            while (q.length > 0) {
                let u = q.shift();
                for (let v of adj[u]) { if (color[v] === undefined) { color[v] = 1 - color[u]; q.push(v); } else if (color[v] === color[u]) { isBipartite = false; } }
            }
        }
    }

    let isTree = (connectedComponents === 1 && edgeCount === n - 1);
    let isCactus = connectedComponents === 1; 
    let dfn = {}, parent = {}, timer = 0, edgeCycleCount = {};
    function getEdgeKey(u, v) { return u < v ? `${u}-${v}` : `${v}-${u}`; }
    if (isCactus) {
        function dfs(u, p) {
            dfn[u] = ++timer; parent[u] = p;
            for (let v of adj[u]) {
                if (v === p) continue;
                if (dfn[v]) {
                    if (dfn[v] < dfn[u]) { 
                        let curr = u, cycleEdges = [getEdgeKey(u, v)];
                        while (curr !== v && curr !== null) { let pNode = parent[curr]; if (pNode) cycleEdges.push(getEdgeKey(curr, pNode)); curr = pNode; }
                        for (let ek of cycleEdges) { edgeCycleCount[ek] = (edgeCycleCount[ek] || 0) + 1; if (edgeCycleCount[ek] > 1) isCactus = false; }
                    }
                } else { dfs(v, u); }
            }
        }
        if (!dfn[nodes[0]]) dfs(nodes[0], null);
    }

    let showCactus = isCactus;
    
    treeBox.style.display = isTree ? '' : 'none';
    bipBtn.style.display = isBipartite ? '' : 'none';
    cactusBox.style.display = showCactus ? '' : 'none'; 
    bcTreeBtn.style.display = showCactus ? '' : 'none';
}

function calculateCactusPositions(nodes, edges) {
    let blocks = getCactusBlocks(nodes, edges);
    let nodeToBlocks = {}; nodes.forEach(n => nodeToBlocks[n] = []);
    blocks.forEach((b, i) => { b.nodes.forEach(n => nodeToBlocks[n].push(i)); });
    
    let startNode = nodes[0], maxBlocks = -1;
    nodes.forEach(u => {
        let bCount = nodeToBlocks[u].length;
        if (bCount > maxBlocks) { maxBlocks = bCount; startNode = u; }
    });

    let nodeWeight = {}, blockWeight = {};
    function computeWeight(u, pBlock) {
        let w = 1; let childBlocks = nodeToBlocks[u].filter(bIdx => bIdx !== pBlock);
        for (let bIdx of childBlocks) {
            let b = blocks[bIdx], bw = 0;
            for (let v of b.nodes) { if (v !== u) bw += computeWeight(v, bIdx); }
            blockWeight[bIdx] = bw; w += bw;
        }
        nodeWeight[u] = w; return w;
    }
    computeWeight(startNode, -1);
    
    let pos = {}, placedNodes = new Set();
    pos[startNode] = { x: 0, y: 0 }; placedNodes.add(startNode);
    const L_0 = (parseInt(document.getElementById('edgeLength').value) || 100) * 1.2;
    
    function layoutNode(u, pBlock, baseAngle, angleRange) {
        let childBlocks = nodeToBlocks[u].filter(bIdx => bIdx !== pBlock);
        if (childBlocks.length === 0) return;
        let totalW = childBlocks.reduce((sum, bIdx) => sum + blockWeight[bIdx], 0);
        let currentAngle = baseAngle - angleRange / 2;
        
        for (let bIdx of childBlocks) {
            let b = blocks[bIdx];
            let bw = blockWeight[bIdx];
            let bRange = angleRange * (bw / totalW); 
            let bAngle = currentAngle + bRange / 2;
            
            if (b.type === 'bridge') {
                let v = b.nodes[0] === u ? b.nodes[1] : b.nodes[0];
                if (!placedNodes.has(v)) {
                    pos[v] = { x: pos[u].x + L_0 * Math.cos(bAngle), y: pos[u].y + L_0 * Math.sin(bAngle) };
                    placedNodes.add(v);
                    layoutNode(v, bIdx, bAngle, bRange);
                }
            } else {
                let K = b.nodes.length; let idx = b.nodes.indexOf(u); let seq = [];
                for (let i = 0; i < K; i++) seq.push(b.nodes[(idx + i) % K]);
                
                let R = L_0 / (2 * Math.sin(Math.PI / K)); 
                let cx = pos[u].x + R * Math.cos(bAngle);
                let cy = pos[u].y + R * Math.sin(bAngle);
                let phi_0 = bAngle + Math.PI;
                let sumVWeights = 0;
                for (let i = 1; i < K; i++) sumVWeights += nodeWeight[seq[i]];
                if(sumVWeights === 0) sumVWeights = 1;
                
                for (let i = 1; i < K; i++) {
                    let v = seq[i];
                    let phi_i = phi_0 + i * (2 * Math.PI / K);
                    if (!placedNodes.has(v)) {
                        pos[v] = { x: cx + R * Math.cos(phi_i), y: cy + R * Math.sin(phi_i) };
                        placedNodes.add(v);
                        let vW = nodeWeight[v]; let vRange = bRange * (vW / sumVWeights);
                        vRange = Math.min(vRange, 2 * Math.PI * 0.8); 
                        layoutNode(v, bIdx, phi_i, vRange);
                    }
                }
            }
            currentAngle += bRange;
        }
    }
    layoutNode(startNode, -1, 0, 2 * Math.PI);
    return { pos, blocks };
}

window.formatAsCactus = function() {
    if (!network || !nodesDataset) return;
    let nodes = nodesDataset.getIds().map(String), edges = edgesDataset.get();
    let { pos } = calculateCactusPositions(nodes, edges);
    
    network.setOptions({ physics: { enabled: false } });
    let updates = nodesDataset.get().map(node => { 
        let style = getStyleObject(node, { isPinned: true }); 
        if (pos[node.id]) { style.x = pos[node.id].x; style.y = pos[node.id].y; } 
        return style; 
    });
    nodesDataset.update(updates); 
    window.forcePhysicsUpdate(); 
    network.fit({ animation: { duration: 600 } });
}

window.toggleBCTreeMode = function() {
    const btn = document.getElementById('bcTreeBtn');
    const layoutBox = document.getElementById('bcTreeLayoutBox');

    if (isBCTreeMode) {
        isBCTreeMode = false;
        btn.innerText = "圆方树展示";
        btn.style.backgroundColor = ""; 
        layoutBox.style.display = "none"; 
        bcGeometricPositions = {};
        setUIElementsLock(false);
        
        nodesDataset.clear(); edgesDataset.clear();
        nodesDataset.add(savedOriginalNodes);
        edgesDataset.add(savedOriginalEdges);
        savedOriginalNodes = null; savedOriginalEdges = null;
        
        // 取消圆方树时，自动执行一次仙人掌排版
        window.formatAsCactus();
        return;
    }

    isBCTreeMode = true;
    isBCTreeTreeLayout = false; 
    btn.innerText = "取消";
    btn.style.backgroundColor = "#e63946"; 
    
    layoutBox.style.display = "flex";
    document.getElementById('bcTreeLayoutBtn').innerText = "树";
    setUIElementsLock(true);

    let nodesStr = nodesDataset.getIds().map(String);
    let originalEdges = edgesDataset.get();

    let defaultRoot = nodesStr.includes("1") ? "1" : nodesStr[0];
    document.getElementById('bcTreeRootInput').value = defaultRoot;

    let { pos, blocks } = calculateCactusPositions(nodesStr, originalEdges);
    let currentPositions = network.getPositions();
    savedOriginalNodes = nodesDataset.get().map(n => { 
        let clone = Object.assign({}, n); 
        if(currentPositions[n.id]) { clone.x = currentPositions[n.id].x; clone.y = currentPositions[n.id].y; } 
        return clone; 
    });
    savedOriginalEdges = originalEdges;

    let newNodes = [], newEdges = [];
    savedOriginalNodes.forEach(n => {
        let clone = Object.assign({}, n);
        clone.shape = 'circle'; 
        clone.isPinned = true;
        clone.fixed = {x: true, y: true}; 
        if (pos[n.id]) { clone.x = pos[n.id].x; clone.y = pos[n.id].y; }
        clone.color = { background: '#ffffff', border: clone.customColor || '#4e6ef2' };
        newNodes.push(clone);
    });

    let baseSize = parseInt(document.getElementById('nodeSize').value) || 20;

    blocks.forEach((b, i) => {
        let sqId = `_square_${i}`;
        let cx = 0, cy = 0;
        b.nodes.forEach(u => { cx += pos[u].x; cy += pos[u].y; });
        cx /= b.nodes.length; cy /= b.nodes.length;

        newNodes.push({
            id: sqId, label: '', shape: 'square',
            size: baseSize * 0.7,
            color: { background: '#f4a261', border: '#e76f51', highlight: { background: '#f4a261', border: '#e76f51' } },
            fixed: {x: true, y: true},
            x: cx, y: cy,
            isPinned: true,
            shadow: { enabled: true, color: 'rgba(0,0,0,0.3)', size: 8, x: 2, y: 2 }
        });

        b.nodes.forEach(u => {
            newEdges.push({ from: sqId, to: u, color: { color: '#e76f51' }, width: 3, dashes: true, smooth: { type: 'continuous' } });
        });
    });

    edgesDataset.clear(); nodesDataset.clear();
    nodesDataset.add(newNodes); edgesDataset.add(newEdges);
    
    bcGeometricPositions = {};
    newNodes.forEach(n => { bcGeometricPositions[n.id] = { x: n.x, y: n.y }; });

    network.setOptions({ physics: { enabled: false } }); 
    network.fit({ animation: { duration: 600 } });
}

window.applyBCTreeTreeLayout = function() {
    let nodes = nodesDataset.getIds();
    let rootId = document.getElementById('bcTreeRootInput').value.trim();
    
    if (!rootId || !nodes.includes(rootId)) {
        alert(`未在当前图中找到节点 [${rootId}]！\n你可以输入任意圆点编号，或方点编号（如 _square_0）。`);
        return false;
    }

    let adj = {}; nodes.forEach(id => adj[id] = []);
    edgesDataset.get().forEach(e => { adj[e.from].push(e.to); adj[e.to].push(e.from); });

    let levels = {}, q = [rootId]; levels[rootId] = 0;
    while (q.length > 0) {
        let curr = q.shift();
        for (let nbr of adj[curr]) {
            if (levels[nbr] === undefined) { levels[nbr] = levels[curr] + 1; q.push(nbr); }
        }
    }

    nodesDataset.update(nodesDataset.get().map(n => ({ id: n.id, level: levels[n.id] !== undefined ? levels[n.id] : 0 })));

    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    network.setOptions({
        layout: { 
            hierarchical: { 
                enabled: true, 
                direction: 'UD', 
                sortMethod: 'directed', 
                nodeSpacing: currentEdgeLen * 0.8,
                levelSeparation: currentEdgeLen * 0.9
            } 
        },
        physics: { enabled: false }
    });

    setTimeout(() => {
        let positions = network.getPositions();
        network.setOptions({ layout: { hierarchical: { enabled: false } } });
        nodesDataset.update(nodesDataset.get().map(node => {
            let style = getStyleObject(node, { isPinned: true });
            if (positions[node.id]) { style.x = positions[node.id].x; style.y = positions[node.id].y; }
            return style;
        }));
        network.fit({ animation: { duration: 600 } });
    }, 50);

    return true;
}

window.toggleBCTreeLayout = function() {
    if (!network || !nodesDataset || !isBCTreeMode) return;
    const btn = document.getElementById('bcTreeLayoutBtn');

    if (isBCTreeTreeLayout) {
        network.setOptions({ layout: { hierarchical: { enabled: false } }, physics: { enabled: false } });
        let updates = nodesDataset.get().map(node => {
            let style = getStyleObject(node, { isPinned: true });
            if (bcGeometricPositions[node.id]) {
                style.x = bcGeometricPositions[node.id].x;
                style.y = bcGeometricPositions[node.id].y;
            }
            return style;
        });
        nodesDataset.update(updates);
        network.fit({ animation: { duration: 600 } });
        
        btn.innerText = "树";
        isBCTreeTreeLayout = false;
    } else {
        if (applyBCTreeTreeLayout()) {
            btn.innerText = "取消";
            isBCTreeTreeLayout = true;
        }
    }
}

window.updateBCTreeLayoutRoot = function() {
    if (isBCTreeMode && isBCTreeTreeLayout) {
        applyBCTreeTreeLayout();
    }
}

function setUIElementsLock(locked) {
    document.getElementById('output').disabled = locked;
    document.getElementById('n').disabled = locked;
    document.getElementById('m').disabled = locked;
    document.getElementById('graphStructure').disabled = locked;
    document.getElementById('isDirected').disabled = locked;
    document.getElementById('isWeighted').disabled = locked;
    document.getElementById('btnGenerate').disabled = locked;
    
    let opacity = locked ? '0.4' : '1';
    let ptrEvents = locked ? 'none' : 'auto';
    
    const elementsToLock = ['treeLayoutBox', 'cactusLayoutBox', 'bipartiteLayoutBtn', 'nodeSize', 'edgeLength'];
    elementsToLock.forEach(id => { let el = document.getElementById(id); if (el) { el.style.opacity = opacity; el.style.pointerEvents = ptrEvents; } });
}

function getCactusBlocks(nodes, edges) {
    let adj = {}; nodes.forEach(n => adj[n] = []);
    edges.forEach(e => { let u = String(e.from), v = String(e.to); if (u !== v) { adj[u].push(v); adj[v].push(u); } });
    let dfn = {}, parent = {}, timer = 0, edgeToBlock = {}, blocks = [];
    function getEdgeKey(u, v) { return u < v ? `${u}-${v}` : `${v}-${u}`; }
    function dfs(u, p) {
        dfn[u] = ++timer; parent[u] = p;
        for (let v of adj[u]) {
            if (v === p) continue;
            if (dfn[v]) {
                if (dfn[v] < dfn[u]) { 
                    let cyc = [v], curr = u, cycleEdges = [getEdgeKey(u, v)];
                    while (curr !== v && curr !== null) { cyc.push(curr); let pNode = parent[curr]; if (pNode) cycleEdges.push(getEdgeKey(curr, pNode)); curr = pNode; }
                    blocks.push({ type: 'cycle', nodes: cyc }); let bIdx = blocks.length - 1;
                    for (let ek of cycleEdges) { edgeToBlock[ek] = bIdx; }
                }
            } else { dfs(v, u); }
        }
    }
    for (let u of nodes) { if (!dfn[u]) dfs(u, null); }
    edges.forEach(e => {
        let u = String(e.from), v = String(e.to); if (u === v) return;
        let ek = getEdgeKey(u, v);
        if (edgeToBlock[ek] === undefined) { blocks.push({ type: 'bridge', nodes: [u, v] }); edgeToBlock[ek] = blocks.length - 1; }
    });
    return blocks;
}

window.renderGraphFromText = function() {
    if (isBCTreeMode) return;
    if (!nodesDataset || !edgesDataset) return;
    let isDirected = document.getElementById('isDirected').value === 'true'; 
    network.setOptions({ edges: { arrows: { to: { enabled: isDirected } } } });
    
    const text = document.getElementById('output').value.trim(); 
    if (!text) { nodesDataset.clear(); edgesDataset.clear(); updateLayoutButtonsVisibility(); return; }
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== ''); 
    if (lines.length === 0) { nodesDataset.clear(); edgesDataset.clear(); updateLayoutButtonsVisibility(); return; }

    let uniqueNodes = new Set(), newEdges = [];
    let seenEdges = new Set(); 

    lines.forEach(line => {
        const parts = line.split(/\s+/);
        if (parts.length === 1) { 
            uniqueNodes.add(parts[0]); 
        } 
        else if (parts.length >= 2) {
            let u = String(parts[0]), v = String(parts[1]);
            uniqueNodes.add(u); uniqueNodes.add(v);
            
            let edgeKey = isDirected ? `${u}->${v}` : (u < v ? `${u}-${v}` : `${v}-${u}`);
            
            if (!seenEdges.has(edgeKey)) {
                seenEdges.add(edgeKey);
                let edge = { from: u, to: v };
                if (parts.length >= 3) edge.label = parts.slice(2).join(' ');
                newEdges.push(edge);
            }
        }
    });

    let currentIds = new Set(nodesDataset.getIds().map(String));
    let nodesToAdd = [];
    uniqueNodes.forEach(id => { if (!currentIds.has(id)) nodesToAdd.push(getStyleObject({ id: id, label: id }, {})); });
    let nodeIdsToRemove = Array.from(currentIds).filter(id => !uniqueNodes.has(id));
    if (nodeIdsToRemove.length > 0) nodesDataset.remove(nodeIdsToRemove);
    if (nodesToAdd.length > 0) nodesDataset.add(nodesToAdd);

    edgesDataset.clear(); edgesDataset.add(newEdges); 
    updateLayoutButtonsVisibility();
    setTimeout(() => { window.forcePhysicsUpdate(); }, 10);
}

document.addEventListener('keydown', e => {
    if (isBCTreeMode) return;
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    let color = null; if (e.code === 'KeyR') color = '#e63946'; else if (e.code === 'KeyB') color = '#4e6ef2'; else if (e.code === 'KeyG') color = '#2a9d8f'; else if (e.code === 'KeyY') color = '#f4a261'; else if (e.code === 'KeyP') color = '#9d4edd'; else if (e.code === 'KeyD') color = '#333333';
    if (color && network) { let selectedNodes = network.getSelectedNodes(); if (selectedNodes.length > 0) { e.preventDefault(); let updates = selectedNodes.map(id => { let node = nodesDataset.get(id); let currentColor = node.customColor || '#4e6ef2'; return getStyleObject(node, { customColor: (currentColor === color) ? '#4e6ef2' : color }); }); nodesDataset.update(updates); } }
});

window.updateNodeSize = function(val) { if(network) { network.setOptions({ nodes: { font: { size: parseInt(val) } } }); } }
window.updateEdgeLength = function(val) { window.forcePhysicsUpdate(); }
window.pinAll = function() { if(!nodesDataset) return; nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: true }))); }
window.unpinAll = function() { if(!nodesDataset) return; nodesDataset.update(nodesDataset.get().map(node => getStyleObject(node, { isPinned: false }))); window.forcePhysicsUpdate(); }

window.formatAsTree = function() {
    if (!network || !nodesDataset) return;
    let rootId = document.getElementById('treeRootInput').value.trim();
    if (!rootId || !nodesDataset.get(rootId)) { alert(`未找到节点 [${rootId}]！`); return; }
    let adj = {}; nodesDataset.getIds().forEach(id => adj[id] = []);
    edgesDataset.get().forEach(e => { adj[e.from].push(e.to); adj[e.to].push(e.from); });
    let levels = {}, q = [rootId]; levels[rootId] = 0;
    while (q.length > 0) { let curr = q.shift(); for (let nbr of adj[curr]) { if (levels[nbr] === undefined) { levels[nbr] = levels[curr] + 1; q.push(nbr); } } }
    nodesDataset.update(nodesDataset.get().map(n => { return { id: n.id, level: levels[n.id] !== undefined ? levels[n.id] : 0 }; }));
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    network.setOptions({ layout: { hierarchical: { enabled: true, direction: 'UD', sortMethod: 'directed', nodeSpacing: currentEdgeLen * 1.2, levelSeparation: currentEdgeLen * 1.0 } }, physics: { enabled: false } });
    setTimeout(() => { let positions = network.getPositions(); network.setOptions({ layout: { hierarchical: { enabled: false } } }); nodesDataset.update(nodesDataset.get().map(node => { let style = getStyleObject(node, { isPinned: true }); if (positions[node.id]) { style.x = positions[node.id].x; style.y = positions[node.id].y; } return style; })); window.forcePhysicsUpdate(); network.fit({ animation: { duration: 600 } }); }, 50);
}

window.formatAsBipartite = function() {
    if (!network || !nodesDataset) return;
    let adj = {}; nodesDataset.getIds().forEach(id => adj[id] = []);
    edgesDataset.get().forEach(e => { adj[e.from].push(e.to); adj[e.to].push(e.from); });
    let color = {};
    nodesDataset.getIds().forEach(startNode => {
        if (color[startNode] === undefined) {
            let q = [startNode]; color[startNode] = 0;
            while(q.length > 0) {
                let u = q.shift();
                adj[u].forEach(v => { if (color[v] === undefined) { color[v] = 1 - color[u]; q.push(v); } });
            }
        }
    });
    nodesDataset.update(nodesDataset.get().map(n => ({ id: n.id, level: color[n.id] !== undefined ? color[n.id] : 0 })));
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    network.setOptions({ layout: { hierarchical: { enabled: true, direction: 'LR', sortMethod: 'directed', levelSeparation: currentEdgeLen * 2.5, nodeSpacing: currentEdgeLen } }, physics: { enabled: false } });
    setTimeout(() => { let positions = network.getPositions(); network.setOptions({ layout: { hierarchical: { enabled: false } } }); nodesDataset.update(nodesDataset.get().map(node => { let style = getStyleObject(node, { isPinned: true }); if (positions[node.id]) { style.x = positions[node.id].x; style.y = positions[node.id].y; } return style; })); window.forcePhysicsUpdate(); network.fit({ animation: { duration: 600 } }); }, 50);
}

window.closeContextMenu = function() { document.getElementById('contextMenu').style.display = 'none'; document.getElementById('edgeContextMenu').style.display = 'none'; contextNodeId = null; contextEdgeId = null; }
window.selectColor = function(hexStr) { document.getElementById('nodeColorInput').value = hexStr; saveNodeConfig(); }
window.saveNodeConfig = function() { if (contextNodeId !== null) { updateNodeStyle(contextNodeId, { label: document.getElementById('nodeLabelInput').value.trim() || String(contextNodeId), customColor: document.getElementById('nodeColorInput').value }); closeContextMenu(); } }
window.saveEdgeConfig = function() {
    if (contextEdgeId !== null) {
        let newWeight = document.getElementById('edgeLabelInput').value.trim(); let edge = edgesDataset.get(contextEdgeId); edgesDataset.update({ id: contextEdgeId, label: newWeight });
        if (edge) {
            let lines = document.getElementById('output').value.split('\n'); let isDirected = document.getElementById('isDirected').value === 'true';
            for (let i = 0; i < lines.length; i++) {
                let parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 2) { 
                    let u = String(parts[0]), v = String(parts[1]); 
                    let match = isDirected ? (u === String(edge.from) && v === String(edge.to)) : ((u === String(edge.from) && v === String(edge.to)) || (u === String(edge.to) && v === String(edge.from))); 
                    if (match) { lines[i] = newWeight ? `${u} ${v} ${newWeight}` : `${u} ${v}`; break; } 
                }
            }
            document.getElementById('output').value = lines.join('\n');
        }
        closeContextMenu();
    }
}

window.updateInputs = function() {
    const n = parseInt(document.getElementById('n').value), mInput = document.getElementById('m'), maxwInput = document.getElementById('maxw'), struct = document.getElementById('graphStructure').value, isDirSelect = document.getElementById('isDirected'), isWSelect = document.getElementById('isWeighted');
    
    if (['graph', 'bipartite', 'cactus'].includes(struct)) { 
        mInput.disabled = false; 
        if (struct === 'cactus') { isDirSelect.value = "false"; isDirSelect.disabled = true; } else { isDirSelect.disabled = false; }
    } else { isDirSelect.value = "false"; isDirSelect.disabled = true; mInput.disabled = true; }
    
    let isDir = isDirSelect.value === 'true'; 
    if (!isNaN(n)) {
        if (struct === 'cactus') {
            mInput.min = n > 0 ? n - 1 : 0; let maxCactusM = n > 0 ? n - 1 + Math.floor((n - 1) / 2) : 0; mInput.max = maxCactusM;
            if (parseInt(mInput.value) < mInput.min) mInput.value = mInput.min; if (parseInt(mInput.value) > mInput.max) mInput.value = mInput.max;
        } else { mInput.min = 0; mInput.max = isDir ? n * (n - 1) : Math.min(10000, n * (n - 1) / 2); }
    }
    maxwInput.disabled = (isWSelect.value === 'false');
    renderGraphFromText();
}

window.generateData = function() {
    let n = parseInt(document.getElementById('n').value), m = parseInt(document.getElementById('m').value), maxw = parseInt(document.getElementById('maxw').value);
    const struct = document.getElementById('graphStructure').value, isDirected = (document.getElementById('isDirected').value === 'true'), isWeighted = (document.getElementById('isWeighted').value === 'true');
    if (isNaN(n) || n < 1) n = 10; if (n > 300) { alert("节点数暂时限制在 300 以内。"); n = 300; document.getElementById('n').value = 300; }
    if (isNaN(m) || m < 0) m = n; if (isNaN(maxw) || maxw < 1) maxw = 10;
    let edges = [];
    switch (struct) { 
        case 'tree': edges = getEdges_Tree(n); break; 
        case 'chain': edges = getEdges_Chain(n); break; 
        case 'daisy': edges = getEdges_Daisy(n); break; 
        case 'binary': edges = getEdges_Binary(n); break; 
        case 'cactus': edges = getEdges_Cactus(n, m); break;
        case 'bipartite': edges = getEdges_Bipartite(n, m, isDirected); break;
        case 'graph': edges = getEdges_Graph(n, m, isDirected); break; 
    }
    if (isWeighted) edges = edges.map(e => [e[0], e[1], rand(1, maxw)]);
    let out = "", generatedNodes = new Set();
    for(let e of edges) { out += e.join(' ') + '\n'; generatedNodes.add(String(e[0])); generatedNodes.add(String(e[1])); }
    for (let i = 1; i <= n; i++) { if (!generatedNodes.has(String(i))) { out += i + '\n'; } }
    document.getElementById('output').value = out.trim(); renderGraphFromText();
}

window.copyOutput = function() { navigator.clipboard.writeText(document.getElementById('output').value).then(() => { const fb = document.getElementById('copyFeedback'); fb.textContent = '已复制！'; fb.style.opacity = 1; setTimeout(() => fb.style.opacity = 0, 2000); }); }

// ====== 新增：导出图片逻辑 ======
window.exportImage = function(format) {
    if (!network) return;
    
    const container = document.getElementById('mynetwork');
    const canvas = container.getElementsByTagName('canvas')[0];
    if (!canvas) {
        alert("无法获取画布内容，请稍后重试！");
        return;
    }

    let dataURL;
    if (format === 'jpeg') {
        // JPG 不支持透明度，直接导出透明背景会变成黑色。因此需要建立临时画布填充白底
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff'; // 填充白色背景
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        
        dataURL = tempCanvas.toDataURL('image/jpeg', 1.0);
    } else {
        // PNG 默认支持透明度，直接导出
        dataURL = canvas.toDataURL('image/png');
    }

    // 创建虚拟 a 标签触发下载
    const a = document.createElement('a');
    a.href = dataURL;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `Graph_${timestamp}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
// =================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof vis === 'undefined') { alert('网络库加载失败，请检查网络或更换 CDN。'); return; }
        initNetwork(); 
        ['graphStructure', 'isDirected', 'isWeighted'].forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('change', () => { updateInputs(); generateData(); }); });
        const elN = document.getElementById('n'); if(elN) elN.addEventListener('change', updateInputs);
        const elM = document.getElementById('m'); if(elM) elM.addEventListener('change', () => { generateData(); });
        updateInputs(); generateData(); 
    } catch (error) { console.error(error); alert("初始化失败: " + error.message); }
});
