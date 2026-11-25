'use strict';
function updateExamNav(){
 const nav=$('examQuestionNav');if(!nav)return;
 const d=draft(),inputs=[...$('answers').querySelectorAll('input')],review=typeof latestQuestionReview!=='undefined'&&latestQuestionReview?.key===key()?latestQuestionReview.record:null;
 nav.replaceChildren(el('span','Passage '+$('passage').value,'navCaption'));
 let answered=0;
 inputs.forEach((input,i)=>{const n=d.first+i,has=!!input.value.trim();if(has)answered++;const result=review?.items.find(x=>x.number===n);const b=el('button',String(n));b.type='button';b.className=result?(result.correct?'correctNav':'wrongNav'):has?'answered':'';b.setAttribute('aria-label','第 '+n+' 题'+(result?(result.correct?'，正确':'，错误'):has?'，已答':'，未答'));b.onclick=()=>{input.closest('label')?.scrollIntoView({block:'center',behavior:'smooth'});input.focus({preventScroll:true})};nav.append(b)});
 $('answerProgress').textContent='已答 '+answered+'/'+inputs.length;
 const submit=el('button','提交并批改','navSubmit');submit.type='button';submit.onclick=()=>$('grade').click();nav.append(submit);
}
const oldExamRender=render;render=function(){oldExamRender();updateExamNav()};
$('answers').addEventListener('input',updateExamNav);
const oldExamGrade=$('grade').onclick;$('grade').onclick=()=>{oldExamGrade();updateExamNav()};
$('testDeepseek').onclick=async()=>{const btn=$('testDeepseek'),status=$('deepseekStatus'),k=$('deepseekKey').value.trim();if(!k){status.textContent='请先填写 API Key';return}btn.disabled=true;status.textContent='正在测试（会发送一条极短请求，可能计费）…';try{const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+k},body:JSON.stringify({model:'deepseek-flash',thinking:{type:'disabled'},messages:[{role:'user',content:'Reply OK'}],max_tokens:16}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(!j.choices?.length)throw Error('响应无内容');status.textContent='连接成功：deepseek-flash'}catch(e){status.textContent='连接失败：'+e.message+'；若浏览器跨域拦截，需要自建 HTTPS 代理。'}finally{btn.disabled=false}};
updateExamNav();


const deepseekLocalKey='ielts-deepseek-key-v1',deepseekRememberKey='ielts-deepseek-remember-v1';
try{$('rememberDeepseek').checked=localStorage.getItem(deepseekRememberKey)!=='false';if($('rememberDeepseek').checked)$('deepseekKey').value=localStorage.getItem(deepseekLocalKey)||''}catch{}
function saveDeepseekPreference(){
 try{localStorage.setItem(deepseekRememberKey,String($('rememberDeepseek').checked));const k=$('deepseekKey').value.trim();if($('rememberDeepseek').checked&&k)localStorage.setItem(deepseekLocalKey,k);else localStorage.removeItem(deepseekLocalKey);$('deepseekStatus').textContent=k?($('rememberDeepseek').checked?'密钥已保存在当前设备':'密钥仅在本页使用'):'尚未填写密钥'}catch{$('deepseekStatus').textContent='浏览器禁止本地存储，密钥仅在当前页有效'}
}
$('deepseekKey').addEventListener('input',saveDeepseekPreference);
$('rememberDeepseek').onchange=saveDeepseekPreference;
$('clearDeepseek').onclick=()=>{$('deepseekKey').value='';saveDeepseekPreference();$('deepseekStatus').textContent='本机密钥已清除'};
if($('deepseekKey').value)$('deepseekStatus').textContent='已恢复本机保存的密钥';
