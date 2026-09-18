(()=>{
const PART_SPRITES=window.PART_SPRITES={
  'Big Boy':[0,0],
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

const HQ_PART_CHUNKS=[
  'images/parts-sprite-opt.00.b64',
  'images/parts-sprite-opt.01.b64',
  'images/parts-sprite-opt.02.b64',
  'images/parts-sprite-opt.03.b64',
  'images/parts-sprite-opt.04.b64'
];

function sprite(name,cls=''){
  const p=PART_SPRITES[name];
  if(!p)return '';
  return `<span class="part-sprite ${cls}" data-part="${name}" role="img" aria-label="${name}" style="background-position:${p[0]}% ${p[1]}%"></span>`;
}
window.partSprite=sprite;

const style=document.createElement('style');
style.textContent=`
:root{--part-sprite:url('images/parts-sprite.jpg?v=20260917b')}
.part-sprite{display:block;width:100%;height:100%;min-height:74px;background-image:var(--part-sprite);background-repeat:no-repeat;background-size:500% 200%;background-color:#17190f}
.component>.part-sprite{width:74px;height:62px;min-height:62px;margin:2px auto 5px;border:1px solid #55583b}
.weapon-art>.part-sprite{width:100%;height:100%;min-height:96px}
.detail-part-icon{width:min(260px,72vw);height:170px;min-height:170px;margin:8px auto 16px;border:2px solid #72764b}
.gear-menus{display:grid;gap:20px;margin-top:20px;margin-bottom:14px}
.gear-section{background:#181c16;border:2px solid #454b3c;box-shadow:0 3px 0 rgba(0,0,0,.25)}
.gear-section>summary{box-sizing:border-box;width:100%;min-height:82px;list-style:none;cursor:pointer;padding:22px 64px 22px 26px;background:#555c49;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:24px;position:relative;border-left:7px solid #777d62}
.gear-section>summary::-webkit-details-marker{display:none}
.gear-section>summary b{font:26px 'Black Ops One';letter-spacing:.025em;line-height:1;flex:1 1 auto}
.gear-section>summary span{flex:0 0 auto;margin:0;color:#f4f3df;background:#343a2e;border:1px solid #747a63;padding:9px 12px;font-size:12px;font-weight:900;letter-spacing:.1em;white-space:nowrap}
.gear-section>summary:after{content:'▶';position:absolute;right:24px;color:#f2d329;font-size:20px;line-height:1}
.gear-section[open]>summary{background:#8a895c;border-left-color:#f2d329;box-shadow:inset 0 -4px #f2d329}
.gear-section[open]>summary:after{content:'▼'}
.gear-content{background:#181c16;padding-top:6px}
.gear-section .controls{border-top:0}
.gear-section .game-panel{padding-top:7px}
@media(max-width:520px){
  .gear-menus{gap:14px;margin-top:14px}
  .gear-section>summary{min-height:70px;padding:18px 54px 18px 18px;gap:14px;border-left-width:6px}
  .gear-section>summary b{font-size:20px}
  .gear-section>summary span{font-size:10px;padding:7px 9px;margin:0}
  .gear-section>summary:after{right:18px;font-size:17px}
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

async function loadHQPartSprite(){
  try{
    const responses=await Promise.all(HQ_PART_CHUNKS.map(path=>fetch(`${path}?v=20260918a`,{cache:'force-cache'})));
    if(responses.some(response=>!response.ok))throw new Error('HQ sprite chunk failed to load');
    const chunks=await Promise.all(responses.map(response=>response.text()));
    const base64=chunks.map(chunk=>chunk.trim()).join('');
    if(base64.length!==37012)throw new Error('HQ sprite data was incomplete');

    const source=`data:image/avif;base64,${base64}`;
    await new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=resolve;
      image.onerror=()=>reject(new Error('Browser could not decode HQ AVIF sprite'));
      image.src=source;
    });

    document.documentElement.style.setProperty('--part-sprite',`url("${source}")`);
    document.documentElement.dataset.partArt='hq';
    refreshAfterUi();
  }catch(error){
    console.warn('UNDERDOGS Build Lab: keeping fallback part art.',error);
  }
}

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

const gearSearchInput=document.getElementById('search');
if(gearSearchInput)gearSearchInput.addEventListener('input',refreshAfterUi);

const initial=gearSections.find(s=>s.open);
if(initial)activateGearSection(initial);
applyPartImages();
loadHQPartSprite();
})();
