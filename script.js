// ==================== 1. 数据生成核心算法 ====================
function rand(l, r) { return Math.floor(Math.random() * (r - l + 1)) + l; }
function insertSorted(arr, val) {
    let low = 0, high = arr.length - 1;
    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        if (arr[mid] < val) low = mid + 1; else high = mid - 1;
    }
    arr.splice(low, 0, val);
}
function genTree(n) {
    if (n <= 1) return n + '\n';
    if (n === 2) return n + '\n1 2\n';
    let edges = [], degree = new Array(n + 1).fill(1), sequence = [];
    for (let i = 0; i < n - 2; i++) { let node = rand(1, n); sequence.push(node); degree[node]++; }
    let leaves = [];
    for (let i = 1; i <= n; i++) if (degree[i] === 1) leaves.push(i);
    leaves.sort((a, b) => a - b);
    for (let i = 0; i < n - 2; i++) {
        let u = leaves.shift(), v = sequence[i]; edges.push(`${u} ${v}`);
        if (--degree[v] === 1) insertSorted(leaves, v);
    }
    edges.push(`${leaves[0]} ${leaves[1]}`);
    return n + '\n' + edges.join('\n');
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
    for (let i = 1; i <= n; i++) {
        if (i * 2 <= n) res += i + ' ' + (i * 2) + '\n';
        if (i * 2 + 1 <= n) res += i + ' ' + (i * 2 + 1) + '\n';
    }
    return res.trim();
}
function genGraph(n, m) {
    let set = new Set(); m = Math.min(m, n * (n - 1) / 2);
    while (set.size < m) {
        let u = rand(1, n), v = rand(1, n);
        if (u === v) continue; if (u > v) [u, v] = [v, u];
        set.add(u + ' ' + v);
    }
    let res = n + ' ' + m + '\n';
    for (let s of set) res += s + '\n'; return res.trim();
}
function genWeightTree(n, maxw) {
    if (n <= 1) return n + '\n';
    if (n === 2) return n + '\n1 2 ' + rand(1, maxw) + '\n';
    let edges = [], degree = new Array(n + 1).fill(1), sequence = [];
    for (let i = 0; i < n - 2; i++) { let node = rand(1, n); sequence.push(node); degree[node]++; }
    let leaves = [];
    for (let i = 1; i <= n; i++) if (degree[i] === 1) leaves.push(i);
    leaves.sort((a, b) => a - b);
    for (let i = 0; i < n - 2; i++) {
        let u = leaves.shift(), v = sequence[i], w = rand(1, maxw);
        edges.push(`${u} ${v} ${w}`);
        if (--degree[v] === 1) insertSorted(leaves, v);
    }
    edges.push(`${leaves[0]} ${leaves[1]} ${rand(1, maxw)}`);
    return n + '\n' + edges.join('\n');
}

// ==================== 2. Vis-network 图形渲染控制 ====================

let nodesDataset = null;
let edgesDataset = null;
let network = null;
let contextNodeId = null; // 记录右键点击的是哪个节点

function initNetwork() {
    nodesDataset = new vis.DataSet();
    edgesDataset = new vis.DataSet();
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodesDataset, edges: edgesDataset };
    
    // 读取滑块当前值
    const initNodeSize = parseInt(document.getElementById('nodeSize').value);
    const initEdgeLength = parseInt(document.getElementById('edgeLength').value);

    const options = {
        nodes: {
            shape: 'circle',
            color: { background: '#ffffff', border: '#4e6ef2', highlight: { background: '#f0f4ff', border: '#3a5cd3' } },
            borderWidth: 2, font: { color: '#333', size: initNodeSize, face: 'system-ui' }, shadow: true
        },
        edges: {
            color: { color: '#999', highlight: '#4e6ef2' },
            width: 2, font: { size: 14, align: 'top', background: '#ffffff' }, smooth: { type: 'continuous' } 
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springConstant: 0.08, springLength: initEdgeLength, damping: 0.4, avoidOverlap: 0 },
            stabilization: { iterations: 150 } 
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };

    network = new vis.Network(container, data, options);

    // 【核心改进1：单击固定，但允许手动拖动】
    network.on("click", function (params) {
        closeContextMenu(); // 点击空白处关闭菜单
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodesDataset.get(nodeId);
            if(node) {
                // 用自定义属性 isPinned 记录我们的固定状态
                const isPinned = node.isPinned === true;
                nodesDataset.update({
                    id: nodeId,
                    isPinned: !isPinned,
                    fixed: !isPinned, // 物理引擎层面的固定
                    borderWidth: !isPinned ? 4 : 2,
                    color: { 
                        border: !isPinned ? '#ff5722' : '#4e6ef2', 
                        highlight: { border: !isPinned ? '#e64a19' : '#3a5cd3' }
                    }
                });
            }
        }
    });

    // 拖拽开始：如果是钉住的节点，临时解除物理固定，让你可以拖动它
    network.on("dragStart", function(params) {
        closeContextMenu();
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodesDataset.get(nodeId);
            if (node && node.isPinned) {
                nodesDataset.update({ id: nodeId, fixed: false });
            }
        }
    });

    // 拖拽结束：如果是钉住的节点，在松手的新位置重新钉死它
    network.on("dragEnd", function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodesDataset.get(nodeId);
            if (node && node.isPinned) {
                nodesDataset.update({ id: nodeId, fixed: true });
            }
        }
    });

    // 【核心改进3：自定义右键悬浮菜单】
    network.on("oncontext", function (params) {
        params.event.preventDefault(); // 阻止浏览器自带菜单
        const nodeId = network.getNodeAt(params.pointer.DOM);
        if (nodeId !== undefined) {
            contextNodeId = nodeId;
            const node = nodesDataset.get(nodeId);
            
            const menu = document.getElementById('contextMenu');
            const input = document.getElementById('nodeLabelInput');
            
            // 将菜单位置放到鼠标右键点击的地方
            menu.style.left = params.event.pageX + 'px';
            menu.style.top = params.event.pageY + 'px';
            menu.style.display = 'flex';
            
            // 自动填入当前标签并获得焦点
            input.value = node.label || String(nodeId);
            setTimeout(() => input.focus(), 50); // 延迟一点点保证面板渲染
        }
    });

    // 点击画布或者拖动画布时关闭菜单
    network.on("dragStart", closeContextMenu);
    network.on("zoom", closeContextMenu);
}

// 渲染文本框内容到图表
function renderGraphFromText() {
    if (!nodesDataset || !edgesDataset) return;
    const text = document.getElementById('output').value.trim();
    if (!text) { nodesDataset.clear(); edgesDataset.clear(); return; }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;

    const firstLine = lines[0].split(/\s+/).map(Number);
    const n = firstLine[0];
    if (isNaN(n) || n > 2000) return; 

    // 保留状态（固定、颜色、自定义标签等）
    let newNodes = [];
    for (let i = 1; i <= n; i++) {
        let existingNode = nodesDataset.get(i);
        if (existingNode) {
            newNodes.push(existingNode); 
        } else {
            newNodes.push({ id: i, label: String(i) }); 
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

// ==================== 3. 界面逻辑与面板控制 ====================

// 【核心改进2：滑块调节图表】
function bindSliders() {
    // 节点大小滑块
    document.getElementById('nodeSize').addEventListener('input', function(e) {
        if(network) {
            network.setOptions({ nodes: { font: { size: parseInt(e.target.value) } } });
        }
    });
    // 弹簧边长滑块
    document.getElementById('edgeLength').addEventListener('input', function(e) {
        if(network) {
            network.setOptions({ physics: { forceAtlas2Based: { springLength: parseInt(e.target.value) } } });
        }
    });
}

// 右键菜单保存逻辑
function closeContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
    contextNodeId = null;
}
function saveNodeLabel() {
    if (contextNodeId !== null) {
        const newLabel = document.getElementById('nodeLabelInput').value.trim();
        if (newLabel) {
            nodesDataset.update({ id: contextNodeId, label: newLabel });
        }
        closeContextMenu();
    }
}

function updateInputs() {
    const n = parseInt(document.getElementById('n').value);
    const mInput = document.getElementById('m');
    const maxwInput = document.getElementById('maxw');
    const type = document.getElementById('type').value;

    mInput.disabled = true; maxwInput.disabled = true;
    if (!isNaN(n)) mInput.max = Math.min(10000, n * (n - 1) / 2);
    if (type === 'graph') mInput.disabled = false;
    if (type === 'w_tree') maxwInput.disabled = false;
}

function generateData() {
    let n = parseInt(document.getElementById('n').value);
    let m = parseInt(document.getElementById('m').value);
    let maxw = parseInt(document.getElementById('maxw').value);
    const type = document.getElementById('type').value;

    if (isNaN(n) || n < 1) n = 10;
    if (n > 300) { alert("为了保护浏览器，节点数暂时限制在 300。"); n = 300; document.getElementById('n').value = 300; }

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

function copyOutput() {
    navigator.clipboard.writeText(document.getElementById('output').value).then(() => {
        const fb = document.getElementById('copyFeedback');
        fb.textContent = '已复制！'; fb.style.opacity = 1;
        setTimeout(() => fb.style.opacity = 0, 2000);
    });
}

// ==================== 4. 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 绑定右键菜单事件
        document.getElementById('saveLabelBtn').addEventListener('click', saveNodeLabel);
        document.getElementById('nodeLabelInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveNodeLabel(); });
        
        document.getElementById('type').addEventListener('change', () => { updateInputs(); generateData(); });
        document.getElementById('output').addEventListener('input', renderGraphFromText);
        
        bindSliders();
        updateInputs();
        initNetwork();
        generateData(); 
    } catch (error) {
        console.error(error);
        alert("应用加载失败，请按 Ctrl + F5 强制刷新。\n" + error.message);
    }
});
