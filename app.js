const seed = { groups:[
  {id:'carry',name:'出差 · 随身携带',description:'上飞机前确认都在身上',color:'blue',items:[['身份证 / 护照','证件夹里','packed'],['充电器和转换头','黑色收纳袋','packed'],['降噪耳机','随身小包','todo'],['洗漱包','登机箱外层','todo'],['备用眼镜','','todo']]},
  {id:'ship',name:'邮寄 · 快递包裹',description:'到达后再拆的东西',color:'peach',items:[['会议资料与样品','顺丰 · SF14203829','shipping'],['换季衣物','箱子 B-02','todo'],['咖啡器具','箱子 B-03','todo']]},
  {id:'move',name:'搬家 · 纸箱 A',description:'书籍、桌面和小物件',color:'purple',items:[['设计书籍 12 本','标记：书房','packed'],['桌面摆件','易碎 · 请向上','packed'],['数据线收纳盒','','todo']]},
  {id:'home',name:'搬家 · 纸箱 B',description:'厨房和生活用品',color:'green',items:[['马克杯和餐具','气泡膜包裹','todo'],['香薰与蜡烛','','todo']]}
 ],activity:[['已将「充电器和转换头」标记为已打包','今天 10:24'],['新增包裹追踪号 SF14203829','昨天 18:42'],['创建分组「搬家 · 纸箱 B」','昨天 17:08']]};
let state = JSON.parse(localStorage.getItem('packflow-data') || 'null') || seed; let trip = JSON.parse(localStorage.getItem('packflow-trip') || 'null') || {name:'上海出差'}; let activeView='groups'; let activeFilter='all'; let activeCategory='all'; let query=''; let draggedItem=null; let draggedGroup=null; const collapsedGroups=new Set(state.groups.slice(1).map(group=>group.id));
const categories=['数码产品','服装','小电器','证件','生活用品','文件资料','书籍','家居用品','餐厨用品','其他'];
const categoryTones={'数码产品':'digital','服装':'clothing','小电器':'appliance','证件':'document','生活用品':'daily','文件资料':'files','书籍':'books','家居用品':'home','餐厨用品':'kitchen','其他':'other'};
const UNASSIGNED_GROUP_ID = 'unassigned';
function isUnassignedGroup(group) { return group?.id === UNASSIGNED_GROUP_ID; }
function ensureUnassignedGroup() {
  const matches = state.groups.filter(group => isUnassignedGroup(group) || group.name.trim() === '待分配');
  const group = matches[0] || { items: [] };
  group.items = matches.flatMap(match => match.items);
  Object.assign(group, { id: UNASSIGNED_GROUP_ID, name: '待分配', description: '还没决定放在哪里的物品，先收在这里', color: 'blue', status: 'todo' });
  state.groups = [group, ...state.groups.filter(candidate => !matches.includes(candidate))];
  return group;
}
function categoryForItem(name){if(/充电器|耳机|数据线|收纳盒/.test(name))return '数码产品';if(/衣物/.test(name))return '服装';if(/咖啡器具/.test(name))return '小电器';if(/身份证|护照|眼镜/.test(name))return '证件';if(/资料|样品/.test(name))return '文件资料';if(/书籍/.test(name))return '书籍';if(/摆件/.test(name))return '家居用品';if(/马克杯|餐具/.test(name))return '餐厨用品';if(/洗漱|香薰|蜡烛/.test(name))return '生活用品';return '其他'}
function normalizeState(){state.groups.forEach(group=>{const legacyStatus=group.items.some(item=>item[2]==='received')?'received':group.items.some(item=>item[2]==='shipping')?'shipping':null;group.status=['todo','shipping','received'].includes(group.status)?group.status:legacyStatus||'todo';group.items.forEach(item=>{if(item[2]==='shipping'||item[2]==='received')item[2]='packed';item[3]=categories.includes(item[3])?item[3]:categoryForItem(item[0])})});ensureUnassignedGroup()}
normalizeState();
const $=s=>document.querySelector(s); const save=()=>{localStorage.setItem('packflow-data',JSON.stringify(state));render()};
const preferredTheme=localStorage.getItem('packflow-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
function applyTheme(theme){document.body.classList.toggle('dark',theme==='dark');localStorage.setItem('packflow-theme',theme);const dark=theme==='dark';$('#themeToggle').setAttribute('aria-pressed',String(dark));$('.theme-icon').innerHTML=icon(dark?'sun':'moon');$('#themeToggle').setAttribute('aria-label',dark?'切换日间模式':'切换深夜模式');$('.theme-label').textContent=dark?'日间模式':'深夜模式';$('#themeColor').setAttribute('content',dark?'#151e29':'#e7e5de')}
function items(){return state.groups.flatMap(g=>g.items.map((x,i)=>({name:x[0],note:x[1],status:x[2],category:x[3],group:g,index:i}))) }
function statusText(s){return ({todo:'待准备',packed:'已打包'})[s]}
function groupStatusText(s){return ({todo:'待准备',shipping:'运输中',received:'已收到'})[s]}
function isValidImport(data){return data&&Array.isArray(data.groups)&&data.groups.every(g=>g&&typeof g.id==='string'&&typeof g.name==='string'&&Array.isArray(g.items)&&g.items.every(item=>Array.isArray(item)&&item.length>=3&&typeof item[0]==='string'&&typeof item[1]==='string'&&['todo','packed','shipping','received'].includes(item[2])))&&Array.isArray(data.activity)}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const groupTone = group => ['blue','peach','purple','green'].includes(group.color) ? group.color : 'blue';
function hasItemFilter() { return Boolean(query.trim() || activeCategory !== 'all' || activeFilter !== 'all'); }
function visibleItems() {
  const term = query.trim().toLowerCase();
  return items().filter(item =>
    (activeView !== 'tracking' || item.group.status === 'shipping') &&
    (activeFilter === 'all' || item.status === activeFilter) &&
    (activeCategory === 'all' || item.category === activeCategory) &&
    [item.name, item.note, item.group.name].join(' ').toLowerCase().includes(term));
}
function visibleGroups() {
  const shown = visibleItems();
  return state.groups.filter(group => (activeView !== 'tracking' || group.status === 'shipping') &&
    (!hasItemFilter() || shown.some(item => item.group.id === group.id)));
}
function render() {
  const focused = document.activeElement;
  const focusAttribute = ['data-toggle', 'data-collapse-group', 'data-group-status', 'data-edit-item', 'data-edit-group'].find(attribute => focused?.hasAttribute(attribute));
  const focusValue = focusAttribute ? focused.getAttribute(focusAttribute) : null;
  const all = items(), done = all.filter(item => item.status === 'packed').length;
  const shipping = state.groups.filter(group => group.status === 'shipping').length;
  const percent = all.length ? Math.round(done / all.length * 100) : 0;
  $('#tripName').textContent = trip.name;
  $('#tripMeta').textContent = `${state.groups.length} 个分组 · ${all.length} 件物品`;
  $('#shippingCount').textContent = shipping;
  const stats = [
    ['总物品', all.length, `分装在 ${state.groups.length} 个分组中`, 'box', '件'],
    ['已打包', done, `${percent}% 已准备就绪`, 'check-circle', '件'],
    ['运输中', shipping, shipping ? '正在前往目的地' : '暂无运输中的分组', 'truck', '组'],
    ['待准备', all.length - done, all.length && done === all.length ? '全部就绪，轻松出发' : '慢慢来，一件一件整理', 'clock', '件']
  ];
  $('#summaryGrid').innerHTML = stats.map((stat, i) => `<div class="summary-card"><div class="summary-top"><span class="label">${stat[0]}</span><span class="summary-icon">${icon(stat[3])}</span></div><div class="value">${stat[1]}<small>${stat[4]}</small></div><div class="detail">${i === 1 ? `<em>${stat[2]}</em>` : stat[2]}</div></div>`).join('');
  const visible = visibleItems(), groups = visibleGroups();
  $('#visibleCount').textContent = `${groups.length} 组 / ${visible.length} 件物品`;
  $('#sectionTitle').textContent = activeView === 'tracking' ? '运输中的分组' : hasItemFilter() ? '筛选结果' : '你的分组';
  const allCollapsed = !groups.length || groups.every(group => collapsedGroups.has(group.id));
  $('#toggleAllGroups').textContent = allCollapsed ? '全部展开' : '全部收起';
  $('#toggleAllGroups').disabled = !groups.length;
  $('#unassignItemsBtn').disabled = !state.groups.some(group => !isUnassignedGroup(group) && group.items.length);
  document.querySelectorAll('.nav-item').forEach(button => {
    const active = button.dataset.view === activeView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.filter-tab').forEach(button => {
    const active = button.dataset.filter === activeFilter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (!groups.length) {
    const filtered = hasItemFilter();
    $('#groupList').innerHTML = `<div class="empty-state view-empty">${icon(filtered ? 'search' : 'box')}<h3>${filtered ? '没有找到匹配的物品' : activeView === 'tracking' ? '还没有在途的分组' : '从第一个分组开始'}</h3><p>${filtered ? '换个关键词，或清除筛选再试试。' : activeView === 'tracking' ? '将分组状态设为「运输中」，就能在这里查看。' : '把随身物品、快递包裹，分门别类整理好。'}</p><button class="secondary-button" ${filtered ? 'id="resetFilters"' : activeView === 'tracking' ? 'data-view="groups"' : 'id="emptyAddGroup"'}>${filtered ? '清除筛选' : activeView === 'tracking' ? '查看全部分组' : '新建分组'}</button></div>`;
  } else {
    $('#groupList').innerHTML = groups.map(group => {
      const complete = group.items.filter(item => item[2] === 'packed').length;
      const shown = visible.filter(item => item.group.id === group.id);
      const collapsed = collapsedGroups.has(group.id), id = escapeHtml(group.id);
      const groupIcon = group.color === 'peach' ? 'truck' : group.color === 'green' ? 'home' : 'box';
      return `<article class="group-card ${collapsed ? 'collapsed' : ''}" draggable="${!isUnassignedGroup(group)}" data-group-key="${id}"><div class="group-top"><div class="group-title-wrap"><span class="group-icon ${groupTone(group)}">${icon(groupIcon)}</span><div><div class="group-title-line"><h3 class="group-title">${escapeHtml(group.name)}</h3><button class="group-collapse" data-collapse-group="${id}" aria-expanded="${!collapsed}" aria-controls="items-${id}" aria-label="${collapsed ? '展开' : '收起'}${escapeHtml(group.name)}">${icon('chevron')}</button></div><p class="group-desc">${escapeHtml(group.description || '按自己的节奏，慢慢整理')}</p></div></div><div class="group-actions">${isUnassignedGroup(group) ? '<span class="fixed-group-label">固定分组 · 不可删除</span>' : `<select class="group-status-select ${group.status}" data-group-status="${id}" aria-label="${escapeHtml(group.name)}的分组状态">${['todo','shipping','received'].map(status => `<option value="${status}" ${group.status === status ? 'selected' : ''}>${groupStatusText(status)}</option>`).join('')}</select><button class="row-action" data-edit-group="${id}" aria-label="编辑分组">${icon('edit')}</button><button class="row-action" data-delete-group="${id}" aria-label="删除分组">${icon('close')}</button>`}<span class="progress-label" aria-label="已打包 ${complete} 件，共 ${group.items.length} 件"><strong>${complete}</strong> / ${group.items.length}</span></div></div><div class="progress-track"><div class="progress-bar ${group.items.length && complete === group.items.length ? 'complete' : ''}" style="width:${group.items.length ? complete / group.items.length * 100 : 0}%"></div></div><div class="item-list" id="items-${id}">${shown.length ? shown.map(itemHtml).join('') : '<div class="empty-state">分组准备好了，添加第一件物品吧。</div>'}</div><button class="add-item-inline" data-group="${id}">${icon('plus')}添加到这个分组</button></article>`;
    }).join('');
  }
  $('#packingOverview').innerHTML = `<div class="progress-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="51"/><circle class="ring-value" cx="60" cy="60" r="51" pathLength="100" stroke-dasharray="${percent} 100"/></svg><div class="ring-text"><strong>${percent}<small>%</small></strong><span>已准备就绪</span></div></div><p class="overview-caption">${!all.length ? '新的出发，从一份清单开始。' : done === all.length ? '全部准备好了，祝你一路顺风。' : `还有 ${all.length - done} 件待准备<br>每整理一件，离出发更近一点。`}</p><div class="overview-groups">${state.groups.map(group => { const count = group.items.filter(item => item[2] === 'packed').length; return `<div><div class="overview-group-label"><span class="overview-dot ${groupTone(group)}"></span><span>${escapeHtml(group.name)}</span><strong>${count}/${group.items.length}</strong></div><div class="progress-track"><div class="progress-bar" style="width:${group.items.length ? count / group.items.length * 100 : 0}%"></div></div></div>`; }).join('')}</div>`;
  const now = new Date();
  $('#todayText').textContent = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('.');
  $('#todayText').dateTime = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  if (focusAttribute && !focused.isConnected) {
    const replacement = Array.from(document.querySelectorAll(`[${focusAttribute}]`)).find(control => control.getAttribute(focusAttribute) === focusValue);
    (replacement || $('#searchInput')).focus({preventScroll: true});
  }
}
function itemHtml(item) {
  const category = item.category || '其他', key = escapeHtml(`${item.group.id}:${item.index}`), packed = item.status === 'packed';
  return `<div class="item-row ${packed ? 'done' : ''}" draggable="true" data-item-key="${key}"><span class="drag-handle" aria-hidden="true">⠿</span><button class="check" data-toggle="${key}" aria-label="${escapeHtml(item.name)}：${packed ? '已打包' : '待准备'}" aria-pressed="${packed}">${packed ? icon('check') : ''}</button><span class="item-copy"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-note" title="${escapeHtml(item.note)}">${escapeHtml(item.note)}</span></span><span class="item-category category-${categoryTones[category] || 'other'}">${escapeHtml(category)}</span><button class="row-action" data-edit-item="${key}" aria-label="编辑物品">${icon('edit')}</button><button class="row-action item-delete" data-delete-item="${key}" aria-label="删除物品">${icon('close')}</button></div>`;
}
function revealFilteredGroups() { visibleGroups().forEach(group => collapsedGroups.delete(group.id)); }
function resetFilters() { activeFilter = 'all'; activeCategory = 'all'; query = ''; $('#searchInput').value = ''; $('#categoryFilter').value = 'all'; }
async function moveAllItemsToUnassigned() {
  const count = state.groups.filter(group => !isUnassignedGroup(group)).reduce((total, group) => total + group.items.length, 0);
  if (!count) return;
  if (!await showConfirm(`将其他分组中的全部 ${count} 件物品移入「待分配」组，原分组会保留为空组。物品的打包状态、分类和备注均保留。此操作包含搜索和筛选之外的物品。`, '全部移入待分配')) return;
  const unassigned = ensureUnassignedGroup();
  unassigned.items = state.groups.flatMap(group => group.items);
  state.groups.forEach(group => { if (!isUnassignedGroup(group)) group.items = []; });
  state.activity.unshift([`已将 ${count} 件物品移入待分配组`, '刚刚']);
  state.activity = state.activity.slice(0, 5);
  resetFilters();
  activeView = 'groups';
  collapsedGroups.delete(UNASSIGNED_GROUP_ID);
  save();
  showToast(`已将 ${count} 件物品移入待分配组`);
}
function reorderItem(sourceKey,targetKey){if(sourceKey===targetKey)return;const [sourceGroupId,sourceIndex]=sourceKey.split(':'),[targetGroupId,targetIndex]=targetKey.split(':');if(sourceGroupId!==targetGroupId)return;const sourcePosition=Number(sourceIndex),targetPosition=Number(targetIndex);const group=state.groups.find(g=>g.id===sourceGroupId);if(!group)return;const [item]=group.items.splice(sourcePosition,1);group.items.splice(sourcePosition<targetPosition?targetPosition-1:targetPosition,0,item);state.activity.unshift([`调整了「${item[0]}」的顺序`,'刚刚']);state.activity=state.activity.slice(0,5);save()}
function reorderGroup(sourceId,targetId){if(sourceId===targetId||sourceId===UNASSIGNED_GROUP_ID||targetId===UNASSIGNED_GROUP_ID)return;const sourcePosition=state.groups.findIndex(g=>g.id===sourceId),targetPosition=state.groups.findIndex(g=>g.id===targetId);if(sourcePosition<0||targetPosition<0)return;const [group]=state.groups.splice(sourcePosition,1);state.groups.splice(sourcePosition<targetPosition?targetPosition-1:targetPosition,0,group);state.activity.unshift([`调整了分组「${group.name}」的顺序`,'刚刚']);state.activity=state.activity.slice(0,5);save()}
function prepareItemModal(key){$('#itemForm').reset();$('#itemForm').dataset.editKey=key||'';$('#itemModalTitle').textContent=key?'编辑物品':'添加物品';$('#itemSaveButton').textContent=key?'保存修改':'保存物品';if(key){const [g,i]=key.split(':'),item=state.groups.find(x=>x.id===g).items[i];$('#itemForm').elements.name.value=item[0];$('#itemForm').elements.group.value=g;$('#itemForm').elements.note.value=item[1]||'';$('#itemForm').elements.category.value=item[3]||categoryForItem(item[0]);$('#itemForm').elements.tracking.value=''}}
function prepareGroupModal(id){$('#groupForm').reset();$('#groupForm').dataset.editId=id||'';$('#groupModalTitle').textContent=id?'编辑分组':'新建分组';if(id){const g=state.groups.find(x=>x.id===id);$('#groupForm').elements.name.value=g.name;$('#groupForm').elements.description.value=g.description||'';$('#groupForm').elements.color.value=g.color}}
function showConfirm(message,title='确认操作'){return new Promise(resolve=>{const trigger=document.activeElement;const backdrop=document.createElement('div');backdrop.className='confirm-backdrop';backdrop.innerHTML='<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle"><button class="confirm-close" aria-label="关闭">×</button><p class="eyebrow">PLEASE CONFIRM</p><h2 id="confirmTitle"></h2><p class="confirm-message"></p><div class="confirm-actions"><button class="secondary-button confirm-cancel">取消</button><button class="primary-button confirm-ok">确认</button></div></div>';backdrop.querySelector('h2').textContent=title;backdrop.querySelector('.confirm-message').textContent=message;const finish=value=>{backdrop.remove();document.body.classList.remove('modal-open');document.removeEventListener('keydown',onKey);if(trigger?.isConnected)trigger.focus();resolve(value)};backdrop.querySelector('.confirm-cancel').addEventListener('click',()=>finish(false));backdrop.querySelector('.confirm-close').addEventListener('click',()=>finish(false));backdrop.querySelector('.confirm-ok').addEventListener('click',()=>finish(true));backdrop.addEventListener('click',e=>{if(e.target===backdrop)finish(false)});document.body.append(backdrop);document.body.classList.add('modal-open');backdrop.querySelector('.confirm-ok').focus();const onKey=e=>{if(!backdrop.isConnected){document.removeEventListener('keydown',onKey);return}if(e.key==='Escape'){e.preventDefault();finish(false)}};document.addEventListener('keydown',onKey)})}
function showToast(message,type='success'){const region=$('#toastRegion'),toast=document.createElement('div');toast.className=`toast toast-${type}`;toast.setAttribute('role',type==='error'?'alert':'status');toast.innerHTML=`<span class="toast-icon" aria-hidden="true">${type==='error'?'!':'✓'}</span><span class="toast-message"></span><button class="toast-close" type="button" aria-label="关闭提示">×</button>`;toast.querySelector('.toast-message').textContent=message;const remove=()=>{toast.classList.add('toast-out');toast.addEventListener('animationend',()=>toast.remove(),{once:true})};toast.querySelector('.toast-close').addEventListener('click',remove);region.append(toast);requestAnimationFrame(()=>toast.classList.add('toast-visible'));window.setTimeout(remove,4200)}
async function deleteItem(key){const [g,i]=key.split(':'),group=state.groups.find(x=>x.id===g),item=group.items[i];if(!await showConfirm(`确定删除「${item[0]}」吗？`,'删除物品'))return;group.items.splice(i,1);state.activity.unshift([`删除了「${item[0]}」`,'刚刚']);state.activity=state.activity.slice(0,5);save()}
async function deleteGroup(id){const group=state.groups.find(x=>x.id===id);if(!group)return;if(isUnassignedGroup(group)){showToast('待分配是固定分组，不能删除','error');return;}const suffix=group.items.length?`以及其中的 ${group.items.length} 件物品`:'';if(!await showConfirm(`确定删除分组「${group.name}」${suffix}吗？`,'删除分组'))return;state.groups=state.groups.filter(x=>x.id!==id);state.activity.unshift([`删除了分组「${group.name}」`,'刚刚']);state.activity=state.activity.slice(0,5);save()}
let modalTrigger = null;
function openModal(id, groupId) {
  modalTrigger = document.activeElement;
  const modal = document.getElementById(id);
  modal.hidden = false;
  document.body.classList.add('modal-open');
  if (groupId) $('#itemGroupSelect').value = groupId;
  modal.querySelector('input, select')?.focus();
}
function closeModal(id) {
  if (id === 'exportModal') clearImageExport();
  document.getElementById(id).hidden = true;
  document.body.classList.remove('modal-open');
  if (modalTrigger?.isConnected) modalTrigger.focus();
}
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop.id); });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const dialog = $('.confirm-dialog') || $('.modal-backdrop:not([hidden]) .modal');
  if (!dialog) return;
  const controls = Array.from(dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)'));
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
document.addEventListener('click',e=>{
  const t=e.target.closest('button')||e.target,navItem=t.closest('[data-view]');
  if(t.matches('[data-close]'))closeModal(t.dataset.close);
  if(t.id==='tripSwitcher'||t.closest('#tripSwitcher')){$('#tripForm').elements.name.value=trip.name;openModal('tripModal')}
  if(t.id==='filterToggle'||t.closest('#filterToggle')){const toolbar=$('.toolbar'),collapsed=toolbar.classList.toggle('filters-collapsed'),button=$('#filterToggle');button.setAttribute('aria-expanded',String(!collapsed));button.querySelector('.filter-toggle-icon').textContent=collapsed?'⌄':'⌃'}
  if(t.id==='addItemBtn'){if(!state.groups.length){prepareGroupModal();openModal('groupModal');showToast('先创建一个分组，就能添加物品了');return}populateGroups();prepareItemModal();openModal('itemModal')}
  if(t.matches('[data-group]')){populateGroups();prepareItemModal();openModal('itemModal',t.dataset.group)}
  if(t.id==='addGroupBtn'||t.id==='emptyAddGroup'){prepareGroupModal();openModal('groupModal')}
  if(t.matches('[data-collapse-group]')){const id=t.dataset.collapseGroup;collapsedGroups.has(id)?collapsedGroups.delete(id):collapsedGroups.add(id);render()}
  if(t.id==='toggleAllGroups'){const groups=visibleGroups(),allCollapsed=groups.length>0&&groups.every(group=>collapsedGroups.has(group.id));groups.forEach(group=>allCollapsed?collapsedGroups.delete(group.id):collapsedGroups.add(group.id));render()}
  if(t.id==='unassignItemsBtn')moveAllItemsToUnassigned();
  if(t.matches('[data-edit-group]')&&t.dataset.editGroup!==UNASSIGNED_GROUP_ID){prepareGroupModal(t.dataset.editGroup);openModal('groupModal')}
  if(t.matches('[data-delete-group]'))deleteGroup(t.dataset.deleteGroup);
  if(t.matches('[data-edit-item]')){populateGroups();prepareItemModal(t.dataset.editItem);openModal('itemModal')}
  if(t.matches('[data-delete-item]'))deleteItem(t.dataset.deleteItem);
  if(t.matches('[data-toggle]')){const [g,i]=t.dataset.toggle.split(':'),item=state.groups.find(x=>x.id===g).items[i];item[2]=item[2]==='packed'?'todo':'packed';state.activity.unshift([`已将「${item[0]}」标记为${statusText(item[2])}`,'刚刚']);state.activity=state.activity.slice(0,5);save()}
  if(t.id==='importBtn'||t.closest('#importBtn'))$('#importInput').click();
  if(navItem){activeView=navItem.dataset.view;render()}
  if(t.matches('.filter-tab')){activeFilter=t.dataset.filter;revealFilteredGroups();render()}
  if(t.id==='resetFilters'){resetFilters();render()}
  if(t.id==='backupBtn')exportJsonBackup();
  if(t.id==='clearActivity'){state.activity=[];save()}

});
document.addEventListener('change',e=>{if(e.target.matches('[data-status]')){const [g,i]=e.target.dataset.status.split(':');state.groups.find(x=>x.id===g).items[i][2]=e.target.value;save()}if(e.target.matches('[data-group-status]')){const group=state.groups.find(x=>x.id===e.target.dataset.groupStatus);if(group&&!isUnassignedGroup(group)){group.status=e.target.value;save()}}}); $('#searchInput').addEventListener('input',e=>{query=e.target.value;revealFilteredGroups();render()});
$('#importInput').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{const imported=JSON.parse(reader.result);if(!isValidImport(imported))throw new Error('invalid');if(!await showConfirm(`导入将覆盖当前清单中的 ${state.groups.length} 个分组，确定继续吗？`,'导入数据'))return;const importedTrip=imported.trip;delete imported.trip;state=imported;collapsedGroups.clear();state.groups.forEach(group=>collapsedGroups.add(group.id));if(importedTrip&&typeof importedTrip.name==='string'&&importedTrip.name.trim()){trip={name:importedTrip.name};localStorage.setItem('packflow-trip',JSON.stringify(trip))}normalizeState();resetFilters();activeView='groups';if(state.groups.length)collapsedGroups.delete(state.groups[0].id);save();showToast('数据导入成功')}catch(error){showToast('导入失败：请选择 PackFlow 导出的有效 JSON 文件','error')}finally{e.target.value=''}};reader.readAsText(file)});
document.addEventListener('dragstart',e=>{const row=e.target.closest('.item-row[draggable]');if(!row)return;if(e.target.closest('button,select')){e.preventDefault();return}draggedItem=row.dataset.itemKey;row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',draggedItem)});
document.addEventListener('dragover',e=>{const row=e.target.closest('.item-row[draggable]');if(!draggedItem||!row||row.dataset.itemKey.split(':')[0]!==draggedItem.split(':')[0])return;e.preventDefault();e.dataTransfer.dropEffect='move';document.querySelectorAll('.item-row.drag-over').forEach(x=>x.classList.remove('drag-over'));if(row.dataset.itemKey!==draggedItem)row.classList.add('drag-over')});
document.addEventListener('drop',e=>{const row=e.target.closest('.item-row[draggable]');if(!draggedItem||!row||row.dataset.itemKey.split(':')[0]!==draggedItem.split(':')[0])return;e.preventDefault();reorderItem(draggedItem,row.dataset.itemKey);draggedItem=null});
document.addEventListener('dragend',()=>{draggedItem=null;document.querySelectorAll('.item-row.dragging,.item-row.drag-over').forEach(x=>x.classList.remove('dragging','drag-over'))});
document.addEventListener('dragstart',e=>{const card=e.target.closest('.group-card[draggable="true"]');if(!card||e.target.closest('.item-row')||e.target.closest('button,select'))return;draggedGroup=card.dataset.groupKey;card.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',draggedGroup)});
document.addEventListener('dragover',e=>{const card=e.target.closest('.group-card[draggable="true"]');if(!draggedGroup||!card||card.dataset.groupKey===draggedGroup)return;e.preventDefault();e.dataTransfer.dropEffect='move';document.querySelectorAll('.group-card.drag-over').forEach(x=>x.classList.remove('drag-over'));card.classList.add('drag-over')});
document.addEventListener('drop',e=>{const card=e.target.closest('.group-card[draggable="true"]');if(!draggedGroup||!card||card.dataset.groupKey===draggedGroup)return;e.preventDefault();reorderGroup(draggedGroup,card.dataset.groupKey);draggedGroup=null});
document.addEventListener('dragend',()=>{draggedGroup=null;document.querySelectorAll('.group-card.dragging,.group-card.drag-over').forEach(x=>x.classList.remove('dragging','drag-over'))});
function populateGroups(){$('#itemGroupSelect').innerHTML=state.groups.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('')}
function ensureCategoryField(){if($('#itemCategorySelect'))return;const label=document.createElement('label');label.textContent='分类';label.innerHTML=`分类<select name="category" id="itemCategorySelect">${categories.map(category=>`<option value="${category}">${category}</option>`).join('')}</select>`;$('#itemForm').querySelector('label:nth-of-type(2)').after(label)}
ensureCategoryField();
function ensureCategoryFilter(){if($('#categoryFilter'))return;const filter=document.createElement('select');filter.id='categoryFilter';filter.className='category-filter';filter.setAttribute('aria-label','按分类筛选');filter.innerHTML=`<option value="all">全部分类</option>${categories.map(category=>`<option value="${category}">${category}</option>`).join('')}`;$('.filter-controls').append(filter);filter.addEventListener('change',e=>{activeCategory=e.target.value;revealFilteredGroups();render()})}
ensureCategoryFilter();
$('#itemForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),key=e.target.dataset.editKey,g=state.groups.find(x=>x.id===f.get('group')),note=f.get('tracking')||f.get('note')||'',category=f.get('category')||'其他';if(key){const [oldGroup,idx]=key.split(':'),item=state.groups.find(x=>x.id===oldGroup).items[idx],oldStatus=item[2];if(oldGroup===g.id){item[0]=f.get('name');item[1]=note;item[2]=oldStatus;item[3]=category}else{g.items.push([f.get('name'),note,oldStatus,category]);state.groups.find(x=>x.id===oldGroup).items.splice(idx,1)}state.activity.unshift([`修改了「${f.get('name')}」`,'刚刚'])}else{if(f.get('tracking')&&!isUnassignedGroup(g))g.status='shipping';g.items.push([f.get('name'),note,'todo',category]);state.activity.unshift([`新增「${f.get('name')}」到${g.name}`,'刚刚'])}state.activity=state.activity.slice(0,5);collapsedGroups.delete(g.id);if(!key){resetFilters();activeView='groups'}closeModal('itemModal');save()});
$('#groupForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),id=e.target.dataset.editId;if(id===UNASSIGNED_GROUP_ID){showToast('待分配是固定分组，不能修改','error');return}if(f.get('name').trim()==='待分配'){showToast('待分配是固定分组，请使用其他名称','error');return}if(id){const g=state.groups.find(x=>x.id===id);g.name=f.get('name');g.description=f.get('description');g.color=f.get('color');state.activity.unshift([`修改了分组「${g.name}」`,'刚刚'])}else{const newId='g'+Date.now();state.groups.push({id:newId,name:f.get('name'),description:f.get('description'),color:f.get('color'),status:'todo',items:[]});collapsedGroups.delete(newId);state.activity.unshift([`创建分组「${f.get('name')}」`,'刚刚'])}state.activity=state.activity.slice(0,5);resetFilters();activeView='groups';closeModal('groupModal');save()});
$('#tripForm').addEventListener('submit',e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;trip={name};localStorage.setItem('packflow-trip',JSON.stringify(trip));closeModal('tripModal');render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(x=>closeModal(x.id)); if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!$('.modal-backdrop:not([hidden])')&&!$('.confirm-backdrop')){e.preventDefault();$('#searchInput').focus()}});
$('#themeToggle').addEventListener('click',e=>{e.stopPropagation();applyTheme(document.body.classList.contains('dark')?'light':'dark')});
let exportImages = [], exportPage = 0, exportGeneration = 0, exportFilename = '';
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function exportJsonBackup() {
  const exportData = { ...state, trip: { ...trip } };
  downloadBlob(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), 'packflow-list.json');
}
function clearImageExport() {
  exportGeneration++;
  exportImages.forEach(image => URL.revokeObjectURL(image.url));
  exportImages = []; exportPage = 0;
  $('#exportPreview').removeAttribute('src'); $('#exportPreview').hidden = true;
  $('#exportPages').hidden = true; $('#exportPageHint').hidden = true;
  $('#saveImageBtn').disabled = true;
}
function showExportPage() {
  const image = exportImages[exportPage];
  if (!image) return;
  $('#exportPreview').src = image.url; $('#exportPreview').hidden = false;
  $('#exportPreview').alt = `清单图片预览，第 ${exportPage + 1} 张，共 ${exportImages.length} 张`;
  $('#exportPreviewStage').scrollTop = 0;
  $('#exportPages').hidden = exportImages.length <= 1;
  $('#exportPageHint').hidden = exportImages.length <= 1;
  $('#exportPageLabel').textContent = `${exportPage + 1} / ${exportImages.length}`;
  $('#exportPrevPage').disabled = exportPage === 0;
  $('#exportNextPage').disabled = exportPage === exportImages.length - 1;
  $('#saveImageBtn').disabled = false;
  $('#saveImageBtn').textContent = exportImages.length > 1 ? `保存第 ${exportPage + 1} 张图片` : '保存 PNG 图片';
}
async function renderExportPreview() {
  clearImageExport();
  const generation = exportGeneration;
  $('#exportImageStatus').textContent = '正在排版清单…';
  $('#exportPreviewStage').setAttribute('aria-busy', 'true');
  const filtered = $('#exportScope').value === 'visible', visible = filtered ? visibleItems() : [];
  const groups = (filtered ? visibleGroups() : state.groups).map(group => ({
    ...group,
    items: (filtered ? visible.filter(item => item.group.id === group.id).map(item => group.items[item.index]) : group.items).map(item => [...item])
  }));
  const now = new Date(), date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('.');
  exportFilename = `${trip.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').slice(0, 80).trim() || 'PackFlow清单'}-${date}`;
  try {
    const blobs = await window.PackFlowImage.render({ name: trip.name, groups, date, scopeLabel: filtered ? '当前筛选结果' : '完整清单' });
    if (generation !== exportGeneration) return;
    exportImages = blobs.map(blob => ({ blob, url: URL.createObjectURL(blob) }));
    showExportPage();
    $('#exportImageStatus').textContent = `PNG 高清图片 · ${exportImages.length} 张 · 在本机生成`;
  } catch (error) {
    if (generation !== exportGeneration) return;
    $('#exportImageStatus').textContent = error.message || '图片生成失败，请重试';
    showToast(error.message || '图片生成失败，请重试', 'error');
  } finally {
    if (generation === exportGeneration) $('#exportPreviewStage').setAttribute('aria-busy', 'false');
  }
}
function openExportModal() {
  $('#exportScope').value = 'all';
  openModal('exportModal');
  renderExportPreview();
}
$('#exportBtn').addEventListener('click', event => { event.stopPropagation(); openExportModal(); });
$('#exportJsonBtn').addEventListener('click', exportJsonBackup);
$('#exportScope').addEventListener('change', renderExportPreview);
$('#exportPrevPage').addEventListener('click', () => { if (exportPage > 0) { exportPage--; showExportPage(); } });
$('#exportNextPage').addEventListener('click', () => { if (exportPage < exportImages.length - 1) { exportPage++; showExportPage(); } });
$('#saveImageBtn').addEventListener('click', () => {
  const image = exportImages[exportPage];
  if (!image) return;
  const suffix = exportImages.length > 1 ? `-${exportPage + 1}` : '';
  downloadBlob(image.blob, `${exportFilename}${suffix}.png`);
  showToast('图片已导出，可在下载中查看');
});
applyTheme(preferredTheme); render();
