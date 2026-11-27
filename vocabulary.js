'use strict';

const wordPageSize=20;
let wordPage=0;
function dueWords(){
 return Object.entries(state.words).filter(([,word])=>!word.due||Date.parse(word.due)<=Date.now());
}

function showWords(){
 const query=norm($('wordSearch').value),filter=$('wordFilter').value;
 const due=new Set(dueWords().map(([id])=>id));
 const weekAgo=Date.now()-7*86400000;
 const words=Object.entries(state.words)
  .filter(([id,w])=>(filter!=='due'||due.has(id))&&(filter!=='recent'||Date.parse(w.date)>=weekAgo))
  .filter(([,w])=>[w.word,w.meaning].some(value=>norm(value||'').includes(query)))
  .sort(([,a],[,b])=>(b.date||'').localeCompare(a.date||''));
 const pages=Math.max(1,Math.ceil(words.length/wordPageSize));
 wordPage=Math.min(wordPage,pages-1);
 const list=$('wordList'),start=wordPage*wordPageSize;
 list.replaceChildren();
 for(const [,word] of words.slice(start,start+wordPageSize)){
  const row=el('li',undefined,'wordEntry'),heading=el('div',undefined,'wordEntryHeading');
  if(word.source)row.dataset.passageId=word.source;
  heading.append(el('strong',syllableLabel(word)),renderPronunciations(word,true));
  row.append(heading);
  if(word.meaning)row.append(el('p',[word.pos,word.meaning].filter(Boolean).join(' '),'wordEntryMeaning'));
  const details=el('details');
  details.append(el('summary','Examples and context'));
  for(const value of [word.example,word.translation,word.collocation,word.synonym,word.context].filter(Boolean)){
   details.append(el('p',value));
  }
  if(word.source)details.append(el('p','Cambridge '+word.source,'muted'));
  if(details.children.length>1)row.append(details);
  list.append(row);
 }
 if(!words.length)list.append(el('li',query||filter!=='all'?'No matching words.':'Save a word from a passage to start your list.','muted'));
 $('wordPages').hidden=pages===1;
 $('wordPageStatus').textContent=(start+1)+'–'+Math.min(start+wordPageSize,words.length)+' of '+words.length;
 $('wordsPrevious').disabled=wordPage===0;
 $('wordsNext').disabled=wordPage===pages-1;
 $('reviewCount').textContent=due.size+' due for review';
}
$('wordSearch').oninput=$('wordFilter').onchange=()=>{wordPage=0;showWords()};
$('wordsPrevious').onclick=()=>{wordPage--;showWords()};
$('wordsNext').onclick=()=>{wordPage++;showWords()};

let reviewQueue=[],missedWords=new Set(),reviewId=null;
function spellingClue(word){
 if(word.meaning) return word.meaning;
 const example=word.example||word.context||'';
 const start=example.toLowerCase().indexOf(word.word.toLowerCase());
 return start<0?'':example.slice(0,start)+'____'+example.slice(start+word.word.length);
}
function spellingMode(){return $('reviewMode').value==='spelling'}
function nextReview(){
 reviewId=reviewQueue.shift()||null;
 const word=state.words[reviewId],spelling=spellingMode();
 const card=$('reviewCard');
 card.replaceChildren(el('p',word?(spelling?spellingClue(word):syllableLabel(word)):'Review complete.','reviewCue'));
 card.hidden=false;
 if(word?.source)card.dataset.passageId=word.source;else delete card.dataset.passageId;
 $('spellingForm').hidden=!word||!spelling;
 $('spellingAnswer').value='';
 if(word&&spelling)$('spellingAnswer').focus();
 $('reveal').hidden=!word||spelling;
 $('forgot').hidden=$('remember').hidden=$('reviewNext').hidden=true;
 $('reviewStart').hidden=!!word;
 $('reviewEnd').hidden=!word;
 $('reviewMode').disabled=!!word;
}
$('reviewStart').onclick=()=>{
 reviewQueue=dueWords().filter(([,w])=>!spellingMode()||spellingClue(w)).map(([id])=>id);
 missedWords=new Set();
 nextReview();
 if(!reviewId)$('reviewCard').textContent='No words ready for this review mode.';
};
$('reviewEnd').onclick=()=>{
 reviewQueue=[];nextReview();$('reviewCard').hidden=true;
};
$('reviewMode').onchange=()=>{$('reviewCard').hidden=true};
$('reveal').onclick=()=>{
 const word=state.words[reviewId];
 if(!word)return;
 const card=$('reviewCard');
 card.append(renderPronunciations(word,true));
 for(const value of [word.meaning,word.example,word.translation].filter(Boolean))card.append(el('p',value));
 $('forgot').hidden=$('remember').hidden=false;
 $('reveal').hidden=true;
};
function rateWord(word,correct){
 word.level=correct?Math.min(5,(word.level||0)+1):0;
 const delay=correct?[0,1,3,7,14,30][word.level]*86400000:600000;
 word.due=new Date(Date.now()+delay).toISOString();
 word.updated=now();save();showWords();
}
function rateCard(correct){
 const word=state.words[reviewId];
 if(!word)return;
 rateWord(word,correct);
 nextReview();
}
$('forgot').onclick=()=>rateCard(false);
$('remember').onclick=()=>rateCard(true);

function markSpelling(value,reference){
 const line=el('span'),a=norm(value),b=norm(reference);
 let start=0,end=0;
 while(start<Math.min(a.length,b.length)&&a[start]===b[start])start++;
 while(end<Math.min(a.length,b.length)-start&&a.at(-1-end)===b.at(-1-end))end++;
 line.append(a.slice(0,start),el('mark',a.slice(start,a.length-end)||'∅'),a.slice(a.length-end));
 return line;
}
$('spellingForm').onsubmit=event=>{
 event.preventDefault();
 const word=state.words[reviewId],value=$('spellingAnswer').value;
 if(!word||!norm(value))return;
 const correct=norm(value)===norm(word.word),card=$('reviewCard');
 if(correct){
  if(!missedWords.has(reviewId))rateWord(word,true);
  card.append(el('p','Correct · '+word.word,'ok'));
 }else{
  if(!missedWords.has(reviewId))rateWord(word,false);
  missedWords.add(reviewId);
  reviewQueue.push(reviewId);
  const typed=el('p','Your spelling: '),expected=el('p','Correct spelling: ');
  typed.append(markSpelling(value,word.word));
  expected.append(markSpelling(word.word,value));
  card.append(typed,expected,el('p','This word will come up again.','muted'));
 }
 $('spellingForm').hidden=true;$('reviewNext').hidden=false;$('reviewNext').focus();
};
$('reviewNext').onclick=nextReview;
