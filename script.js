// ==================== 1. 数据生成核心算法 ====================
function rand(l, r) { return Math.floor(Math.random() * (r - l + 1)) + l; }

function insertSorted(arr, val) {
    let low = 0, high = arr.length - 1;
    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        if (arr[mid] < val) low = mid + 1;
        else high = mid - 1;
    }
    arr.splice(low, 0, val);
}

function genTree(n) {
    if (n <= 1) return n + '\n';
    if (n === 2) return n + '\n1 2\n';
    let edges = [], degree = new Array(n + 1).fill(1), sequence = [];
    for (let i = 0; i < n - 2; i++) {
        let node = rand(1, n);
        sequence.push(node);
        degree[node]++;
    }
    let leaves = [];
    for (let i = 1; i <= n; i++) if (degree[i] === 1) leaves.push(i);
    leaves.sort((a, b) => a - b);
    for (let i = 0; i < n - 2; i++) {
        let u = leaves.shift(), v = sequence[i];
        edges.push(`${u} ${v}`);
        if (--degree[v] === 1) insertSorted(leaves, v);
    }
    edges.push(`${leaves[0]} ${leaves[1]}`);
    return n + '\n' + edges.join('\n');
}

function genChain(n) {
    if (n <= 1) return n + '\n';
    let res = n + '\n';
    for (let i = 1; i < n; i++) res += i + ' ' + (i + 1) + '\n';
    return res.trim();
}

function genDaisy(n) {
    if (n <= 1) return n + '\n';
    let res = n + '\n';
    for (let i = 2; i <= n; i++) res += '1 ' + i + '\n';
    return res.trim();
}

function genBinary(n) {
    if (n <= 1) return n + '\n';
    let res = n + '\n';
    for (let i = 1; i <= n; i++) {
        if (i * 2 <= n) res += i + ' ' + (i * 2) + '\n';
        if (i * 2 + 1 <= n) res += i + ' ' + (i * 2 + 1) + '\n';
    }
    return res.trim();
}

function genGraph(n, m) {
    let set = new Set();
    m = Math.min(m, n * (n - 1) / 2);
    while (set.size < m) {
        let u = rand(1, n), v = rand(1, n);
        if (u === v) continue;
        if (u > v) [u, v] = [v, u];
        set.add(u + ' ' + v);
    }
    let res = n + ' ' + m + '\n';
    for (let s of set) res += s + '\n';
    return res.trim();
}

function genWeightTree(n, maxw) {
    if (n <= 1) return n + '\n';
    if (n === 2) return n + '\n1 2 ' + rand(1, maxw) + '\n';
    let edges = [], degree = new Array(n + 1).fill(1), sequence = [];
    for (let i = 0; i < n - 2; i++) {
        let node = rand(1, n); sequence.push(node); degree[node]++;
    }
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

let nodesDataset = new vis.DataSet();
let edgesDataset = new vis.DataSet();
let network = null;

// 初始化网络图
function initNetwork() {
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodesDataset, edges: edgesDataset };
    
    const options = {
        nodes: {
            shape: 'circle',
            color: {
                background: '#ffffff',
                border: '#4e6ef2',
                highlight: { background: '#f0f4ff', border: '#3a5cd3' }
            },
            borderWidth: 2,
            font: { color: '#333', size: 16, face: 'system-ui' },
            shadow: true
        },
        edges: {
            color: { color: '#999', highlight: '#4e6ef2' },
            width: 2,
            font: { size: 14, align: 'top', background: '#ffffff' }, 
            smooth: { type: 'continuous' } 
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based', // 解决问题1：更换为防抖动更好的求解器
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springConstant: 0.08,
                springLength: 100,
                damping: 0.4, // 解决问题1：增加阻尼，让拖拽后迅速稳定，不再鬼畜
                avoidOverlap: 0
            },
            stabilization: { iterations: 150 } 
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };

    network = new vis.Network(container, data, options);

    // ================= 高级交互事件绑定 =================

    // 解决问题2：单击固定/取消固定节点
    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodesDataset.get(nodeId);
            
            // 判断当前是否已固定
            const isFixed = node.fixed === true || (node.fixed && node.fixed.x === true);
            
            nodesDataset.update({
                id: nodeId,
                fixed: !isFixed, // 切换状态
                borderWidth: !isFixed ? 4 : 2, // 固定时边框变粗
                color: { 
                    // 固定时变成橙红色警告色，直观看出被钉住了
                    border: !isFixed ? '#ff5722' : '#4e6ef2', 
                    highlight: { border: !isFixed ? '#e64a19' : '#3a5cd3' }
                }
            });
        }
    });

    // 解决问题3：右键点击修改标签
    network.on("oncontext", function (params) {
        // 阻止浏览器默认的右键菜单（防止弹出刷新/保存网页等）
        params.event.preventDefault(); 
        
        // 获取鼠标位置对应的节点 ID
        const nodeId = network.getNodeAt(params.pointer.DOM);
        if (nodeId !== undefined) {
            const node = nodesDataset.get(nodeId);
            // 弹出浏览器原生输入框
            const newLabel = prompt(`请输入节点 ${nodeId} 的新标签：`, node.label);
            
            if (newLabel !== null && newLabel.trim() !== "") {
                nodesDataset.update({
                    id: nodeId,
                    label: newLabel.trim()
                });
            }
        }
    });
}

// 解析文本并智能更新图表（保留原有固定状态和标签）
function renderGraphFromText() {
    const text = document.getElementById('output').value.trim();
    if (!text) {
        nodesDataset.clear(); edgesDataset.clear();
        return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;

    const firstLine = lines[0].split(/\s+/).map(Number);
    const n = firstLine[0];
    if (isNaN(n) || n > 2000) return; 

    // 智能更新节点：保留已经在图中修改过的固定状态和标签
    let newNodes = [];
    for (let i = 1; i <= n; i++) {
        let existingNode = nodesDataset.get(i);
        if (existingNode) {
            newNodes.push(existingNode); // 保留旧节点
        } else {
            newNodes.push({ id: i, label: String(i) }); // 新建节点
        }
    }
    
    // 清理掉多余的旧节点（比如 n 从 10 改成 5，要删掉 6~10）
    const currentNodesIds = nodesDataset.getIds();
    const nodesToRemove = currentNodesIds.filter(id => id > n);
    nodesDataset.remove(nodesToRemove);
    
    // 更新保留下来的节点
    nodesDataset.update(newNodes);

    // 重新绘制边
    let newEdges = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            let edge = { from: parts[0], to: parts[1] };
            if (parts.length >= 3 && !isNaN(parts[2])) {
                edge.label = String(parts[2]); 
            }
            newEdges.push(edge);
        }
    }
    edgesDataset.clear();
    edgesDataset.add(newEdges);
}

// ==================== 3. 页面控制逻辑 ====================

function updateInputs() {
    const n = parseInt(document.getElementById('n').value);
    const mInput = document.getElementById('m');
    const maxwInput = document.getElementById('maxw');
    const type = document.getElementById('type').value;

    mInput.disabled = t
