'use strict';
// Keep local storage authoritative for unsent edits; GitHub is the cross-device mirror.
const syncURL='https://api.github.com/repos/sliang0816/ielts-lab/contents/data/state.json';
const syncPref='ielts-sync-preferences-v1',syncSecret='ielts-sync-token-v1';
let syncTimer=null,syncBusy=false,syncAgain=false,dirty=false,applyingRemote=false,failures=0,lastLocal=JSON.stringify(state),lastSuccess=0;
const localSave=save;
function syncStatus(msg){$('status').textContent=msg;$('syncIndicator').textContent=msg}
function enabled(){return $('autoSync').checked&&!!$('token').value.trim()}
function scheduleSync(delay=4500){clearTimeout(syncTimer);if(enabled())syncTimer=setTimeout(()=>syncNow(false),delay)}
save=function(){localSave();const current=JSON.stringify(state);if(current!==lastLocal){lastLocal=current;if(!applyingRemote){dirty=true;if(syncBusy)syncAgain=true;if(enabled()){syncStatus('本地已保存，等待同步');scheduleSync()}}}};
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
function equal(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}
function persistedPrefs(){
 try{localStorage.setItem(syncPref,JSON.stringify({auto:$('autoSync').checked,remember:$('rememberSync').checked}));if($('rememberSync').checked&&$('token').value.trim())localStorage.setItem(syncSecret,$('token').value.trim());else localStorage.removeItem(syncSecret)}catch{}
}
try{const p=JSON.parse(localStorage.getItem(syncPref)||'{}');$('rememberSync').checked=!!p.remember;$('autoSync').checked=p.auto!==false;if(p.remember)$('token').value=localStorage.getItem(syncSecret)||''}catch{}
$('rememberSync').onchange=()=>{if($('rememberSync').checked&&!confirm('令牌会以明文保存在本设备浏览器中，同源网页脚本可以访问。仅建议在受信任的个人设备使用。继续？'))$('rememberSync').checked=false;persistedPrefs()};
$('autoSync').onchange=()=>{persistedPrefs();if(enabled())scheduleSync(0);else{clearTimeout(syncTimer);syncStatus('自动同步已暂停，本地保存仍有效')}};
$('token').onchange=()=>{persistedPrefs();if(enabled())scheduleSync(0);else syncStatus('请填写 GitHub 令牌以启用跨设备同步')};
async function requestState(headers){
 const r=await fetch(syncURL+'?ref=main',{headers,cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(r.status===404)return {remote:empty(),sha:null,exists:false};
 if(!r.ok)throw Error('读取 HTTP '+r.status);
 const o=await r.json();return {remote:validate(JSON.parse(dec.decode(bytes(o.content)))),sha:o.sha,exists:true}
}
function refreshViews(previous,merged){
 const k=key(),before=previous.drafts[k],after=merged.drafts[k];
 if(!equal(before,after)&&!started&&!$('answers').contains(document.activeElement)&&document.activeElement!==$('notes')){
  applyingRemote=true;try{render()}finally{applyingRemote=false}
 }
 if(!$('words').hidden)showWords();if(!$('history').hidden)showHistory()
}
async function syncNow(manual=false){
 clearTimeout(syncTimer);
 const token=$('token').value.trim();if(!token){syncStatus('请输入 GitHub 令牌；当前仅本地保存');return}
 if(!manual&&!enabled())return;
 if(syncBusy){syncAgain=true;return}
 if(!navigator.onLine){syncStatus('离线：学习记录已保存在本机');return}
 syncBusy=true;syncAgain=false;$('sync').disabled=true;syncStatus('正在同步…');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'};
 try{
  if(started)put();
  let done=false;
  for(let attempt=0;attempt<3;attempt++){
   const {remote,sha,exists}=await requestState(headers);
   if($('token').value.trim()!==token)throw Error('同步令牌已变更，请重新同步');
   const payload=merge(state,remote);
   if(!exists||!equal(payload,remote)){
    const r=await fetch(syncURL,{method:'PUT',headers,body:JSON.stringify({message:'Sync IELTS study records',branch:'main',content:b64(enc.encode(JSON.stringify(payload))),...(sha?{sha}:{})}),signal:AbortSignal.timeout(25000)});
    if(r.status===409||r.status===422){if(attempt<2){await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));continue}}
    if(!r.ok)throw Error('写入 HTTP '+r.status+'（检查 Contents 读写权限）');
   }
   const previous=state;state=merge(state,payload);
   // Edits arriving during the request are merged locally and queued for the next upload.
   dirty=!equal(state,payload);applyingRemote=true;try{save()}finally{applyingRemote=false}
   refreshViews(previous,state);done=true;break;
  }
  if(!done)throw Error('同步冲突，请稍后重试');
  failures=0;lastSuccess=Date.now();syncStatus((dirty?'本地有新修改，继续同步 · ':'已同步 · ')+new Date(lastSuccess).toLocaleTimeString());
 }catch(e){failures++;syncStatus('同步失败：'+e.message+'；本地记录仍保留。')}
 finally{syncBusy=false;$('sync').disabled=false;if(enabled()){if(failures)scheduleSync(Math.min(300000,15000*2**Math.min(failures-1,4)));else if(dirty||syncAgain)scheduleSync()}}
}
$('sync').onclick=()=>{persistedPrefs();syncNow(true)};
window.addEventListener('online',()=>{if(enabled())scheduleSync(0)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(started)put();if(dirty&&enabled())syncNow(false)}else if(enabled())scheduleSync(0)});
window.addEventListener('focus',()=>{if(enabled()&&Date.now()-lastSuccess>15000)scheduleSync(0)});
setInterval(()=>{if(started)put();if(enabled()&&Date.now()-lastSuccess>60000&&!syncBusy&&!failures)scheduleSync(0)},30000);
if(enabled())scheduleSync(0);else syncStatus('本地保存 · 设置 GitHub 令牌后自动同步');
