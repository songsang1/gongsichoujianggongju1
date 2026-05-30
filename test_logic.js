// 抽奖工具核心逻辑自测脚本
// 模拟最小化浏览器全局对象

global.document = {
  getElementById: () => ({
    getContext: () => ({}),
    getBoundingClientRect: () => ({ width: 300, height: 300 }),
    classList: { add() {}, remove() {} },
    value: '',
    textContent: '',
    innerHTML: '',
    onclick: null,
    disabled: false,
    files: [],
  }),
  querySelectorAll: () => ({ forEach: () => {} }),
  createElement: () => ({
    classList: { add() {}, remove() {} },
    style: {},
    appendChild() {},
    remove() {},
  }),
  body: { appendChild() {}, removeChild() {} },
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.history = { replaceState() {} };
global.location = { hash: '', href: 'http://test/', pathname: '/index.html', search: '' };

const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
let js = m[1];

// 剔除 DOM 立即执行代码（背景粒子动画 + window.onload）
js = js.replace(/\/\/ =+\n\/\/  背景粒子[\s\S]*?\}\)\(\);/, '');
js = js.replace(/window\.addEventListener\('load'[\s\S]*?\}\);/, '');
// 剔除 drawWheel 中的 ctx 操作（需要真实 canvas）
js = js.replace(/function drawWheel[\s\S]*?^\}/m, 'function drawWheel(a){}');
// 剔除 confetti DOM 操作
js = js.replace(/function confetti\(\)[\s\S]*?^\}/m, 'function confetti(){}');
// 剔除 startDraw 中的动画帧（改为同步）
js = js.replace(
  /\(function loop\(now\)[\s\S]*?^\}\)\(performance\.now\(\)\);/m,
  '// animation removed for test'
);

eval(js);

let pass = 0, fail = 0;
function assert(desc, val) {
  if (val) { pass++; console.log('  ✅', desc); }
  else { fail++; console.log('  ❌', desc); }
}

console.log('=== 测试1：encodeData / decodeData ===');
const testData = {
  title: '测试抽奖',
  pwd: 'abc',
  prizes: [{ id: 1, icon: '🎁', name: '一等奖', total: 2, drawn: [] }],
  employees: [{ name: '张三', dept: '技术部' }, { name: '李四', dept: '' }],
  settings: { noRepeat: true, crossPrize: false },
  history: [],
};
const encoded = encodeData(testData);
const decoded = decodeData(encoded);
assert('编码后非空', encoded.length > 0);
assert('解码 title 正确', decoded && decoded.title === '测试抽奖');
assert('解码员工数=2', decoded && decoded.employees.length === 2);
assert('解码奖品数=1', decoded && decoded.prizes.length === 1);

console.log('\n=== 测试2：load() 从 URL hash 加载 ===');
global.location = {
  hash: '#' + encoded,
  href: 'http://test/#' + encoded,
  pathname: '/index.html',
  search: '',
  replaceState() {},
};
S = { title: '', pwd: '', prizes: [], employees: [], settings: {}, history: [] };
load();
assert('load 后 title 正确', S.title === '测试抽奖');
assert('load 后员工数=2', S.employees.length === 2);
assert('load 后奖品数=1', S.prizes.length === 1);

console.log('\n=== 测试3：getPrizePool 平铺奖池 ===');
S.prizes = [
  { id: 1, icon: '🥇', name: '一等奖', total: 1, drawn: [] },
  { id: 2, icon: '🥈', name: '二等奖', total: 2, drawn: [] },
];
S.employees = [{ name: 'A', dept: '' }, { name: 'B', dept: '' }, { name: 'C', dept: '' }];
S.settings = { noRepeat: true, crossPrize: false };
const pool3 = getPrizePool();
assert('奖池平铺长度=3 (1+2)', pool3.length === 3);
assert('奖池包含奖品0和1', pool3.includes(0) && pool3.includes(1));

console.log('\n=== 测试4：getPool noRepeat 排除已中奖者 ===');
S.prizes[0].drawn = ['A'];
const pool4 = getPool();
assert('A 已中一等奖，可抽池中不含 A', !pool4.find(e => e.name === 'A'));
assert('B 未中奖，在池中', !!pool4.find(e => e.name === 'B'));

console.log('\n=== 测试5：shuffle 不破坏原数组 ===');
const arr = [1, 2, 3, 4, 5];
const shuffled = shuffle([...arr]);
assert('shuffle 后长度不变', shuffled.length === 5);
assert('原数组不变', arr.length === 5);

console.log('\n=== 测试6：syncHash 设置 URL hash ===');
S.title = '测试抽奖';
syncHash();
assert('syncHash 后 hash 非空', global.location.hash.length > 1);
const decoded2 = decodeData(global.location.hash.slice(1));
assert('hash 可解码', decoded2 !== null);
assert('hash 中 title 正确', decoded2 && decoded2.title === '测试抽奖');

console.log('\n=== 测试7：drawCnt 边界 ===');
drawCnt = 1;
changeCount(-1);
assert('drawCnt 最小值=1', drawCnt === 1);
changeCount(100);
assert('drawCnt 最大值=20', drawCnt === 20);

console.log(`\n📊 结果：✅ ${pass} 通过  ❌ ${fail} 失败`);
if (fail > 0) process.exit(1);
