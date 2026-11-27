'use strict';
const indexEntry=()=>CAMBRIDGE13[key()];
let currentPage=1,renderJob=0,activeTask=null,verifiedPdf=false;
const previousRender=render;
render=function(){
  const entry=indexEntry();
  if(entry){let d=draft();if(d.first!==entry.first||d.count!==entry.count){const answers=Array.from({length:entry.count},(_,i)=>d.answers[entry.first+i-d.first]||'');d={...d,first:entry.first,count:entry.count,answers}}d.keys=entry.keys.slice();state.drafts[key()]=d;save()}
  previousRender();
  $('keys').closest('details').hidden=!!entry;
  if(entry){$('summary').textContent='Cambridge '+key()+' · '+entry.title;$('pageFrom').value=entry.from;$('pageTo').value=entry.to;$('keys').value=entry.keys.join('\n');currentPage=entry.from;
    // Standard answers are available to the grader without displaying them during practice.
    $('keys').closest('details').open=false;
  }
  if(verifiedPdf&&entry)drawIndexed();else{$('indexedReader').hidden=true;$('viewer').hidden=false;}
};
for(const id of ['book','test','passage'])$(id).onchange=()=>render();
async function drawIndexed(){
  const entry=indexEntry();if(!entry||!verifiedPdf)return;
  const job=++renderJob;currentPage=Math.max(entry.from,Math.min(entry.to,currentPage));const n=currentPage;
  try{const d=await getPdf();const p=await d.getPage(n);if(job!==renderJob)return;
    if(activeTask){activeTask.cancel();try{await activeTask.promise}catch{}}
    if(job!==renderJob)return;
    const viewport=p.getViewport({scale:1.6}),c=$('pageCanvas');c.width=viewport.width;c.height=viewport.height;
    $('viewer').hidden=true;$('indexedReader').hidden=false;$('pageLabel').textContent='PDF '+n+' / '+entry.to;$('prevPage').disabled=n===entry.from;$('nextPage').disabled=n===entry.to;
    activeTask=p.render({canvasContext:c.getContext('2d'),viewport});await activeTask.promise;
  }catch(e){if(job===renderJob&&e.name!=='RenderingCancelledException')$('pdfStatus').textContent='Could not display page: '+e.message}
}
$('prevPage').onclick=()=>{currentPage--;drawIndexed()};
$('nextPage').onclick=()=>{currentPage++;drawIndexed()};
const oldPdfChange=$('pdf').onchange;
$('pdf').onchange=async e=>{verifiedPdf=false;renderJob++;oldPdfChange(e);$('indexedReader').hidden=true;$('viewer').hidden=false;if(!pdfInput)return;
  try{const d=await getPdf();if(d.numPages===143&&indexEntry()){verifiedPdf=confirm('Is this the 143-page Cambridge IELTS 13 scan with Test 1 Reading on PDF page 17? Confirm to use its index.');if(verifiedPdf){currentPage=indexEntry().from;await drawIndexed();$('pdfStatus').textContent='Cambridge 13 index and answer key enabled.'}}else $('pdfStatus').textContent='PDF opened with '+d.numPages+' pages. Navigate manually for this edition.'}catch(e){$('pdfStatus').textContent='Could not load index: '+e.message}
};
const oldLink=$('loadLink').onclick;$('loadLink').onclick=()=>{verifiedPdf=false;renderJob++;$('indexedReader').hidden=true;$('viewer').hidden=false;oldLink()};
const oldLocate=$('locate').onclick;$('locate').onclick=()=>{if(verifiedPdf&&indexEntry()){currentPage=Number($('pageFrom').value)||indexEntry().from;drawIndexed()}else oldLocate()};
render();
