const PART_SPRITES={'Big Body':[0,0],'Gyronaut':[25,0],'Kinoflectic Arm':[50,0],'Swinger':[75,0],'Bash Bars':[100,0],'Blast Basher':[0,100],'Kinoflect Basher':[25,100],'Plow Basher':[50,100],'Power Basher':[75,100],'Stun Basher':[100,100]};
const sprite=(name,cls='')=>{const p=PART_SPRITES[name];return p?`<span class="part-sprite ${cls}" data-part="${name}" role="img" aria-label="${name}" style="background-position:${p[0]}% ${p[1]}%"></span>`:''};
const style=document.createElement('style');style.textContent=`.part-sprite{display:block;width:100%;height:100%;min-height:74px;background-image:url('images/parts-sprite.jpg');background-repeat:no-repeat;background-size:500% 200%;background-color:#17190f}.component>.part-sprite{width:74px;height:62px;min-height:62px;margin:2px auto 5px;border:1px solid #55583b}.weapon-art>.part-sprite{width:100%;height:100%;min-height:96px}.detail-part-icon{width:min(260px,72vw);height:170px;min-height:170px;margin:8px auto 16px;border:2px solid #72764b}.part-picker{max-width:390px;margin:0 auto 6px;background:#20251d;border:1px solid #454b3c}.part-picker>summary{list-style:none;cursor:pointer;padding:13px 15px;background:#aaa96b;color:#fff;font:15px 'Black Ops One';outline:2px solid #f2d329;display:flex;justify-content:space-between;align-items:center}.part-picker>summary::-webkit-details-marker{display:none}.part-picker>summary:after{content:'▼';font-size:12px}.part-picker[open]>summary:after{content:'▲'}.part-picker .part-tabs{padding:5px;margin:0;display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.part-picker .part-tabs button{width:100%;min-height:68px}@media(max-width:520px){.part-picker{max-width:none}.part-picker>summary{font-size:12px}.part-picker .part-tabs button{width:100%;font-size:9px}}`;document.head.appendChild(style);
function ensureSprite(parent,name,cls=''){
  if(!parent||!PART_SPRITES[name])return;
  const existing=parent.querySelector(':scope > .part-sprite');
  if(existing&&existing.dataset.part===name&&(!cls||existing.classList.contains(cls)))return;
  if(existing)existing.remove();
  parent.insertAdjacentHTML('afterbegin',sprite(name,cls));
}
function applyPartImages(){
  document.querySelectorAll('.weapon-tile').forEach(card=>{
    const n=card.dataset.name;if(!PART_SPRITES[n])return;
    const box=card.querySelector('.weapon-art');if(!box)return;
    const existing=box.querySelector(':scope > .part-sprite');
    if(existing&&existing.dataset.part===n)return;
    box.innerHTML=sprite(n);
  });
  ['leftArm','rightArm','bashGuard'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const strong=el.querySelector('strong'),n=strong&&strong.textContent.trim();
    ensureSprite(el,n);
  });
  const d=document.getElementById('detail');
  if(d&&d.classList.contains('open')){
    const h=d.querySelector('h2'),n=h&&h.textContent.trim();
    if(PART_SPRITES[n]){
      const existing=d.querySelector(':scope > .detail-part-icon');
      if(!existing||existing.dataset.part!==n){
        if(existing)existing.remove();
        const kicker=d.querySelector('.detail-kicker');
        if(kicker)kicker.insertAdjacentHTML('beforebegin',sprite(n,'detail-part-icon'));
      }
    }
  }
}
let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;applyPartImages()});
});
observer.observe(document.body,{subtree:true,childList:true});
applyPartImages();
const picker=document.querySelector('.part-picker');
const pickerLabel=document.getElementById('partMenuLabel');
document.querySelectorAll('.part-tabs button').forEach(btn=>btn.addEventListener('click',()=>{
  if(pickerLabel)pickerLabel.textContent=btn.dataset.view==='weapon'?'WEAPONS':btn.dataset.view==='arm'?'ARMS':'BASH GUARDS';
  if(picker)picker.open=false;
}));