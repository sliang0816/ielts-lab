'use strict';

function sayAnswer(input,value){
 if(input.value===value)return;
 input.value=value;
 input.dispatchEvent(new Event('input',{bubbles:true}));
}

function restoreAnswerItems(){
 const target=$('answers');
 for(const input of answerInputs()){
  const item=input.closest('.answerItem');
  item.className='answerItem';
  input.hidden=false;
  item.replaceChildren(item.querySelector('.questionNumber'),input);
  target.append(item);
 }
}

function addAnswerChoices(item,question,group){
 const type=group?.type||question.type;
 const opts=question.options||group?.options||
  (type==='tfng'?['TRUE','FALSE','NOT GIVEN']:type==='ynng'?['YES','NO','NOT GIVEN']:[]);
 if(!opts.length)return;
 const number=question.number,input=item.querySelector('.answerValue');
 const options=opts.map(opt=>typeof opt==='string'?{value:opt,label:opt}:{value:opt.value,label:opt.label||opt.value});
 input.hidden=true;
 if(['match','people','headings'].includes(type)){
  const control=el('select',undefined,'answerControl');
  control.setAttribute('aria-label','题目 '+number);
  control.add(new Option('选择答案',''));
  for(const {value,label} of options)control.add(new Option(label===value?label:value+' · '+label,value));
  control.value=options.find(opt=>norm(opt.value)===norm(input.value))?.value||'';
  control.onchange=()=>sayAnswer(input,control.value);
  item.append(control);
  return;
 }
 const choices=el('fieldset',undefined,'choiceLine');
 choices.append(el('legend','题目 '+number,'visuallyHidden'));
 for(const {value,label} of options){
  const line=el('label',undefined,'choiceOption'),radio=el('input',undefined,'answerControl');
  radio.type='radio';radio.name='answer-'+number;radio.value=value;
  radio.checked=norm(value)===norm(input.value);
  radio.onchange=()=>sayAnswer(input,value);
  line.append(radio,el('span',label===value?label:value+' · '+label));choices.append(line);
 }
 item.append(choices);
}

function renderMultipleChoice(section,group,items,prompt){
 const numbers=Array.from({length:group.last-group.first+1},(_,i)=>group.first+i);
 const wrappers=numbers.map(n=>items.get(n));
 const inputs=wrappers.map(item=>item.querySelector('.answerValue'));
 const max=numbers.length;
 const choices=el('fieldset',undefined,'multiQuestion');
 choices.append(el('legend',prompt,'questionPrompt'));
 const controls=[];
 for(const option of group.options){
  const row=el('label',undefined,'choiceOption'),control=el('input',undefined,'answerControl');
  control.type='checkbox';control.value=option.value;
  control.checked=inputs.some(input=>norm(input.value)===norm(option.value));
  row.append(control,el('span',option.value+' · '+option.label));choices.append(row);
  controls.push(control);
 }
 const progress=el('p',undefined,'muted');
 function updateChoices(){
  const checked=controls.filter(c=>c.checked);
  for(const control of controls)control.disabled=!control.checked&&checked.length>=max;
  progress.textContent='已选 '+checked.length+' / '+max+' 项';
 }
 choices.onchange=()=>{
  const values=controls.filter(c=>c.checked).map(c=>c.value);
  inputs.forEach((input,i)=>{input.value=values[i]||''});
  inputs[0].dispatchEvent(new Event('input',{bubbles:true}));
  updateChoices();
 };
 for(const [i,item] of wrappers.entries()){
  item.classList.add('choiceSlot');
  inputs[i].hidden=true;choices.append(item);
 }
 choices.append(progress);section.append(choices);updateChoices();
}

function renderReadingQuestions(data,translations){
 const items=new Map([...$('answers').querySelectorAll('.answerItem')].map(item=>[Number(item.dataset.number),item]));
 const questions=new Map(data.questions.map(q=>[q.number,q]));
 const panels=[],inline=new Set(),multi=new Set(),groups=new Map();
 for(const group of data.questionGroups||[]){
  const first=items.get(group.first);if(!first)continue;
  const section=el('div',undefined,'questionGroup');
  section.append(el('strong','Questions '+group.first+'–'+group.last),el('p',group.instructions||''));
  if(group.text)section.append(el('p',group.text));
  first.before(section);
  const translation=translations?.questionGroups?.find(t=>t.id===group.id);
  if(translation?.zh){
   const detail=foldedTranslation('显示题组说明译文',translation.zh);
   panels.push(detail);section.append(detail);
  }
  for(let n=group.first;n<=group.last;n++)groups.set(n,group);
  if(group.type==='multi'&&group.options?.length){
   renderMultipleChoice(section,group,items,questions.get(group.first).prompt);
   for(let n=group.first;n<=group.last;n++)multi.add(n);
  }
  if(group.body){
   const notes=el('div',undefined,'questionNotes');
   for(const [i,text] of group.body.entries()){
    const line=el('div',undefined,i===0&&!text.includes('[')?'questionNotesTitle':'questionNotesLine');
    let end=0;
    for(const match of text.matchAll(/\[(\d+)\]/g)){
     const n=Number(match[1]),item=items.get(n);
     if(!item||inline.has(n))continue;
     line.append(document.createTextNode(text.slice(end,match.index)));
     item.classList.add('noteBlank');line.append(item);inline.add(n);
     end=match.index+match[0].length;
    }
    line.append(document.createTextNode(text.slice(end)));notes.append(line);
   }
   section.append(notes);
  }
 }
 for(const [number,item] of items){
  const q=questions.get(number);if(!q||multi.has(number))continue;
  if(!inline.has(number)){
   item.prepend(el('div',q.prompt,'questionPrompt'));
   addAnswerChoices(item,q,groups.get(number));
  }
  const t=translations?.questions?.find(tr=>tr.number===number);
  if(t?.zh){
   const detail=foldedTranslation('显示本题译文',t.zh);
   panels.push(detail);
   if(inline.has(number))item.parentElement.append(detail);else item.append(detail);
  }
 }
 if(panels.length){
  const bar=el('div',undefined,'line');
  bar.append(makeButton('展开全部题目译文',()=>panels.forEach(d=>d.open=true)),makeButton('隐藏全部题目译文',()=>panels.forEach(d=>d.open=false)));
  $('questionText').append(bar);
 }
}
