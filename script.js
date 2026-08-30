const fileInput=document.getElementById('file'),drop=document.getElementById('drop');
const compressBtn=document.getElementById('compress'),statusEl=document.getElementById('status');
const result=document.getElementById('result'),preview=document.getElementById('preview');
const originalEl=document.getElementById('original'),compressedEl=document.getElementById('compressed'),reductionEl=document.getElementById('reduction');
const targetEl=document.getElementById('target'),formatEl=document.getElementById('format'),downloadBtn=document.getElementById('download');
let selected=null, outputBlob=null;

drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});
drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');setFile(e.dataTransfer.files[0])});
fileInput.addEventListener('change',()=>setFile(fileInput.files[0]));

function setFile(f){
  if(!f || !f.type.startsWith('image/')){showError('Please choose an image file.');return}
  selected=f; compressBtn.disabled=false; result.style.display='none';
  statusEl.className='status';
  statusEl.textContent=`Selected: ${f.name} (${fmt(f.size)})`;
}
function showError(msg){statusEl.textContent=msg;statusEl.className='status error'}
function fmt(bytes){return bytes<1024?bytes+' B':bytes<1048576?(bytes/1024).toFixed(1)+' KB':(bytes/1048576).toFixed(2)+' MB'}
function loadImage(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=URL.createObjectURL(file)})}

async function makeBlob(img,type,quality,maxW){
  let w=img.naturalWidth,h=img.naturalHeight;
  if(maxW && w>maxW){h=Math.round(h*maxW/w);w=maxW}
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0,w,h);
  return new Promise(resolve=>canvas.toBlob(resolve,type,type==='image/png'?undefined:quality));
}

async function compress(){
  if(!selected)return;
  compressBtn.disabled=true; statusEl.className='status'; statusEl.textContent='Compressing…'; result.style.display='none';
  const target=Math.max(5,Number(targetEl.value)||100)*1024;
  const type=formatEl.value;
  try{
    const img=await loadImage(selected);
    let best=null, maxW=img.naturalWidth;
    for(let pass=0;pass<8;pass++){
      if(type==='image/png'){
        const b=await makeBlob(img,type,1,maxW);
        if(!best || b.size<best.size)best=b;
      }else{
        let lo=.05,hi=.98,candidate=null;
        for(let i=0;i<12;i++){
          const q=(lo+hi)/2,b=await makeBlob(img,type,q,maxW);
          candidate=b;
          if(b.size>target)hi=q; else lo=q;
        }
        const low=await makeBlob(img,type,lo,maxW);
        const high=await makeBlob(img,type,hi,maxW);
        candidate = Math.abs(low.size-target)<Math.abs(high.size-target)?low:high;
        if(!best || Math.abs(candidate.size-target)<Math.abs(best.size-target))best=candidate;
      }
      if(best.size<=target || maxW<500)break;
      maxW=Math.max(500,Math.round(maxW*.8));
    }
    outputBlob=best;
    preview.src=URL.createObjectURL(best);
    originalEl.textContent=fmt(selected.size); compressedEl.textContent=fmt(best.size);
    reductionEl.textContent=Math.max(0,Math.round((1-best.size/selected.size)*100))+'%'; const r2=document.getElementById('reduction2'); if(r2) r2.textContent=reductionEl.textContent;
    result.style.display='block';
    statusEl.textContent=best.size<=target?'Done — target reached.':'Done — this is the smallest result found; try a larger target or JPG/WebP.';
    downloadBtn.onclick=()=>{
      const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
      const a=document.createElement('a');a.href=URL.createObjectURL(outputBlob);a.download=`exactkb.${ext}`;a.click();
    };
  }catch(e){showError('Something went wrong. Try another image.')}
  finally{compressBtn.disabled=false}
}
compressBtn.addEventListener('click',compress);

/* PayPal subscription */
const PAYPAL_CLIENT_ID='ARkh7tXu2p4fiZFMqP8vmiyucq50FCe4tZPDw5z0Lb1bpwH_5o19G7MxvQQ7CeZYP-hgL-oICS30OvNN';
const PAYPAL_PLAN_ID='P-1G660592RY139745UNKIAXQA';

const upgrade=document.getElementById('upgrade');
const premiumPanel=document.getElementById('premiumPanel');
const paymentStatus=document.getElementById('paymentStatus');
let paypalLoaded=false;
let paypalRendered=false;
let proUnlocked=localStorage.getItem('exactkb_pro_demo')==='true';

function unlockPro(subscriptionID){
  proUnlocked=true;
  localStorage.setItem('exactkb_pro_demo','true');
  document.querySelectorAll('[data-pro-feature]').forEach(x=>x.classList.remove('locked'));
  document.querySelectorAll('[data-pro-feature] select').forEach(x=>x.disabled=false);
  upgrade.textContent='Pro Active ✓';
  upgrade.disabled=true;
  paymentStatus.className='payment-status success';
  paymentStatus.textContent='Payment successful. Subscription ID: '+subscriptionID;
}

function loadPayPal(){
  if(paypalLoaded || document.getElementById('paypal-sdk')) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.id='paypal-sdk';
    s.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(PAYPAL_CLIENT_ID)+'&vault=true&intent=subscription';
    s.setAttribute('data-sdk-integration-source','button-factory');
    s.onload=()=>{paypalLoaded=true;resolve()};
    s.onerror=()=>reject(new Error('PayPal SDK failed to load.'));
    document.head.appendChild(s);
  });
}

async function showPayPal(){
  premiumPanel.classList.add('show');
  if(paypalRendered || proUnlocked)return;
  paymentStatus.textContent='Loading PayPal…';
  try{
    await loadPayPal();
    paypal.Buttons({
      style:{shape:'rect',color:'gold',layout:'vertical',label:'subscribe'},
      createSubscription:(data,actions)=>{
        return actions.subscription.create({plan_id:PAYPAL_PLAN_ID});
      },
      onApprove:(data)=>{
        /* This unlocks the local demo after PayPal approval.
           For production, verify the subscription on your server/webhook. */
        unlockPro(data.subscriptionID);
      },
      onCancel:()=>{
        paymentStatus.className='payment-status';
        paymentStatus.textContent='Payment cancelled.';
      },
      onError:(err)=>{
        console.error(err);
        paymentStatus.className='payment-status error';
        paymentStatus.textContent='PayPal could not load. Please try again.';
      }
    }).render('#paypal-button-container');
    paypalRendered=true;
    paymentStatus.textContent='';
  }catch(err){
    console.error(err);
    paymentStatus.className='payment-status error';
    paymentStatus.textContent='Could not load PayPal. Check your internet connection and try again.';
  }
}

upgrade.addEventListener('click',showPayPal);

if(proUnlocked){
  document.querySelectorAll('[data-pro-feature]').forEach(x=>x.classList.remove('locked'));
  document.querySelectorAll('[data-pro-feature] select').forEach(x=>x.disabled=false);
  upgrade.textContent='Pro Active ✓';
  upgrade.disabled=true;
}
