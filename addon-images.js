(()=>{
const MODULE_URL='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/dist/index.mjs';
const WASM_PATH='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/wasm';
let decoderPromise=null;
function bytesFromBase64(value){
  const raw=atob(value),out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
function parseASTC(data){
  if(data.length<16||data[0]!==0x13||data[1]!==0xAB||data[2]!==0xA1||data[3]!==0x5C)throw new Error('Invalid ASTC icon data');
  const u24=i=>data[i]|(data[i+1]<<8)|(data[i+2]<<16);
  return {blockWidth:data[4],blockHeight:data[5],width:u24(7),height:u24(10)};
}
function ensureDecoder(){
  if(!decoderPromise){
    decoderPromise=import(MODULE_URL).then(async mod=>{
      await mod.initialize({wasmPath:WASM_PATH});
      return mod;
    });
  }
  return decoderPromise;
}
async function renderCanvas(canvas){
  if(!canvas||canvas.dataset.iconReady||canvas.dataset.iconLoading)return;
  const encoded=window.ADDON_ICON_ASTC?.[canvas.dataset.addon];
  if(!encoded)return;
  canvas.dataset.iconLoading='1';
  try{
    const astc=bytesFromBase64(encoded);
    const header=parseASTC(astc);
    const mod=await ensureDecoder();
    const bgra=await mod.decode_astc(astc.subarray(16),header.width,header.height,header.blockWidth,header.blockHeight);
    if(!bgra)throw new Error('ASTC decode returned no pixels');
    const rgba=new Uint8ClampedArray(bgra.length);
    for(let i=0;i<bgra.length;i+=4){
      rgba[i]=bgra[i+2]; rgba[i+1]=bgra[i+1]; rgba[i+2]=bgra[i]; rgba[i+3]=bgra[i+3];
    }
    const temp=document.createElement('canvas');
    temp.width=header.width; temp.height=header.height;
    temp.getContext('2d').putImageData(new ImageData(rgba,header.width,header.height),0,0);
    canvas.width=header.width; canvas.height=header.height;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,header.width,header.height);
    ctx.save();
    ctx.translate(0,header.height);
    ctx.scale(1,-1);
    ctx.drawImage(temp,0,0);
    ctx.restore();
    canvas.dataset.iconReady='1';
  }catch(error){
    console.warn('UNDERDOGS Build Lab: add-on icon decode failed for',canvas.dataset.addon,error);
    canvas.classList.add('addon-icon-failed');
  }finally{
    delete canvas.dataset.iconLoading;
  }
}
function refresh(){
  if(!document.querySelector('.addon-section[open]'))return;
  document.querySelectorAll('canvas.addon-game-icon[data-addon]').forEach(renderCanvas);
}
window.refreshAddonIcons=()=>requestAnimationFrame(refresh);
})();