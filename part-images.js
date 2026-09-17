const PART_SPRITES={
  'Big Body':[0,0],
  'Gyronaut':[25,0],
  'Kinoflectic Arm':[50,0],
  'Swinger':[75,0],
  'Bash Bars':[100,0],
  'Blast Basher':[0,100],
  'Kinoflect Basher':[25,100],
  'Plow Basher':[50,100],
  'Power Basher':[75,100],
  'Stun Basher':[100,100]
};

function sprite(name,cls=''){
  const p=PART_SPRITES[name];
  if(!p)return '';
  return `<span class="part-sprite ${cls}" data-part="${name}" role="img" aria-label="${name}" style="background-position:${p[0]}% ${p[1]}%"></span>`;
}

const style=document.createElement('style');
style.textContent=`
.part-sprite{display:block;width:100%;height:100%;min-height:74px;background-image:url('images/parts-sprite.jpg');background-repeat:no-repeat;background-size:500% 200%;background-color:#17190f}
.component>.part-sprite{width:74px;height:62px;min-height:62px;margin:2px auto 5px;border:1px solid #55583b}
.weapon-art>.part-sprite{width:100%;height:100%;min-height:96px}
.detail-part-icon{width:min(260px,72vw);height:170px;min-height:170px;margin:8px auto 16px;border:2px solid #72764b}
.gear-menus{display:grid;gap:14px;margin-top:16px;margin-bottom:10px}
.gear-section{background:#181c16;border:2px solid #454b3c;box-shadow:0 3px 0 rgba(0,0,0,.25)}
.gear-section>summary{box-sizing:border-box;width:100%;min-height:64px;list-style:none;cursor:pointer;padding:18px 20px;background:#555c49;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px;position:relative;border-left:6px solid #777d62}
.gear-section>summary::-webkit-details-marker{display:none}
.gear-section>summary b{font:21px 'Black Ops One';letter-spacing:.025em;line-height:1;flex:1 1 auto}
.gear-section>summary span{flex:0 0 auto;margin-left:18px;margin-right:30px;color:#e2e4d5;font-size:11px;font-weight:900;letter-spacing:.09em;white-space:nowrap}
.gear-section>summary:after{content:'▶';position:absolute;right:16px;color:#f2d329;font-size:16px;line-height:1}
.gear-section[open]>summary{background:#8a895c;border-left-color:#f2d329;box-shadow:inset 0 -3px #f2d329}
.gear-section[open]>summary:after{content:'▼'}
.gear-content{background:#181c16;padding-top:4px}
.gear-section .controls{border-top:0}
.gear-section .game-panel{padding-top:7px}
@media(max-width:520px){
  .gear-menus{gap:11px;margin-top:13px}
  .gear-section>summary{min-height:58px;padding:16px 16px;gap:12px;border-left-width:5px}
  .gear-section>summary b{font-size:17px}
  .gear-section>summary span{font-size:9px;margin-left:10px;margin-right:26px}
  .gear-section>summary:after{right:12px;font-size:14px}
}
`;
document.head.appendChild(style);

function setSprite(parent,name,cls=''){
  if(!parent||!PART_SPRITES[name])return;
  const old=parent.querySelector(':scope > .part-sprite');
  if(old&&old.dataset.part===name)return;
  if(old)old.remove();
  parent.insertAdjacentHTML('afterbegin',sprite(name,cls));
}

function applyPartImages(){
  document.querySelectorAll('.weapon-tile').forEach(card=>{
    const name=card.dataset.name;
    if(!PART_SPRITES[name])return;
    const box=card.querySelector('.weapon-art');
    if(!box)return;
    const old=box.querySelector(':scope > .part-sprite');
    if(old&&old.dataset.part===name)return;
    box.innerHTML=sprite(name);
  });

  ['leftArm','rightArm','bashGuard'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const label=el.querySelector('strong');
    const name=label?label.textContent.trim():'';
    setSprite(el,name);
  });

  const detail=document.getElementById('detail');
  if(detail&&detail.classList.contains('open')){
    const title=detail.querySelector('h2');
    const name=title?title.textContent.trim():'';
    if(PART_SPRITES[name]){
      const old=detail.querySelector(':scope > .detail-part-icon');
      if(!old||old.dataset.part!==name){
        if(old)old.remove();
        const kicker=detail.querySelector('.detail-kicker');
        if(kicker)kicker.insertAdjacentHTML('beforebegin',sprite(name,'detail-part-icon'));
      }
    }
  }
}

function refreshAfterUi(){requestAnimationFrame(applyPartImages)}

const gearSections=[...document.querySelectorAll('.gear-section')];
const controls=document.querySelector('.controls');
const gamePanel=document.querySelector('.game-panel');

function activateGearSection(section){
  if(!section)return;
  gearSections.forEach(other=>{if(other!==section)other.open=false});
  const mount=section.querySelector('.gear-content');
  if(mount){
    if(controls)mount.appendChild(controls);
    if(gamePanel)mount.appendChild(gamePanel);
  }
  const view=section.dataset.view;
  if(typeof setView==='function')setView(view);
  refreshAfterUi();
}

gearSections.forEach(section=>section.addEventListener('toggle',()=>{
  if(section.open)activateGearSection(section);
}));

document.addEventListener('click',e=>{
  const slot=e.target.closest('.equip-slot');
  if(slot){
    const id=slot.id;
    const view=id.includes('Arm')?'arm':id==='bashGuard'?'bash':'weapon';
    const section=gearSections.find(s=>s.dataset.view===view);
    if(section){section.open=true;activateGearSection(section)}
  }
  refreshAfterUi();
});

const search=document.getElementById('search');
if(search)search.addEventListener('input',refreshAfterUi);

const initial=gearSections.find(s=>s.open)||gearSections[0];
if(initial)activateGearSection(initial);
applyPartImages();