'use strict';
/* Text mode: persistent, versioned passage JSON; PDF is only a fallback. */
const textCache=new Map();let textEpoch=0,textMode=true,selectedWord='';
const byId=id=>document.getElementById(id);
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n};
function makeButton(label,fn){const b=el('button',label,'secondary');b.type='button';b.onclick=fn;return b}
function textMessage(s){$('textStatus').textContent=s}
function setMode(on){textMode=on;$('textReader').hidden=!on;$('pdfControls').hidden=on;$('pdfMode').textContent=on?'查看 PDF 原版':'返回文字模式';if(on){$('viewer').hidden=true;$('indexedReader').hidden=true;loadText()}else{++textEpoch;if(verifiedPdf&&indexEntry())drawIndexed();else $('viewer').hidden=false}}
const baseDraw=drawIndexed;drawIndexed=async function(){if(!textMode)return baseDraw()};
function cacheKey(item,k){return 'ielts-text-v1:'+item.sourceBlob+':'+k}
function validateText(v,k,item){
 if(!v||v.schema!==1||[v.book,v.test,v.passage].join('-')!==k||v.sourceBlob!==item.sourceBlob||!Array.isArray(v.paragraphs)||!v.paragraphs.length||!Array.isArray(v.questions))throw Error('文字数据版本或格式不匹配');
 if(!v.paragraphs.every(p=>typeof p.text==='string')||!v.questions.every(q=>Number.isInteger(q.number)&&typeof q.prompt==='string'))throw Error('文字数据不完整');
 return v
}
async function loadText(){
 const epoch=++textEpoch,k=key();$('textArticle').replaceChildren();$('questionText').replaceChildren();textMessage('正在读取文字资料…');
 try{
  const catalog=await catalogReady,item=catalog.books.find(x=>x.book===Number($('book').value));if(!item)throw Error('此册尚未入库');
  const ck=cacheKey(item,k);let v=textCache.get(ck);
  if(!v){try{const raw=localStorage.getItem(ck);if(raw)v=validateText(JSON.parse(raw),k,item)}catch{}}
  if(!v){const url='data/parsed/'+item.id+'/'+k+'.json';const response=await fetch(url,{cache:'no-cache'});if(response.ok){v=validateText(await response.json(),k,item);textCache.set(ck,v);try{localStorage.setItem(ck,JSON.stringify(v))}catch{}}else if(response.status===404){if(epoch===textEpoch&&textMode){textMessage('本篇尚未保存结构化文字。可导入解析 JSON 或返回 PDF 模式。');$('textArticle').append(el('p','已保存的页码和答案索引仍可用于 PDF 阅读与评分。'));}return}else throw Error('HTTP '+response.status)}
  if(epoch!==textEpoch||!textMode||key()!==k)return;
  $('textArticle').append(el('h2',v.title||indexEntry()?.title||k));for(const p of v.paragraphs){const node=el('p',p.text);node.dataset.paragraph=p.id||'';$('textArticle').append(node)}
  // Translation is optional, separately versioned, and always collapsed on navigation.
  const article=$('textArticle');
  const toolbar=el('div',undefined,'line');
  const status=el('span','正在读取段落译文…','muted');
  toolbar.append(status);article.insertBefore(toolbar,article.children[1]||null);
  try {
   const tr=await fetch('data/translations/'+item.id+'/'+k+'.json',{cache:'no-cache'});
   if(epoch!==textEpoch||!textMode||key()!==k)return;
   if(!tr.ok){status.textContent=tr.status===404?'本篇译文尚未整理':'译文暂不可用';}
   else {
    const t=await tr.json();
    if(epoch!==textEpoch||!textMode||key()!==k)return;
    if(t.sourceBlob!==item.sourceBlob||t.passageKey!==k||!Array.isArray(t.paragraphs))throw Error('译文版本不匹配');
    const nodes=[...article.querySelectorAll('p[data-paragraph]')], panels=[];
    for(const node of nodes){
     const entry=t.paragraphs.find(p=>String(p.id)===node.dataset.paragraph);
     if(!entry||typeof entry.zh!=='string')continue;
     const details=el('details',undefined,'paragraphTranslation');
     const summary=el('summary','显示本段译文');
     const body=el('div',entry.zh,'translationBody');
     details.append(summary,body);details.ontoggle=()=>{summary.textContent=details.open?'隐藏本段译文':'显示本段译文'};node.after(details);panels.push(details);
    }
    status.textContent='中文译文 '+panels.length+'/'+nodes.length+' 段';
    toolbar.prepend(makeButton('展开全部译文',()=>panels.forEach(p=>p.open=true)),makeButton('隐藏全部译文',()=>panels.forEach(p=>p.open=false)));
   }
  } catch(err){if(epoch===textEpoch)status.textContent='译文加载失败：'+err.message}
  if(epoch!==textEpoch||!textMode||key()!==k)return;
  const qmap=new Map(v.questions.map(q=>[q.number,q]));
  const labels=[...$('answers').querySelectorAll('label')];
  for(let i=0;i<labels.length;i++){const label=labels[i],n=draft().first+i,q=qmap.get(n);if(!q)continue;const node=el('div',q.prompt,'questionPrompt');if(q.instructions)node.prepend(el('div',q.instructions,'muted'));label.prepend(node);const input=label.querySelector('input');const opts=q.options||((q.type==='tfng')?['TRUE','FALSE','NOT GIVEN']:q.type==='ynng'?['YES','NO','NOT GIVEN']:[]);if(opts.length){const choices=el('div',undefined,'choiceLine');for(const opt of opts){const value=typeof opt==='string'?opt:opt.value;const caption=typeof opt==='string'?opt:opt.label||value;if(typeof value!=='string')continue;const b=makeButton(caption,()=>{input.value=value;input.dispatchEvent(new Event('input'));for(const x of choices.children)x.classList.toggle('picked',x.dataset.value===value)});b.dataset.value=value;b.classList.toggle('picked',input.value===value);choices.append(b)}label.append(choices)}}
  $('sourceText').value=v.paragraphs.map(p=>p.text).join('\n\n')+'\n\n'+v.questions.map(q=>q.number+'. '+q.prompt).join('\n');
  textMessage((v.reviewed?'已校对':'待人工校对')+' · 已加载持久化文字 · '+v.questions.length+' 道结构化题目');
 }catch(e){if(epoch===textEpoch)textMessage('文字模式：'+e.message)}
}
$('pdfMode').onclick=()=>setMode(!textMode);
$('importParsed').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const item=(await catalogReady).books.find(x=>x.book===Number($('book').value));if(!item)throw Error('此册尚未入库');const k=key(),v=validateText(JSON.parse(await f.text()),k,item);const ck=cacheKey(item,k);localStorage.setItem(ck,JSON.stringify(v));textCache.set(ck,v);setMode(true)}catch(e){textMessage('导入失败：'+e.message)}finally{e.target.value=''}};
$('textArticle').addEventListener('mouseup',()=>{const s=window.getSelection();if(!s||!s.anchorNode||!$('textArticle').contains(s.anchorNode))return;const word=s.toString().trim();if(!word||word.length>100)return;selectedWord=word;$('selectedWord').textContent=word;$('wordTools').hidden=false});
$('addSelected').onclick=()=>{if(!selectedWord)return;const meaning=window.prompt('中文释义（可稍后填写）','');if(meaning===null)return;state.words[uuid()]={word:selectedWord,meaning,example:'',date:now()};save();$('wordStatus').textContent='已加入生词本'};
$('lookupSelected').onclick=async()=>{if(!selectedWord)return;try{const v=await ai('请用中文简洁解释这个英文词或短语：'+selectedWord+'。给出词性、含义及一个原创例句。');$('wordStatus').textContent=v||'已复制查询请求'}catch(e){$('wordStatus').textContent=e.message}};
const oldRenderText=render;render=function(){oldRenderText();if(textMode){$('viewer').hidden=true;$('indexedReader').hidden=true;loadText()}};
for(const id of ['book','test','passage'])$(id).onchange=()=>{if(id==='book'){verifiedPdf=false;renderJob++;libraryRequest++}render();if(!textMode&&id==='book')openLibrary()};
setMode(true);
