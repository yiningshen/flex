// Crumb: orders live in localStorage under "crumb.orders".
const KEY = 'crumb.orders';
const $ = s => document.querySelector(s);
let orders = JSON.parse(localStorage.getItem(KEY) || '[]');
let todayOnly = false;
const save = () => localStorage.setItem(KEY, JSON.stringify(orders));
const dayName = d => ['Today', 'Tomorrow', 'In 2 days'][d] || `In ${d} days`;
const NEXT = { bake: ['ready', 'Mark ready'], ready: ['done', 'Picked up'], done: null };

function render() {
  $('#empty').hidden = orders.length > 0;
  $('#board').hidden = orders.length === 0;
  for (const col of document.querySelectorAll('.col')) {
    const st = col.dataset.status, ul = col.querySelector('ul');
    const list = orders.filter(o => o.status === st && (!todayOnly || o.day === 0)).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    col.querySelector('.n').textContent = list.length;
    ul.innerHTML = '';
    for (const o of list) {
      const li = document.createElement('li'); li.className = 'order';
      li.innerHTML = `<b></b><span class="item"></span><span class="meta"></span>`;
      li.querySelector('b').textContent = o.customer;
      li.querySelector('.item').textContent = `${o.qty} × ${o.item}`;
      li.querySelector('.meta').textContent = `${dayName(o.day)}, ${o.time}`;
      if (NEXT[st]) { const b = document.createElement('button'); b.className = 'ghost'; b.textContent = NEXT[st][1]; b.onclick = () => { o.status = NEXT[st][0]; save(); render(); }; li.appendChild(b); }
      ul.appendChild(li);
    }
  }
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); }

$('#new').onclick = () => { $('#orderForm').reset(); $('#form').showModal(); $('#customer').focus(); };
$('#orderForm').addEventListener('submit', e => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  orders.push({ id: Date.now(), customer: $('#customer').value.trim(), item: $('#item').value.trim(), qty: Number($('#qty').value) || 1, day: Number($('#day').value), time: $('#time').value || '09:00', status: 'bake' });
  save(); render(); toast('Order saved');
});
$('#today').onclick = () => { todayOnly = !todayOnly; $('#today').setAttribute('aria-pressed', todayOnly); render(); };
$('#bakelist').onclick = () => {
  const totals = {};
  for (const o of orders.filter(o => o.status === 'bake')) totals[o.item] = (totals[o.item] || 0) + o.qty;
  $('#totals').innerHTML = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${k.replace(/</g, '&lt;')}</span><b>${v}</b></li>`).join('') || '<li>Nothing to bake 🎉</li>';
  $('#list').showModal();
};
$('#demo').onclick = () => {
  orders = [
    { id: 1, customer: 'Lena', item: 'Sourdough loaf', qty: 2, day: 0, time: '08:30', status: 'bake' },
    { id: 2, customer: 'Marco', item: 'Cinnamon buns', qty: 6, day: 0, time: '10:00', status: 'bake' },
    { id: 3, customer: 'Priya', item: 'Birthday cake', qty: 1, day: 1, time: '15:00', status: 'bake' },
    { id: 4, customer: 'Tom', item: 'Sourdough loaf', qty: 1, day: 1, time: '09:15', status: 'bake' },
    { id: 5, customer: 'Ada', item: 'Croissants', qty: 4, day: 0, time: '07:45', status: 'ready' },
    { id: 6, customer: 'Sam', item: 'Rye bread', qty: 1, day: 0, time: '07:30', status: 'done' },
  ];
  save(); render(); toast('Demo orders loaded');
};
render();
