'use strict';
// Keep local storage authoritative for unsent edits; GitHub is the cross-device mirror.
const syncRepository='https://api.github.com/repos/sliang0816/ielts-lab-study';
const syncURL=syncRepository+'/contents/data/state.json';
const syncPref='ielts-sync-preferences-v1',syncSecret='ielts-sync-token-v1';
for(const id of Object.keys(localStorage)){
 const kind=id.startsWith('ielts-review-v1:')?'reviewAnalysis':/^ielts-text-v1:.+:zh:/.test(id)?'paragraphTranslations':null;
 if(!kind)continue;
 try{
  const entry=JSON.parse(localStorage.getItem(id));
  if(entry){state[kind]??={};state[kind][id]??=entry}
 }catch{}
}
save();
let syncTimer=null,syncBusy=false,syncAgain=false,dirty=false,applyingRemote=false,failures=0,lastLocal=JSON.stringify(state),lastSuccess=0;
const localSave=save;
function syncStatus(msg){$('status').textContent=msg;$('syncIndicator').textContent=msg}
function enabled(){return $('autoSync').checked&&!!$('token').value.trim()}
function scheduleSync(delay=4500){clearTimeout(syncTimer);if(enabled())syncTimer=setTimeout(()=>syncNow(false),delay)}
function saveStudyCache(kind,id,entry){
 state[kind]??={};state[kind][id]={...entry,updated:now()};save();
}
save=function(){localSave();const current=JSON.stringify(state);if(current!==lastLocal){lastLocal=current;if(!applyingRemote){dirty=true;if(syncBusy)syncAgain=true;if(enabled()){syncStatus('Saved locally · sync pending');scheduleSync()}}}};
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
function equal(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}
function persistedPrefs(){
 try{localStorage.setItem(syncPref,JSON.stringify({auto:$('autoSync').checked,remember:$('rememberSync').checked}));if($('rememberSync').checked&&$('token').value.trim())localStorage.setItem(syncSecret,$('token').value.trim());else localStorage.removeItem(syncSecret)}catch{}
}
try{const p=JSON.parse(localStorage.getItem(syncPref)||'{}');$('rememberSync').checked=!!p.remember;$('autoSync').checked=p.auto!==false;if(p.remember)$('token').value=localStorage.getItem(syncSecret)||''}catch{}
$('rememberSync').onchange=()=>{if($('rememberSync').checked&&!confirm('Save the token unencrypted in this browser? Only use this on a trusted device.'))$('rememberSync').checked=false;persistedPrefs()};
$('autoSync').onchange=()=>{persistedPrefs();if(enabled())scheduleSync(0);else{clearTimeout(syncTimer);syncStatus('Auto-sync paused · changes are saved locally')}};
$('token').onchange=()=>{persistedPrefs();if(enabled())scheduleSync(0);else syncStatus('Enter a GitHub token to enable sync')};
async function requestState(headers){
 const signal=AbortSignal.timeout(20000);
 const r=await fetch(syncURL+'?ref=main',{headers:{...headers,Accept:'application/vnd.github.object+json'},cache:'no-store',signal});
 if(r.status===404)throw Error('Check that your token has access to ielts-lab-study');
 if(!r.ok)throw Error('Read HTTP '+r.status);
 const o=await r.json();
 let content=o.content;
 if(o.encoding==='none'){
  const blob=await fetch(syncRepository+'/git/blobs/'+encodeURIComponent(o.sha),{headers,cache:'no-store',signal});
  if(!blob.ok)throw Error('Read blob HTTP '+blob.status);
  content=(await blob.json()).content;
 }
 return {remote:validate(JSON.parse(dec.decode(bytes(content)))),sha:o.sha};
}
function refreshViews(previous,merged){
 const k=key(),before=previous.drafts[k],after=merged.drafts[k];
 if(!equal(before,after)&&!$('answers').contains(document.activeElement)&&document.activeElement!==$('notes')){
  applyingRemote=true;try{render()}finally{applyingRemote=false}
 }
 if(!$('words').hidden)showWords();if(!$('history').hidden)showHistory();
 if(!$('readingLibrary').hidden&&typeof renderReadingLibrary==='function')renderReadingLibrary();
}
async function syncNow(manual=false){
 clearTimeout(syncTimer);
 const token=$('token').value.trim();if(!token){syncStatus('Enter a GitHub token to start sync');return}
 if(!manual&&!enabled())return;
 if(syncBusy){syncAgain=true;return}
 if(!navigator.onLine){syncStatus('Offline · saved on this device');return}
 syncBusy=true;syncAgain=false;$('sync').disabled=true;syncStatus('Syncing…');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'};
 try{
  let done=false;
  for(let attempt=0;attempt<3;attempt++){
   const {remote,sha}=await requestState(headers);
   if($('token').value.trim()!==token)throw Error('Token changed. Sync again.');
   const payload=merge(state,remote);
   if(!equal(payload,remote)){
    const r=await fetch(syncURL,{method:'PUT',headers,body:JSON.stringify({message:'Sync IELTS study records',branch:'main',content:b64(enc.encode(JSON.stringify(payload))),...(sha?{sha}:{})}),signal:AbortSignal.timeout(25000)});
    if(r.status===409||r.status===422){if(attempt<2){await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));continue}}
    if(!r.ok)throw Error('Write HTTP '+r.status+' (check Contents read and write access)');
   }
   const previous=state;state=merge(state,payload);
   // Edits arriving during the request are merged locally and queued for the next upload.
   dirty=!equal(state,payload);applyingRemote=true;try{save()}finally{applyingRemote=false}
   refreshViews(previous,state);done=true;break;
  }
  if(!done)throw Error('Sync conflict. Try again shortly.');
  failures=0;lastSuccess=Date.now();syncStatus((dirty?'Local changes pending · ':'Synced · ')+new Date(lastSuccess).toLocaleTimeString('en-GB'));
 }catch(e){failures++;syncStatus('Sync failed: '+e.message+'. Local changes are saved.')}
 finally{syncBusy=false;$('sync').disabled=false;if(enabled()){if(failures)scheduleSync(Math.min(300000,15000*2**Math.min(failures-1,4)));else if(dirty||syncAgain)scheduleSync()}}
}
$('sync').onclick=()=>{persistedPrefs();syncNow(true)};
window.addEventListener('online',()=>{if(enabled())scheduleSync(0)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(started)put();if(dirty&&enabled())syncNow(false)}else if(enabled())scheduleSync(0)});
window.addEventListener('focus',()=>{if(enabled()&&Date.now()-lastSuccess>15000)scheduleSync(0)});
setInterval(()=>{if(enabled()&&Date.now()-lastSuccess>60000&&!syncBusy&&!failures)scheduleSync(0)},30000);
const initialStudySync=enabled()?syncNow(false):Promise.resolve();
if(!enabled())syncStatus('Local only · add a GitHub token to sync');
