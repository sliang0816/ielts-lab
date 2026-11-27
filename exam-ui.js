'use strict';
let focusedReadingQuestion=null;
function scrollReadingPane(container,target,center=false){
 const bounds=container.getBoundingClientRect(),row=target.getBoundingClientRect();
 if(!center&&row.top>=bounds.top&&row.top<bounds.bottom&&row.bottom<=bounds.bottom)return;
 const top=container.scrollTop+row.top-bounds.top;
 container.scrollTo({top:center?top-Math.max(0,(bounds.height-row.height)/2):top});
}
function updateExamNav(){
 const nav=$('examQuestionNav');if(!nav)return;
 const inputs=answerInputs(),review=latestQuestionReview?.key===key()?latestQuestionReview.record:null;
 nav.replaceChildren(el('span','Passage '+$('passage').value,'navCaption'));
 let answered=0;
 for(const input of inputs){
  const n=Number(input.dataset.number),result=review?.items.find(item=>item.number===n);
  const has=!!(result?result.answer:input.value).trim();if(has)answered++;
  const b=el('button',String(n));b.type='button';
  b.className=has?(result?(result.correct?'correctNav':'wrongNav'):'answered'):'';
  b.setAttribute('aria-label', 'Question '+n+(has?(result?(result.correct?', correct':', incorrect'):', answered'):', unanswered'));
  if(focusedReadingQuestion===n)b.setAttribute('aria-current','true');
  b.onclick=()=>{
   focusedReadingQuestion=n;
   nav.querySelector('[aria-current]')?.removeAttribute('aria-current');
   b.setAttribute('aria-current','true');
   setReadingTab('questions');
   if(review){
    const card=$('review-question-'+n);if(!card)return;
    if(card.hidden){$('onlyMistakes').checked=false;filterReviewQuestions()}
    scrollReadingPane($('reviewQuestions'),card);card.focus({preventScroll:true});
   }else{
    const item=input.closest('.answerItem'),group=item.closest('.multiQuestion')||item;
    const control=input.hidden?(group.querySelector('.answerControl:checked')||group.querySelector('.answerControl')):input;
    scrollReadingPane($('answers'),group);control?.focus({preventScroll:true});
   }
  };
  nav.append(b);
 }
 $('answerProgress').textContent='Answered '+answered+'/'+inputs.length;
}
const oldExamRender=render;render=function(){oldExamRender();updateExamNav()};
$('answers').addEventListener('input',updateExamNav);
const oldExamGrade=$('grade').onclick;$('grade').onclick=()=>{oldExamGrade();updateExamNav()};
$('testDeepseek').onclick=async()=>{const btn=$('testDeepseek'),status=$('deepseekStatus'),k=$('deepseekKey').value.trim();if(!k){status.textContent='Enter a DeepSeek API key first';return}btn.disabled=true;status.textContent='Testing connection (API charges may apply)…';try{const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+k},body:JSON.stringify({model:'deepseek-flash',thinking:{type:'disabled'},messages:[{role:'user',content:'Reply OK'}],max_tokens:16}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(!j.choices?.length)throw Error('Empty response');status.textContent='Connected: deepseek-flash'}catch(e){status.textContent='Connection failed: '+e.message+'. Check browser network access.'}finally{btn.disabled=false}};
updateExamNav();


const deepseekLocalKey='ielts-deepseek-key-v1',deepseekRememberKey='ielts-deepseek-remember-v1';
try{$('rememberDeepseek').checked=localStorage.getItem(deepseekRememberKey)!=='false';if($('rememberDeepseek').checked)$('deepseekKey').value=localStorage.getItem(deepseekLocalKey)||''}catch{}
function saveDeepseekPreference(){
 try{localStorage.setItem(deepseekRememberKey,String($('rememberDeepseek').checked));const k=$('deepseekKey').value.trim();if($('rememberDeepseek').checked&&k)localStorage.setItem(deepseekLocalKey,k);else localStorage.removeItem(deepseekLocalKey);$('deepseekStatus').textContent=k?($('rememberDeepseek').checked?'Key saved on this device':'Key available in this tab'):'No key set'}catch{$('deepseekStatus').textContent='Browser storage unavailable. Key available in this tab.'}
}
$('deepseekKey').addEventListener('input',saveDeepseekPreference);
$('rememberDeepseek').onchange=saveDeepseekPreference;
$('clearDeepseek').onclick=()=>{$('deepseekKey').value='';saveDeepseekPreference();$('deepseekStatus').textContent='Saved key cleared'};
if($('deepseekKey').value)$('deepseekStatus').textContent='Saved key restored';
