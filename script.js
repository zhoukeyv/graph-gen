let network = null;
let nodesDataset = new vis.DataSet();
let edgesDataset = new vis.DataSet();

let contextNodeId = null;
let contextEdgeId = null;

// 物理引擎配置（较低的damping使静止更迅速，避免不停旋转）
const PHYSICS_CONFIG = { gravitationalConstant: -40, centralGravity: 0.01, springConstant: 0.08, damping: 0.4 };

// 获取统一风格
function getStyleObject(baseObj, extra = {}) {
    let isPinned = extra.isPinned || false;
    let label = extra.label || String(baseObj.id);
    let colorObj = isPinned ? { background: '#ff9800', border: '#e65100' } : { background: '#ffffff', border: '#4e6ef2' };
    return Object.assign({}, baseObj, {
        label: label,
        shape: 'circle',
        borderWidth: 2,
        color: { background: colorObj.background, border: colorObj.border, highlight: { background: '#f0f4ff', border: '#4e6ef2' } },
        font: { size: 16, color: '#333' },
        fixed: { x: isPinned, y: isPinned }
    }, extra);
}

// 初始化图表
function initNetwork() {
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodesDataset, edges: edgesDataset };
    
    // smooth: false 关闭曲线，避免角动量造成旋转
    const options = {
        nodes: { scaling: { min: 10, max: 30 } },
        edges: { 
            color: { color: '#999', highlight: '#4e6ef2' }, 
            width: 2, 
            font: { size: 14, align: 'top', background: '#ffffff', strokeWidth: 3 },
            smooth: false, 
            arrows: { to: { enabled: false, scaleFactor: 0.8 } } 
        },
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: Object.assign({}, PHYSICS_CONFIG, { springLength: 100 }) },
        interaction: { hover: true, multiselect: false, navigationButtons: true }
    };
    
    network = new vis.Network(container, data, options);

    // 拖拽节点结束时自动固定位置
    network.on("dragEnd", function (params) {
        if (params.nodes && params.nodes.length > 0) {
            let nodeId = params.nodes[0];
            let pos = network.getPositions([nodeId])[nodeId];
            nodesDataset.update(getStyleObject({ id: nodeId }, { isPinned: true, x: pos.x, y: pos.y }));
        }
    });

    // 禁用默认右键菜单，接管自定义右键
    network.on("oncontext", function (params) {
        params.event.preventDefault();
        closeContextMenu();
        let pointer = params.pointer.DOM;
        let nodeId = network.getNodeAt(pointer);
        let edgeId = network.getEdgeAt(pointer);
        
        if (nodeId !== undefined) {
            network.selectNodes([nodeId]);
            showNodeContextMenu(nodeId, params.event.clientX, params.event.clientY);
        } else if (edgeId !== undefined) {
            network.selectEdges([edgeId]);
            showEdgeContextMenu(edgeId, params.event.clientX, params.event.clientY);
        }
    });

    network.on("click", closeContextMenu);
    network.on("dragStart", closeContextMenu);
    network.on("zoom", closeContextMenu);
    
    // 初始化默认文本
    renderGraphFromText();
}

// ====== 更新物理与布局 ======
window.forcePhysicsUpdate = function() {
    if (!network) return;
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    network.setOptions({ 
        edges: { smooth: false }, 
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: Object.assign({}, PHYSICS_CONFIG, { springLength: currentEdgeLen }) } 
    });
    network.startSimulation();
}

// 树状层次排版（支持字符串根节点）
window.formatAsTree = function() {
    if (!network || !nodesDataset) return;
    let rootId = document.getElementById('treeRootInput').value.trim();
    if (!rootId || !nodesDataset.get(rootId)) {
        alert(`未找到节点 [${rootId}]！请确认节点名是否正确。`);
        return;
    }
    
    // BFS 算层级
    let adj = {}; 
    nodesDataset.getIds().forEach(id => adj[id] = []);
    edgesDataset.get().forEach(e => {
        adj[e.from].push(e.to); 
        adj[e.to].push(e.from); // 均按无向处理层级
    });
    
    let levels = {}, q = [rootId]; 
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
    
    nodesDataset.update(nodesDataset.get().map(n => { return { id: n.id, level: levels[n.id] !== undefined ? levels[n.id] : 0 }; }));
    
    const currentEdgeLen = parseInt(document.getElementById('edgeLength').value) || 100;
    network.setOptions({ 
        layout: { hierarchical: { enabled: true, direction: 'UD', sortMethod: 'directed', nodeSpacing: currentEdgeLen * 1.2, levelSeparation: currentEdgeLen * 1.0 } }, 
        physics: { enabled: false } 
    });
    
    // 应用排版后将位置写死，恢复普通物理交互
    setTimeout(() => { 
        let positions = network.getPositions(); 
        network.setOptions({ layout: { hierarchical: { enabled: false } } }); 
        nodesDataset.update(nodesDataset.get().map(node => { 
            let style = getStyleObject(node, { isPinned: true }); 
            if (positions[node.id]) { style.x = positions[node.id].x; style.y = positions[node.id].y; } 
            return style; 
        })); 
        window.forcePhysicsUpdate(); 
        network.fit({ animation: { duration: 600 } }); 
    }, 50);
}

// ====== 文本与图解析核心 (不依赖 N 行，支持字符串) ======
window.renderGraphFromText = function() {
    if (!nodesDataset || !edgesDataset) return;
    let isDirected = document.getElementById('isDirected').value === 'true'; 
    network.setOptions({ edges: { arrows: { to: { enabled: isDirected } } } });
    
    const text = document.getElementById('output').value.trim(); 
    if (!text) { nodesDataset.clear(); edgesDataset.clear(); return; }
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== ''); 
    if (lines.length === 0) return;
    
    let uniqueNodes = new Set();
    let parsedEdges = [];
    
    // 按空白符切割，任意字符串皆为节点
    lines.forEach(line => {
        const parts = line.split(/\s+/);
        if (parts.length === 1) {
            uniqueNodes.add(parts[0]); // 孤立节点
        } else if (parts.length >= 2) {
            uniqueNodes.add(parts[0]);
            uniqueNodes.add(parts[1]);
            let edge = { from: parts[0], to: parts[1] };
            if (parts.length >= 3) edge.label = parts.slice(2).join(' '); // 边权
            parsedEdges.push(edge);
        }
    });
    
    // 保留现有节点的位置和锁定状态
    let currentNodesMap = new Map();
    nodesDataset.get().forEach(n => currentNodesMap.set(String(n.id), n));
    
    let newNodes = [];
    uniqueNodes.forEach(nodeId => {
        if (currentNodesMap.has(nodeId)) {
            newNodes.push(currentNodesMap.get(nodeId)); // 原封不动保留
        } else {
            newNodes.push(getStyleObject({ id: nodeId }, { label: String(nodeId) })); // 新建
        }
    });
    
    // 移除文本中不存在的节点
    let nodeIdsToRemove = nodesDataset.getIds().filter(id => !uniqueNodes.has(String(id)));
    if (nodeIdsToRemove.length > 0) nodesDataset.remove(nodeIdsToRemove);
    
    nodesDataset.update(newNodes);
    edgesDataset.clear(); 
    edgesDataset.add(parsedEdges); 
    
    // 给一点延迟让引擎识别新边
    setTimeout(() => { window.forcePhysicsUpdate(); }, 10);
}


// ====== 右键菜单与交互 ======
function showNodeContextMenu(nodeId, x, y) {
    contextNodeId = nodeId;
    let menu = document.getElementById('nodeContextMenu');
    let node = nodesDataset.get(nodeId);
    let isPinned = node && node.fixed && node.fixed.x;
    document.getElementById('pinMenuBtn').innerText = isPinned ? '取消固定位置' : '固定当前位置';
    menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.style.display = 'block';
}

function showEdgeContextMenu(edgeId, x, y) {
    contextEdgeId = edgeId;
    let menu = document.getElementById('edgeContextMenu');
    let edge = edgesDataset.get(edgeId);
    document.getElementById('edgeLabelInput').value = edge.label || '';
    menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.style.display = 'block';
    setTimeout(() => document.getElementById('edgeLabelInput').focus(), 50);
}

window.closeContextMenu = function() {
    document.getElementById('nodeContextMenu').style.display = 'none';
    document.getElementById('edgeContextMenu').style.display = 'none';
    contextNodeId = null; contextEdgeId = null;
}

window.deleteNode = function() {
    if (contextNodeId !== null) {
        // 从文本中剔除包含该节点的行
        let lines = document.getElementById('output').value.split('\n');
        let newLines = lines.filter(line => {
            let parts = line.trim().split(/\s+/);
            return !parts.includes(String(contextNodeId));
        });
        document.getElementById('output').value = newLines.join('\n').trim();
        renderGraphFromText();
        closeContextMenu();
    }
}

window.deleteEdge = function() {
    if (contextEdgeId !== null) {
        let edge = edgesDataset.get(contextEdgeId);
        if (edge) {
            let lines = document.getElementById('output').value.split('\n');
            let isDirected = document.getElementById('isDirected').value === 'true';
            for (let i = 0; i < lines.length; i++) {
                let parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 2) {
                    let u = parts[0], v = parts[1];
                    let match = isDirected ? (u == edge.from && v == edge.to) : ((u == edge.from && v == edge.to) || (u == edge.to && v == edge.from));
                    if (match) { lines.splice(i, 1); break; }
                }
            }
            document.getElementById('output').value = lines.join('\n').trim();
            renderGraphFromText();
        }
        closeContextMenu();
    }
}

window.pinNode = function() {
    if (contextNodeId !== null) {
        let node = nodesDataset.get(contextNodeId);
        let isPinned = !(node.fixed && node.fixed.x);
        nodesDataset.update(getStyleObject(node, { isPinned: isPinned }));
        closeContextMenu();
    }
}

window.saveEdgeConfig = function() {
    if (contextEdgeId !== null) {
        let newWeight = document.getElementById('edgeLabelInput').value.trim(); 
        let edge = edgesDataset.get(contextEdgeId); 
        
        if (edge) {
            let lines = document.getElementById('output').value.split('\n'); 
            let isDirected = document.getElementById('isDirected').value === 'true';
            for (let i = 0; i < lines.length; i++) {
                let parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 2) { 
                    let u = parts[0], v = parts[1]; 
                    // 兼容字符串与数字比较
                    let match = isDirected ? (u == edge.from && v == edge.to) : ((u == edge.from && v == edge.to) || (u == edge.to && v == edge.from)); 
                    if (match) { 
                        lines[i] = newWeight ? `${u} ${v} ${newWeight}` : `${u} ${v}`; 
                        break; 
                    } 
                }
            }
            document.getElementById('output').value = lines.join('\n');
            renderGraphFromText();
        }
        closeContextMenu();
    }
}

// ====== 数据生成器工具 ======
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getEdges_Tree(n) {
    let edges = [];
    for (let i = 2; i <= n; i++) edges.push([i, rand(1, i - 1)]);
    return edges;
}
function getEdges_Chain(n) {
    let edges = [];
    for (let i = 1; i < n; i++) edges.push([i, i + 1]);
    return edges;
}
function getEdges_Daisy(n) {
    let edges = [];
    for (let i = 2; i <= n; i++) edges.push([1, i]);
    return edges;
}
function getEdges_Binary(n) {
    let edges = [];
    for (let i = 2; i <= n; i++) edges.push([Math.floor(i / 2), i]);
    return edges;
}
function getEdges_Graph(n, m, isDirected) {
    let edges = [], existing = new Set();
    // 先生成一颗树保证连通性
    for (let i = 2; i <= n; i++) {
        let u = i, v = rand(1, i - 1);
        if(!isDirected && u > v) { let t = u; u = v; v = t; }
        edges.push([u, v]); existing.add(`${u}-${v}`);
    }
    // 再随机加边
    let attempts = 0;
    while (edges.length < m && attempts < m * 5) {
        attempts++;
        let u = rand(1, n), v = rand(1, n);
        if (u === v) continue;
        if (!isDirected && u > v) { let t = u; u = v; v = t; }
        let key = `${u}-${v}`;
        if (!existing.has(key)) { edges.push([u, v]); existing.add(key); }
    }
    return edges;
}

window.generateData = function() {
    let n = parseInt(document.getElementById('n').value), m = parseInt(document.getElementById('m').value), maxw = parseInt(document.getElementById('maxw').value);
    const struct = document.getElementById('graphStructure').value, isDirected = (document.getElementById('isDirected').value === 'true'), isWeighted = (document.getElementById('isWeighted').value === 'true');
    if (isNaN(n) || n < 1) n = 10; 
    if (n > 300) { alert("节点数暂时限制在 300 以内。"); n = 300; document.getElementById('n').value = 300; }
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
    
    let out = "";
    let generatedNodes = new Set();
    
    // 输出边信息
    for(let e of edges) { 
        out += e.join(' ') + '\n'; 
        generatedNodes.add(String(e[0])); 
        generatedNodes.add(String(e[1]));
    }
    
    // 补充独立节点，确保总节点数为N（比如M=0的情况）
    for (let i = 1; i <= n; i++) {
        if (!generatedNodes.has(String(i))) {
            out += i + '\n';
        }
    }
    
    document.getElementById('output').value = out.trim(); 
    renderGraphFromText();
}

window.copyOutput = function() {
    const text = document.getElementById('output').value;
    navigator.clipboard.writeText(text).then(() => {
        const feedback = document.getElementById('copyFeedback');
        feedback.style.opacity = '1';
        setTimeout(() => feedback.style.opacity = '0', 2000);
    });
}

// 页面加载后初始化
window.onload = function() {
    initNetwork();
};
