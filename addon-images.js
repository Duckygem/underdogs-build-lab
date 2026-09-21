(()=>{
const MODULE_URL='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/dist/index.mjs';
const WASM_PATH='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/wasm';
let decoderPromise=null;
const cache=new Map();
function bytes64(value){const raw=atob(value),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function astcInfo(data){const u24=i=>data[i]|data[i+1]<<8|data[i+2]<<16;return{bw:data[4],bh:data[5],w:u24(7),h:u24(10)}}
function decoder(){if(!decoderPromise)decoderPromise=import(MODULE_URL).then(async m=>{await m.initialize({wasmPath:WASM_PATH});return m});return decoderPromise}
function cleanItem(rgba,w,h){
  const cw=Math.floor(w/2),pix=new Uint8ClampedArray(cw*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<cw;x++){const s=((h-1-y)*w+x)*4,d=(y*cw+x)*4;pix[d]=rgba[s];pix[d+1]=rgba[s+1];pix[d+2]=rgba[s+2];pix[d+3]=255}
  let br=0,bg=0,bb=0,n=0;
  const sample=(x,y)=>{const i=(y*cw+x)*4;br+=pix[i];bg+=pix[i+1];bb+=pix[i+2];n++};
  for(let x=0;x<cw;x++){sample(x,0);sample(x,h-1)}
  for(let y=1;y<h-1;y++){sample(0,y);sample(cw-1,y)}
  br/=n;bg/=n;bb/=n;
  const seen=new Uint8Array(cw*h),qx=new Int16Array(cw*h),qy=new Int16Array(cw*h);let head=0,tail=0;
  const isBg=(x,y)=>{const i=(y*cw+x)*4,r=pix[i],g=pix[i+1],b=pix[i+2],dr=r-br,dg=g-bg,db=b-bb;return Math.max(r,g,b)<78&&dr*dr+dg*dg+db*db<1200};
  const push=(x,y)=>{const p=y*cw+x;if(seen[p]||!isBg(x,y))return;seen[p]=1;qx[tail]=x;qy[tail]=y;tail++};
  for(let x=0;x<cw;x++){push(x,0);push(x,h-1)}for(let y=1;y<h-1;y++){push(0,y);push(cw-1,y)}
  while(head<tail){const x=qx[head],y=qy[head++];if(x)push(x-1,y);if(x+1<cw)push(x+1,y);if(y)push(x,y-1);if(y+1<h)push(x,y+1)}
  for(let p=0;p<seen.length;p++)if(seen[p])pix[p*4+3]=0;
  let x0=cw,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<cw;x++)if(pix[(y*cw+x)*4+3]>20){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<x0){x0=0;y0=0;x1=cw-1;y1=h-1}
  x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(cw-1,x1+2);y1=Math.min(h-1,y1+2);
  const src=document.createElement('canvas');src.width=cw;src.height=h;src.getContext('2d').putImageData(new ImageData(pix,cw,h),0,0);
  const out=document.createElement('canvas');out.width=256;out.height=192;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const sw=x1-x0+1,sh=y1-y0+1,scale=Math.min(228/sw,164/sh),dw=Math.round(sw*scale),dh=Math.round(sh*scale);
  ctx.drawImage(src,x0,y0,sw,sh,Math.round((256-dw)/2),Math.round((192-dh)/2),dw,dh);return out
}
async function make(name){
  if(cache.has(name))return cache.get(name);
  const encoded=window.ADDON_ICON_ASTC?.[name];if(!encoded)throw new Error('Missing icon data');
  const astc=bytes64(encoded),i=astcInfo(astc),m=await decoder(),bgra=await m.decode_astc(astc.subarray(16),i.w,i.h,i.bw,i.bh);
  const rgba=new Uint8ClampedArray(bgra.length);for(let p=0;p<bgra.length;p+=4){rgba[p]=bgra[p+2];rgba[p+1]=bgra[p+1];rgba[p+2]=bgra[p];rgba[p+3]=bgra[p+3]}
  const canvas=cleanItem(rgba,i.w,i.h),blob=await new Promise(r=>canvas.toBlob(r,'image/webp',.98)),url=URL.createObjectURL(blob);cache.set(name,url);return url
}
async function load(img){if(!img||img.dataset.iconReady||img.dataset.iconLoading)return;img.dataset.iconLoading='1';try{img.src=await make(img.dataset.addon);img.dataset.iconReady='1'}catch(e){console.warn('UNDERDOGS Build Lab: add-on icon failed',img.dataset.addon,e);img.classList.add('addon-icon-failed')}finally{delete img.dataset.iconLoading}}
let observer;function refresh(){if(!observer)observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){observer.unobserve(e.target);load(e.target)}}),{rootMargin:'240px 0px'});document.querySelectorAll('img.addon-game-icon[data-addon]:not([data-observed])').forEach(img=>{img.dataset.observed='1';observer.observe(img)})}
window.refreshAddonIcons=()=>requestAnimationFrame(refresh);
})();