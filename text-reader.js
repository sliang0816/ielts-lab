'use strict';
/* Text mode: persistent, versioned passage JSON; PDF is only a fallback. */
const textCache=new Map();let studyAnalysis=null,questionTranslations=null,activePassageData=null,wordEntry=null;const wordCache=new Map();let textEpoch=0,textMode=true,selectedWord='';
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
 const epoch=++textEpoch,k=key();clearQuestionReview();studyAnalysis=null;questionTranslations=null;activePassageData=null;wordEntry=null;selectedWord='';$('wordTools').hidden=true;$('wordStatus').textContent='';for(const x of $('answers').querySelectorAll('.questionPrompt,.choiceLine,.questionTranslation,.questionGroup'))x.remove();$('textArticle').replaceChildren();$('questionText').replaceChildren();textMessage('正在读取文字资料…');
 try{
  const catalog=await catalogReady,item=catalog.books.find(x=>x.book===Number($('book').value));if(!item)throw Error('此册尚未入库');
  const ck=cacheKey(item,k);let v=textCache.get(ck);
  if(!v){try{const raw=localStorage.getItem(ck);if(raw)v=validateText(JSON.parse(raw),k,item)}catch{}}
  if(!v){const url='data/parsed/'+item.id+'/'+k+'.json';const response=await fetch(url,{cache:'no-cache'});if(response.ok){v=validateText(await response.json(),k,item);textCache.set(ck,v);try{localStorage.setItem(ck,JSON.stringify(v))}catch{}}else if(response.status===404){if(epoch===textEpoch&&textMode){textMessage('本篇尚未保存结构化文字。可导入解析 JSON 或返回 PDF 模式。');$('textArticle').append(el('p','已保存的页码和答案索引仍可用于 PDF 阅读与评分。'));}return}else throw Error('HTTP '+response.status)}
  if(epoch!==textEpoch||!textMode||key()!==k)return;
  activePassageData=v; $('textArticle').append(el('h2',v.title||indexEntry()?.title||k));for(const p of v.paragraphs){const node=el('p',p.text);node.dataset.paragraph=p.id||'';$('textArticle').append(node)}
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
    questionTranslations=t; const nodes=[...article.querySelectorAll('p[data-paragraph]')], panels=[];
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
  renderQuestionTranslations(v,questionTranslations);
  try{const ar=await fetch('data/analysis/'+item.id+'/'+k+'.json',{cache:'no-cache'});if(ar.ok){const a=await ar.json();if(epoch!==textEpoch||key()!==k||!textMode)return;if(a.sourceBlob===item.sourceBlob&&[a.book,a.test,a.passage].join('-')===k)studyAnalysis=a}}catch{}
  if(epoch!==textEpoch||key()!==k||!textMode)return;
  if(latestQuestionReview?.key===k)showQuestionReview(latestQuestionReview.record,k);
  $('sourceText').value=v.paragraphs.map(p=>p.text).join('\n\n')+'\n\n'+v.questions.map(q=>q.number+'. '+q.prompt).join('\n');
  textMessage((v.reviewed?'已校对':'待人工校对')+' · 已加载持久化文字 · '+v.questions.length+' 道结构化题目');
 }catch(e){if(epoch===textEpoch)textMessage('文字模式：'+e.message)}
}

function foldedTranslation(label,zh){const d=el('details',undefined,'questionTranslation paragraphTranslation');const t=el('summary',label);d.append(t,el('div',zh,'translationBody'));d.ontoggle=()=>t.textContent=d.open?'隐藏中文译文':label;return d}
function renderQuestionTranslations(v,t){
 const labels=[...$('answers').querySelectorAll('label')], panels=[];
 const groups=v.questionGroups||[];
 for(const g of groups){const i=g.first-draft().first;if(!labels[i])continue;const section=el('div',undefined,'questionGroup');section.append(el('strong','Questions '+g.first+'–'+g.last),el('p',g.instructions||''));if(g.text)section.append(el('p',g.text));const tr=t?.questionGroups?.find(x=>x.id===g.id);if(tr?.zh){const d=foldedTranslation('显示题组说明译文',tr.zh);section.append(d);panels.push(d)}labels[i].before(section)}
 for(let i=0;i<labels.length;i++){const q=t?.questions?.find(x=>x.number===draft().first+i);if(q?.zh){const d=foldedTranslation('显示本题译文',q.zh);labels[i].append(d);panels.push(d)}}
 if(panels.length){const bar=el('div',undefined,'line');bar.append(makeButton('展开全部题目译文',()=>panels.forEach(d=>d.open=true)),makeButton('隐藏全部题目译文',()=>panels.forEach(d=>d.open=false)));$('questionText').append(bar)}
}
function wordMatch(w){const lower=w.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g,'');const forms=[lower,lower.replace(/ies$/,'y'),lower.replace(/s$/,''),lower.replace(/es$/,''),lower.replace(/ing$/,''),lower.replace(/ed$/,'')];return studyAnalysis?.words?.find(x=>forms.includes(x.word.toLowerCase()))}
function speakWord(word,lang){if(!('speechSynthesis'in window))return;const u=new SpeechSynthesisUtterance(word);u.lang=lang;window.speechSynthesis.cancel();window.speechSynthesis.speak(u)}
function displayWord(w){wordEntry=w;$('wordStatus').replaceChildren();const c=$('wordStatus');c.append(el('div',[w.pos,w.meaning].filter(Boolean).join(' ')));if(w.uk||w.us){const line=el('div',undefined,'line');if(w.uk)line.append(el('span','英 '+w.uk),makeButton('英式发音',()=>speakWord(w.word,'en-GB')));if(w.us)line.append(el('span','美 '+w.us),makeButton('美式发音',()=>speakWord(w.word,'en-US')));c.append(line)}if(w.example)c.append(el('div',w.example),el('div',w.translation||'','muted'));if(w.collocation)c.append(el('div','搭配：'+w.collocation));if(w.synonym)c.append(el('div','同义词：'+w.synonym))}
async function lookupWord(word){const epoch=textEpoch,k=word.toLowerCase();const local=wordMatch(word)||wordCache.get(k);if(local){displayWord(local);return} $('wordStatus').textContent='词义查询中…';
 try{const res=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(word)+'&langpair=en%7Czh-CN',{signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('HTTP '+res.status);const d=await res.json();if(Number(d.responseStatus)!==200||!d.responseData?.translatedText)throw Error('无可用译文');if(epoch!==textEpoch||selectedWord!==word)return;const entry={word,meaning:d.responseData.translatedText};wordCache.set(k,entry);displayWord(entry);$('wordStatus').append(el('div','在线机器翻译，仅供参考。','muted'))}catch{if(epoch===textEpoch&&selectedWord===word)$('wordStatus').textContent='暂无词义，可使用 AI 词义查询。'}
}
function selectEnglish(){const s=window.getSelection();if(!s||!s.anchorNode||!s.focusNode)return;const a=s.anchorNode.parentElement,b=s.focusNode.parentElement;if(!a||!b||!a.closest('#textArticle p[data-paragraph],#answers .questionPrompt')||!b.closest('#textArticle p[data-paragraph],#answers .questionPrompt'))return;const w=s.toString().trim();if(!/^[A-Za-z][A-Za-z\s’'-]{0,99}$/.test(w))return;selectedWord=w;wordEntry=null;$('selectedWord').textContent=w;$('wordTools').hidden=false;lookupWord(w)}
let latestQuestionReview=null;
function clearQuestionReview(){latestQuestionReview=null;for(const n of $('answers').querySelectorAll('.inlineQuestionReview'))n.remove()}
function showQuestionReview(record,k){
 if(k!==key())return;
 for(const n of $('answers').querySelectorAll('.inlineQuestionReview'))n.remove();
 const labels=[...$('answers').querySelectorAll('label')].filter(n=>n.querySelector('input'));
 for(const x of record.items){
  const label=labels[x.number-draft().first];if(!label)continue;
  const q=studyAnalysis?.questions?.find(q=>q.number===x.number);
  const card=el('div',undefined,'inlineQuestionReview '+(x.correct?'reviewCorrect':'reviewIncorrect'));
  card.append(el('strong',(x.correct?'✓ 回答正确':x.answer.trim()?'✗ 回答错误':'— 未作答')+' · 第 '+x.number+' 题','reviewHeading'));
  card.append(el('p','你的答案：'+(x.answer||'未作答')),el('p','正确答案：'+x.expected));
  if(q){
   if(q.explanation)card.append(el('p','解题解析：'+q.explanation));
   if(q.evidence)card.append(el('p','原文依据：'+q.evidence));
   if(q.paraphrase)card.append(el('p','同义替换 / 判断线索：'+q.paraphrase));
   if(q.paragraphId)card.append(makeButton('定位第 '+q.paragraphId+' 段',()=>{const node=[...$('textArticle').querySelectorAll('[data-paragraph]')].find(n=>n.dataset.paragraph===q.paragraphId);if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.classList.add('evidenceHighlight');setTimeout(()=>node.classList.remove('evidenceHighlight'),3000)}}));
  }else card.append(el('p','本题详细解析尚未整理。','muted'));
  label.after(card);
 }
 $('result').textContent='正确 '+record.score+'/'+record.total+' · 已在每道题下显示判分和解析。';
}
const baseGradeText=$('grade').onclick;
$('grade').onclick=()=>{const before=new Set(Object.keys(state.history));baseGradeText();const id=Object.keys(state.history).find(id=>!before.has(id));if(id&&state.history[id].id===key()){latestQuestionReview={record:state.history[id],key:key()};showQuestionReview(latestQuestionReview.record,latestQuestionReview.key)}};
$('answers').addEventListener('input',e=>{if(e.target.matches('input')&&latestQuestionReview){clearQuestionReview();$('result').textContent='答案已修改，请重新提交批改。'}});
$('pdfMode').onclick=()=>setMode(!textMode);
$('importParsed').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const item=(await catalogReady).books.find(x=>x.book===Number($('book').value));if(!item)throw Error('此册尚未入库');const k=key(),v=validateText(JSON.parse(await f.text()),k,item);const ck=cacheKey(item,k);localStorage.setItem(ck,JSON.stringify(v));textCache.set(ck,v);setMode(true)}catch(e){textMessage('导入失败：'+e.message)}finally{e.target.value=''}};
$('textArticle').addEventListener('mouseup',selectEnglish);
$('answers').addEventListener('mouseup',selectEnglish);
let selectionTimer;document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(selectEnglish,450)});
$('addSelected').onclick=()=>{if(!selectedWord)return;const meaning=wordEntry?.meaning||window.prompt('中文释义（可稍后填写）','');if(meaning===null)return;const existing=Object.values(state.words).find(w=>w.word.toLowerCase()===selectedWord.toLowerCase());if(existing){$('wordStatus').append(el('div','已在生词本中'));return}state.words[uuid()]={...(wordEntry||{}),word:selectedWord,meaning,example:wordEntry?.example||'',source:key(),date:now()};save();$('wordStatus').append(el('div','已加入生词本'))};
$('lookupSelected').onclick=async()=>{if(!selectedWord)return;try{const v=await ai('请用中文简洁解释这个英文词或短语：'+selectedWord+'。给出词性、含义及一个原创例句。');$('wordStatus').textContent=v||'已复制查询请求'}catch(e){$('wordStatus').textContent=e.message}};
const oldRenderText=render;render=function(){oldRenderText();if(textMode){$('viewer').hidden=true;$('indexedReader').hidden=true;loadText()}};
for(const id of ['book','test','passage'])$(id).onchange=()=>{if(id==='book'){verifiedPdf=false;renderJob++;libraryRequest++}render();if(!textMode&&id==='book')openLibrary()};
setMode(true);
