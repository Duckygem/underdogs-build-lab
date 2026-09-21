(()=>{
const MODULE_URL='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/dist/index.mjs';
const WASM_PATH='https://cdn.jsdelivr.net/npm/texture2ddecoder-wasm@1.2.2/wasm';
const CROP_RATIO=.46, OUT_W=320, OUT_H=240;
let decoderPromise=null;
const cache=new Map();

function b64(value){const raw=atob(value),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function info(data){const u24=i=>data[i]|data[i+1]<<8|data[i+2]<<16;return{bw:data[4],bh:data[5],w:u24(7),h:u24(10)}}
function decoder(){if(!decoderPromise)decoderPromise=import(MODULE_URL).then(async m=>{await m.initialize({wasmPath:WASM_PATH});return m});return decoderPromise}
function median(a){a.sort((x,y)=>x-y);return a[a.length>>1]||0}

function itemCanvas(rgba,w,h){
  const cw=Math.max(1,Math.round(w*CROP_RATIO)), n=cw*h;
  const rgb=new Uint8ClampedArray(n*4);
  const rs=[],gs=[],bs=[];
  for(let y=0;y<h;y++)for(let x=0;x<cw;x++){
    const s=((h-1-y)*w+x)*4,d=(y*cw+x)*4;
    rgb[d]=rgba[s];rgb[d+1]=rgba[s+1];rgb[d+2]=rgba[s+2];rgb[d+3]=255;
    if(y<3||y>=h-3||x<3||x>=cw-3){rs.push(rgb[d]);gs.push(rgb[d+1]);bs.push(rgb[d+2])}
  }
  const br=median(rs),bg=median(gs),bb=median(bs);
  const strong=new Uint8Array(n),weak=new Uint8Array(n);
  for(let p=0;p<n;p++){
    const i=p*4,r=rgb[i],g=rgb[i+1],b=rgb[i+2];
    const dr=r-br,dg=g-bg,db=b-bb,dist=Math.sqrt(dr*dr+dg*dg+db*db);
    const hi=Math.max(r,g,b),lo=Math.min(r,g,b),chroma=hi-lo;
    strong[p]=(dist>48||hi>108||chroma>52)?1:0;
    weak[p]=(dist>21||hi>56||chroma>25)?1:0;
  }

  const seen=new Uint8Array(n), comps=[];
  const q=new Int32Array(n);
  for(let seed=0;seed<n;seed++){
    if(!strong[seed]||seen[seed])continue;
    let head=0,tail=0,area=0,minX=cw,minY=h,maxX=-1,maxY=-1,sumX=0,sumY=0,touchRight=false;
    q[tail++]=seed;seen[seed]=1;
    while(head<tail){
      const p=q[head++],x=p%cw,y=(p/cw)|0;
      area++;sumX+=x;sumY+=y;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;if(x>=cw-3)touchRight=true;
      for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(cw-1,x+1);xx++){
        const np=yy*cw+xx;if(seen[np]||!weak[np])continue;seen[np]=1;q[tail++]=np;
      }
    }
    if(area>=4)comps.push({area,minX,minY,maxX,maxY,cx:sumX/area,cy:sumY/area,touchRight,pixels:Array.from(q.slice(0,tail))});
  }
  if(!comps.length)return null;

  const centerX=cw*.42,centerY=h*.5;
  comps.forEach(c=>{const dx=(c.cx-centerX)/cw,dy=(c.cy-centerY)/h;c.score=c.area/(1+3*(dx*dx+dy*dy))});
  comps.sort((a,b)=>b.score-a.score);
  const main=comps[0], keep=new Uint8Array(n);
  const expandX=Math.max(12,(main.maxX-main.minX)*.24),expandY=Math.max(12,(main.maxY-main.minY)*.24);
  const near=c=>!(c.maxX<main.minX-expandX||c.minX>main.maxX+expandX||c.maxY<main.minY-expandY||c.minY>main.maxY+expandY);
  for(const c of comps){
    const ok=c===main || (near(c)&&c.area>=Math.max(5,main.area*.004)&&!(c.touchRight&&c.area<main.area*.08));
    if(ok)for(const p of c.pixels)keep[p]=1;
  }

  for(let pass=0;pass<2;pass++){
    const add=[];
    for(let p=0;p<n;p++)if(keep[p]){
      const x=p%cw,y=(p/cw)|0;
      for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(cw-1,x+1);xx++){
        const np=yy*cw+xx;if(!keep[np]&&weak[np])add.push(np);
      }
    }
    for(const p of add)keep[p]=1;
  }

  let x0=cw,y0=h,x1=-1,y1=-1;
  for(let p=0;p<n;p++){
    const i=p*4;
    if(!keep[p]){rgb[i]=0;rgb[i+1]=0;rgb[i+2]=0;rgb[i+3]=0;continue}
    rgb[i+3]=255;
    const x=p%cw,y=(p/cw)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
  }
  if(x1<x0)return null;
  x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(cw-1,x1+3);y1=Math.min(h-1,y1+3);

  const src=document.createElement('canvas');src.width=cw;src.height=h;src.getContext('2d').putImageData(new ImageData(rgb,cw,h),0,0);
  const out=document.createElement('canvas');out.width=OUT_W;out.height=OUT_H;
  const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const sw=x1-x0+1,sh=y1-y0+1,scale=Math.min(292/sw,212/sh),dw=Math.round(sw*scale),dh=Math.round(sh*scale);
  ctx.drawImage(src,x0,y0,sw,sh,Math.round((OUT_W-dw)/2),Math.round((OUT_H-dh)/2),dw,dh);
  return out;
}

async function make(name){
  if(cache.has(name))return cache.get(name);
  const encoded=window.ADDON_ICON_ASTC?.[name];if(!encoded)throw new Error('Missing icon data');
  const astc=b64(encoded),i=info(astc),m=await decoder(),bgra=await m.decode_astc(astc.subarray(16),i.w,i.h,i.bw,i.bh);
  if(!bgra)throw new Error('Decode failed');
  const rgba=new Uint8ClampedArray(bgra.length);for(let p=0;p<bgra.length;p+=4){rgba[p]=bgra[p+2];rgba[p+1]=bgra[p+1];rgba[p+2]=bgra[p];rgba[p+3]=bgra[p+3]}
  const canvas=itemCanvas(rgba,i.w,i.h);if(!canvas)throw new Error('No foreground item found');
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png')),url=blob?URL.createObjectURL(blob):canvas.toDataURL('image/png');cache.set(name,url);return url
}
async function load(img){if(!img||img.dataset.iconReady||img.dataset.iconLoading)return;img.dataset.iconLoading='1';try{img.src=await make(img.dataset.addon);img.dataset.iconReady='1'}catch(e){console.warn('UNDERDOGS Build Lab: add-on icon failed',img.dataset.addon,e);img.classList.add('addon-icon-failed')}finally{delete img.dataset.iconLoading}}
let observer;function refresh(){if(!observer)observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){observer.unobserve(e.target);load(e.target)}}),{rootMargin:'240px 0px'});document.querySelectorAll('img.addon-game-icon[data-addon]:not([data-observed])').forEach(img=>{img.dataset.observed='1';observer.observe(img)})}
window.refreshAddonIcons=()=>requestAnimationFrame(refresh);
})();