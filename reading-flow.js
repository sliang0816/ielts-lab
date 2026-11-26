'use strict';

let readingPhase='library';
const localReadingBook=location.hostname==='127.0.0.1'||location.hostname==='localhost'?14:13;

function latestAttempt(passage){
 return Object.values(state.history).filter(record=>record.id===passage).sort((a,b)=>b.date.localeCompare(a.date))[0];
}

function readingStatus(passage,record){
 const d=state.drafts[passage];
 const changed=d?.answers?.some((answer,i)=>norm(answer)!==norm(record?.items?.[i]?.answer||''));
 if(changed||(!record&&d?.seconds>0))return 'draft';
 return record?'done':'new';
}

function renderReadingLibrary(){
 if(!libraryCatalog)return;
 const book=Number($('libraryBook').value),filter=$('libraryFilter').value,target=$('readingTests');
 const entries=Object.entries(CAMBRIDGE13).filter(([id])=>id.startsWith(book+'-'));
 $('libraryBookSummary').textContent=new Set(entries.map(([id])=>id.split('-')[1])).size+' 套 · '+entries.length+' 篇';
 const tests=new Map();
 for(const [id,entry] of entries){
  const [,test,passage]=id.split('-').map(Number);
  const record=latestAttempt(id),status=readingStatus(id,record);
  if(filter!=='all'&&filter!==status)continue;
  if(!tests.has(test)){
   const group=el('section',undefined,'readingTest');
   group.append(el('h3','Test '+test));
   tests.set(test,group);
  }
  const row=el('div',undefined,'passageRow');
  const description=el('div',undefined,'passageDescription');
  description.append(el('span','Passage '+passage,'passageNumber'),el('strong',entry.title));
  const progress=el('div',undefined,'passageProgress');
  progress.append(el('span',{new:'未练习',draft:'练习中',done:'已完成'}[status],'passageState '+status));
  if(record){
   const date=new Date(record.date).toLocaleDateString();
   progress.append(el('span',record.score+'/'+record.total+' · '+date,'muted'));
  }
  const actions=el('div',undefined,'passageActions');
  const practice=makeButton({new:'开始',draft:'继续',done:'继续练习'}[status],()=>openReadingPassage(id));
  actions.append(practice);
  if(record)actions.append(makeButton('详解',()=>openReadingPassage(id,'review')));
  row.append(description,progress,actions);tests.get(test).append(row);
 }
 target.replaceChildren(...tests.values());
 if(!tests.size)target.append(el('p','这个筛选条件下没有篇章。','muted'));
}

function writeReadingLocation(phase){
 const url=new URL(location.href);
 if(phase==='library'){
  url.searchParams.delete('passage');url.searchParams.delete('view');
 }else{
  url.searchParams.set('passage',key());
  if(phase==='review')url.searchParams.set('view','review');else url.searchParams.delete('view');
 }
 window.history.replaceState(null,'',url);
}

function leaveReading(){
 if(readingPhase==='practice'&&started)$('start').click();
 readingPhase='library';closeWordPopup();writeReadingLocation('library');
}

function openReadingLibrary(){
 leaveReading();
 $('reading').hidden=true;$('readingLibrary').hidden=false;
 renderReadingLibrary();window.scrollTo(0,0);
}

function setReadingTab(tab){
 $('reading').dataset.pane=tab;
 $('showArticle').setAttribute('aria-pressed',String(tab==='article'));
 $('showQuestions').setAttribute('aria-pressed',String(tab==='questions'));
}

function filterReviewQuestions(){
 const onlyMistakes=$('onlyMistakes').checked;
 for(const card of $('reviewQuestions').children)card.hidden=onlyMistakes&&card.dataset.correct==='true';
 $('reviewEmpty').hidden=!onlyMistakes||[...$('reviewQuestions').children].some(card=>!card.hidden);
}

function readingNeighbor(direction){
 const passages=Object.keys(CAMBRIDGE13).filter(id=>id.startsWith($('book').value+'-'));
 return passages[passages.indexOf(key())+direction];
}

function openNeighbor(direction){
 const id=readingNeighbor(direction);
 if(id)openReadingPassage(id,latestAttempt(id)?'review':'practice');
}

function setReadingPhase(phase,record){
 readingPhase=phase;
 const review=phase==='review';
 $('reading').dataset.phase=phase;
 $('readingPhase').textContent=review?'阅读详解':'阅读练习';
 $('questionHeading').textContent=review?'答题详解':'答题区';
 $('grade').hidden=review;$('reviewActions').hidden=!review;
 $('answers').hidden=review;$('questionText').hidden=review;
 $('reviewQuestions').hidden=!review;$('reviewControls').hidden=!review;
 $('answerProgress').hidden=review;$('onlyMistakes').checked=false;$('reviewEmpty').hidden=true;
 $('previousReading').disabled=!readingNeighbor(-1);$('nextReading').disabled=!readingNeighbor(1);
 if(review){
  latestQuestionReview={record,key:key()};showQuestionReview(record,key());
  $('reviewQuestions').scrollTop=0;
 }else{
  clearQuestionReview();$('result').textContent='';
 }
 writeReadingLocation(phase);updateExamNav();
}

function openReadingPassage(id,phase='practice'){
 if(!Object.hasOwn(CAMBRIDGE13,id))return;
 if(readingPhase==='practice'&&started)$('start').click();
 const [book,test,passage]=id.split('-'),previousBook=$('book').value;
 $('book').value=book;$('test').value=test;$('passage').value=passage;
 if(book!==previousBook){verifiedPdf=false;libraryRequest++;renderJob++}
 for(const s of ['readingLibrary','words','history','settings'])$(s).hidden=true;
 $('reading').hidden=false;$('libraryBook').value=book;$('readingOptions').open=false;
 textMode=true;$('textReader').hidden=false;$('pdfControls').hidden=true;$('pdfMode').textContent='查看 PDF 原版';
 clearQuestionReview();focusedReadingQuestion=null;render();
 $('textArticle').scrollTop=0;$('answers').scrollTop=0;
 const record=phase==='review'&&latestAttempt(id);
 setReadingPhase(record?'review':'practice',record);
 setReadingTab(record?'questions':'article');
 if(!record)$('start').click();
 window.scrollTo(0,0);
}

const gradeReading=$('grade').onclick;
$('grade').onclick=()=>{
 gradeReading();
 if(latestQuestionReview?.key===key()){
  setReadingPhase('review',latestQuestionReview.record);
  setReadingTab('questions');
 }
};

const renderReading=render;
render=function(){
 const review=latestQuestionReview?.key===key()?latestQuestionReview:null;
 renderReading();
 if(readingPhase==='review'&&review){
  latestQuestionReview=review;showQuestionReview(review.record,review.key);updateExamNav();
 }
};

$('readingBack').onclick=openReadingLibrary;
$('showArticle').onclick=()=>setReadingTab('article');
$('showQuestions').onclick=()=>setReadingTab('questions');
$('onlyMistakes').onchange=filterReviewQuestions;
$('editAttempt').onclick=()=>{
 setReadingPhase('practice');
 setReadingTab('questions');
};
$('previousReading').onclick=()=>openNeighbor(-1);
$('nextReading').onclick=()=>openNeighbor(1);
$('nextPassage').onclick=()=>openReadingPassage(readingNeighbor(1));
$('libraryBook').onchange=renderReadingLibrary;
$('libraryFilter').onchange=renderReadingLibrary;
window.addEventListener('pagehide',()=>{if(readingPhase==='practice'&&started)put()});

catalogReady.then(catalog=>{
 for(const book of catalog.books)$('libraryBook').add(new Option('剑桥 '+book.book,book.book));
 $('libraryBook').value=String(localReadingBook);
 const params=new URLSearchParams(location.search),passage=params.get('passage');
 if(Object.hasOwn(CAMBRIDGE13,passage))openReadingPassage(passage,params.get('view'));
 else renderReadingLibrary();
}).catch(error=>{$('readingTests').textContent=error.message});
