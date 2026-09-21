(()=>{
const section=document.querySelector('.addon-section');
const grid=document.querySelector('#addonGrid');
const search=document.querySelector('#addonSearch');
const count=document.querySelector('#addonCount');
if(!section||!grid||!search||!count)return;
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const all=(window.ADDONS||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
function render(){
  const q=search.value.trim().toLowerCase();
  const list=q?all.filter(item=>item.name.toLowerCase().includes(q)):all;
  count.textContent=`${list.length} / ${all.length}`;
  grid.innerHTML=list.map(item=>`<div class="weapon-tile addon-tile"><div class="weapon-art"><img class="addon-game-icon" data-addon="${esc(item.name)}" alt="${esc(item.name)}" loading="lazy" decoding="async"></div><strong>${esc(item.name)}</strong></div>`).join('');
  if(section.open)window.refreshAddonIcons?.();
}
search.addEventListener('input',render);
section.addEventListener('toggle',()=>{if(section.open)window.refreshAddonIcons?.()});
render();
})();