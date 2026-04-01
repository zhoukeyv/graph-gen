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

// 创建 DataSet 用于管理节点和边，这样可以实现平滑的数据更新
let nodesDataset = new vis.DataSet();
let edgesDataset = new vis.DataSet();
let network = null;

// 初始化网络图
function initNetwork() {
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodesDataset, edges: edgesDataset };
    
    // Vis.js 的配置项，可以调整颜色、物理引擎等
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
            font: { size: 14, align: 'top', background: '#ffffff' }, // 边权标签设置
            smooth: { type: 'continuous' } // 让边看起来更平滑
        },
        physics: {
            enabled: true,
            barnesHut: { gravitationalConstant: -2000, springLength: 100, springConstant: 0.04 },
            stabilization: { iterations: 100 } // 生成后快速稳定下来
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };

    network = new vis.Network(container, data, options);
}

// 解析文本框里的数据并更新到图表
function renderGraphFromText() {
    const text = document.getElementById('output').value.trim();
    if (!text) {
        nodesDataset.clear(); edgesDataset.clear();
        return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;

    // 解析第一行：节点数 n [边数 m]
    const firstLine = lines[0].split(/\s+/).map(Number);
    const n = firstLine[0];
    if (isNaN(n) || n > 2000) return; // 超过2000个点渲染会卡，加个保护

    // 构建新的节点数组
    let newNodes = [];
    for (let i = 1; i <= n; i++) {
        newNodes.push({ id: i, label: String(i) });
    }

    // 构建新的边数组
    let newEdges = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            let edge = { from: parts[0], to: parts[1] };
            if (parts.length >= 3 && !isNaN(parts[2])) {
                edge.label = String(parts[2]); // 添加边权标签
            }
            newEdges.push(edge);
        }
    }

    // 更新 Dataset。vis.js 会自动计算差异并做平滑动画
    nodesDataset.clear();
    nodesDataset.add(newNodes);
    edgesDataset.clear();
    edgesDataset.add(newEdges);
}

// ==================== 3. 页面交互逻辑 ====================

function updateInputs() {
    const n = parseInt(document.getElementById('n').value);
    const mInput = document.getElementById('m');
    const maxwInput = document.getElementById('maxw');
    const type = document.getElementById('type').value;

    mInput.disabled = true;
    maxwInput.disabled = true;

    if (!isNaN(n)) {
        mInput.max = Math.min(10000, n * (n - 1) / 2);
    }

    if (type === 'graph') mInput.disabled = false;
    if (type === 'w_tree') maxwInput.disabled = false;
}

// 点击生成按钮
function generateData() {
    let n = parseInt(document.getElementById('n').value);
    let m = parseInt(document.getElementById('m').value);
    let maxw = parseInt(document.getElementById('maxw').value);
    const type = document.getElementById('type').value;

    if (isNaN(n) || n < 1) n = 10;

    let out = '';
    switch (type) {
        case 'tree': out = genTree(n); break;
        case 'chain': out = genChain(n); break;
        case 'daisy': out = genDaisy(n); break;
        case 'binary': out = genBinary(n); break;
        case 'graph':
            if (isNaN(m) || m < 0) m = n;
            out = genGraph(n, m); 
            break;
        case 'w_tree':
            if (isNaN(maxw) || maxw < 1) maxw = 10;
            out = genWeightTree(n, maxw); 
            break;
    }
    
    // 把生成的数据写入左侧文本框
    document.getElementById('output').value = out;
    // 触发图表重新渲染
    renderGraphFromText();
}

function copyOutput() {
    const text = document.getElementById('output').value;
    const fb = document.getElementById('copyFeedback');
    navigator.clipboard.writeText(text).then(() => {
        fb.textContent = '已复制！';
        fb.style.opacity = 1;
        setTimeout(() => fb.style.opacity = 0, 2000);
    });
}

// ==================== 4. 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 监听下拉框改变
    document.getElementById('type').addEventListener('change', () => {
        updateInputs(); generateData();
    });
    
    // 2. 监听文本框的手动输入！实现键盘敲击即时渲染
    document.getElementById('output').addEventListener('input', renderGraphFromText);
    
    // 3. 初始化并首次生成
    updateInputs();
    initNetwork();
    generateData(); 
});
