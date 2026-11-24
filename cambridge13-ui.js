'use strict';
const indexEntry=()=>CAMBRIDGE13[key()];
let currentPage=1,renderJob=0,activeTask=null,verifiedPdf=false;
const previousRender=render;
render=function(){
  const entry=indexEntry();
  if(entry){let d=draft();if(d.first!==entry.first||d.count!==entry.count){d={...d,first:entry.first,count:entry.count,answers:[],seconds:0}}d.keys=entry.keys.slice();state.drafts[key()]=d;save()}
  previousRender();
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
  }catch(e){if(job===renderJob&&e.name!=='RenderingCancelledException')$('pdfStatus').textContent='页面显示失败：'+e.message}
}
$('prevPage').onclick=()=>{currentPage--;drawIndexed()};
$('nextPage').onclick=()=>{currentPage++;drawIndexed()};
const oldPdfChange=$('pdf').onchange;
$('pdf').onchange=async e=>{verifiedPdf=false;renderJob++;oldPdfChange(e);$('indexedReader').hidden=true;$('viewer').hidden=false;if(!pdfInput)return;
  try{const d=await getPdf();if(d.numPages===143&&indexEntry()){verifiedPdf=confirm('这是你提供的143页剑桥雅思13扫描版（Test 1 阅读从PDF第17页开始）吗？确认后将启用专用索引。');if(verifiedPdf){currentPage=indexEntry().from;await drawIndexed();$('pdfStatus').textContent='已启用剑桥13专用索引，标准答案已内置。'}}else $('pdfStatus').textContent='已加载 PDF，共 '+d.numPages+' 页；非当前专用索引版本时请手动定位。'}catch(e){$('pdfStatus').textContent='索引加载失败：'+e.message}
};
const oldLink=$('loadLink').onclick;$('loadLink').onclick=()=>{verifiedPdf=false;renderJob++;$('indexedReader').hidden=true;$('viewer').hidden=false;oldLink()};
const oldLocate=$('locate').onclick;$('locate').onclick=()=>{if(verifiedPdf&&indexEntry()){currentPage=Number($('pageFrom').value)||indexEntry().from;drawIndexed()}else oldLocate()};
render();
