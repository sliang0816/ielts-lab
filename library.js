'use strict';
let libraryCatalog=null, libraryRequest=0;
const catalogReady=fetch('data/catalog.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Could not load the catalog');return r.json()}).then(c=>{libraryCatalog=c;return c});
catalogReady.catch(e=>{$('libraryStatus').textContent=e.message});
async function openLibrary(){
 const request=++libraryRequest, k=key(), b=Number($('book').value);
 try{
  const catalog=await catalogReady;if(request!==libraryRequest)return;
  const item=catalog.books.find(x=>x.book===b);if(!item){$('libraryStatus').textContent='This book is unavailable.';return}
  const u=new URL(item.material,location.href).href;
  verifiedPdf=false;renderJob++;loadId++;pdfInput=u;pdfDoc=null;
  $('viewer').src=u+'#page='+ (indexEntry()?.from||1);$('viewer').hidden=false;$('indexedReader').hidden=true;
  $('libraryStatus').textContent='Loading Cambridge '+b+'…';
  const d=await getPdf();if(request!==libraryRequest||Number($('book').value)!==b)return;
  if(d.numPages!==item.pages)throw Error('PDF page count does not match the index. Check the edition.');
  verifiedPdf=true;currentPage=indexEntry()?.from||1;await drawIndexed();$('libraryStatus').textContent='Cambridge '+b+' · '+d.numPages+' pages · index loaded';
 }catch(e){if(request===libraryRequest)$('libraryStatus').textContent='Load failed: '+e.message}
}
$('libraryLoad').onclick=openLibrary;
const libRender=render;
render=function(){libRender();const item=indexEntry();if(item&&verifiedPdf)drawIndexed()};
$('book').onchange=()=>{verifiedPdf=false;renderJob++;render();openLibrary()};
for(const id of ['test','passage'])$(id).onchange=()=>render();
const oldGrade=$('grade').onclick;
$('grade').onclick=()=>{
 const d=draft(),groups=indexEntry()?.groups||[];
 if(!groups.length){oldGrade();return}
 put();if(d.keys.length!==d.count||d.keys.some(x=>!x))return alert('Save the complete official answer key first.');
 if(started){elapsed=seconds();started=0;put();$('start').textContent='Resume'}
 const items=d.keys.map((k,i)=>({number:d.first+i,answer:d.answers[i]||'',expected:k,correct:!!norm(d.answers[i]||'')&&k.split('|').some(v=>norm(v)===norm(d.answers[i]||''))}));
 for(const [a,b] of groups){const list=items.filter(x=>x.number>=a&&x.number<=b);const remaining=list.map(x=>norm(x.expected));for(const x of list){const ix=remaining.indexOf(norm(x.answer));x.correct=!!norm(x.answer)&&ix>=0;if(x.correct)remaining.splice(ix,1)}}
 const score=items.filter(x=>x.correct).length;state.history[uuid()]={id:key(),date:now(),seconds:d.seconds,score,total:d.count,items};save();$('result').textContent='Correct '+score+'/'+d.count+' · Mistakes: '+items.filter(x=>!x.correct).map(x=>x.number+' ('+x.expected+')').join(', ')
};
