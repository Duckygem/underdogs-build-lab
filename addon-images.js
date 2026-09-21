(()=>{
const MODULE_URL='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/dist/index.mjs';
const WASM_PATH='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/wasm';
const CROP_RATIO=.52;
let decoderPromise=null;
const cache=new Map();
function bytesFromBase64(value){
  const raw=atob(value),out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
function parseASTC(data){
  const u24=i=>data[i]|(data[i+1]<<8)|(data[i+2]<<16);
  return {blockWidth:data[4],blockHeight:data[5],width:u24(7),height:u24(10)};
}
function decoder(){
  if(!decoderPromise)decoderPromise=import(MODULE_URL).then(async mod=>{
    await mod.initialize({wasmPath:WASM_PATH});
    return mod;
  });
  return decoderPromise;
}
async function makeImage(name){
  if(cache.has(name))return cache.get(name);
  const encoded=window.ADDON_ICON_ASTC?.[name];
  if(!encoded)throw new Error('Missing icon');
  const astc=bytesFromBase64(encoded),header=parseASTC(astc),mod=await decoder();
  const bgra=await mod.decode_astc(astc.subarray(16),header.width,header.height,header.blockWidth,header.blockHeight);
  if(!bgra)throw new Error('Decode failed');
  const rgba=new Uint8ClampedArray(bgra.length);
  for(let i=0;i<bgra.length;i+=4){
    rgba[i]=bgra[i+2];rgba[i+1]=bgra[i+1];rgba[i+2]=bgra[i];rgba[i+3]=bgra[i+3];
  }
  const full=document.createElement('canvas');
  full.width=header.width;full.height=header.height;
  const fctx=full.getContext('2d');
  fctx.putImageData(new ImageData(rgba,header.width,header.height),0,0);
  const cropW=Math.round(header.width*CROP_RATIO);
  const out=document.createElement('canvas');
  out.width=cropW;out.height=header.height;
  const ctx=out.getContext('2d');
  ctx.translate(0,header.height);
  ctx.scale(1,-1);
  ctx.drawImage(full,0,0,cropW,header.height,0,0,cropW,header.height);
  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/webp',.96));
  const url=blob?URL.createObjectURL(blob):out.toDataURL('image/png');
  cache.set(name,url);
  return url;
}
async function load(img){
  if(!img||img.dataset.iconReady||img.dataset.iconLoading)return;
  img.dataset.iconLoading='1';
  try{
    img.src=await makeImage(img.dataset.addon);
    img.dataset.iconReady='1';
  }catch(error){
    console.warn('UNDERDOGS Build Lab: add-on icon failed for',img.dataset.addon,error);
    img.classList.add('addon-icon-failed');
  }finally{delete img.dataset.iconLoading}
}
let observer;
function refresh(){
  if(!observer)observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target)}
    });
  },{rootMargin:'240px 0px'});
  document.querySelectorAll('img.addon-game-icon[data-addon]:not([data-observed])').forEach(img=>{
    img.dataset.observed='1';observer.observe(img);
  });
}
window.refreshAddonIcons=()=>requestAnimationFrame(refresh);
})();