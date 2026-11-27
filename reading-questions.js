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

function addAnswerChoices(item,question,group,optionLists){
 const type=group?.type||question.type;
 const opts=question.options||group?.options||
  (type==='tfng'?['TRUE','FALSE','NOT GIVEN']:type==='ynng'?['YES','NO','NOT GIVEN']:[]);
 if(!opts.length)return;
 const number=question.number,input=item.querySelector('.answerValue');
 const options=opts.map(opt=>typeof opt==='string'?{value:opt,label:opt}:{value:opt.value,label:opt.label||opt.value});
 input.hidden=true;
 if(['match','people','headings'].includes(type)){
  const control=el('select',undefined,'answerControl');
  control.setAttribute('aria-label','Question '+number);
  control.add(new Option('Select an answer',''));
  for(const {value,label} of options)control.add(new Option(label===value?label:value+' · '+label,value));
  control.value=options.find(opt=>norm(opt.value)===norm(input.value))?.value||'';
  control.onchange=()=>sayAnswer(input,control.value);
  item.append(control);
  const optionList=JSON.stringify(options);
  if(!optionLists.has(optionList)&&options.some(({value,label})=>label!==value)){
   optionLists.add(optionList);
   const definitions=el('details',undefined,'answerOptionText'),list=el('ul');
   for(const {value,label} of options)list.append(el('li',label===value?label:value+' · '+label));
   definitions.append(el('summary','Option text'),list);item.append(definitions);
  }
  return;
 }
 const choices=el('fieldset',undefined,'choiceLine');
 choices.append(el('legend','Question '+number,'visuallyHidden'));
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
  progress.textContent='Selected '+checked.length+' / '+max+'';
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

function appendAnswerBlanks(line,text,items,inline){
 let end=0;
 for(const match of text.matchAll(/\[(\d+)\]/g)){
  const n=Number(match[1]),item=items.get(n);
  if(!item||inline.has(n))continue;
  line.append(document.createTextNode(text.slice(end,match.index)));
  item.classList.add('noteBlank');line.append(item);inline.add(n);
  end=match.index+match[0].length;
 }
 line.append(document.createTextNode(text.slice(end)));
}

function readingQuestionTable(data,items,inline){
 const table=el('table',undefined,'paperQuestionTable');
 const header=el('tr');
 for(const column of data.columns){
  const cell=el('th',column);cell.scope='col';header.append(cell);
 }
 table.createTHead().append(header);
 const body=table.createTBody();
 for(const {heading,points} of data.rows){
  const row=body.insertRow(),label=el('th',heading);
  label.scope='row';row.append(label);
  const list=el('ul');
  for(const point of points){
   const line=el('li');appendAnswerBlanks(line,point,items,inline);list.append(line);
  }
  row.insertCell().append(list);
 }
 return table;
}

function appendQuestionInstructions(section,instructions){
 const explanation=el('div',undefined,'paperInstructions');
 for(const text of (instructions||'').split('\n').filter(Boolean)){
  const rule=text.match(/^(TRUE|FALSE|NOT GIVEN|YES|NO) (if .+)$/);
  const line=el('p');
  if(rule){
   line.className='paperAnswerRule';
   line.append(el('strong',rule[1]),el('span',rule[2]));
  }else{
   const phrase=text.match(/ONE WORD ONLY|NO MORE THAN [A-Z ]+(?:WORDS?|NUMBERS?)/)?.[0];
   if(phrase){
    const i=text.indexOf(phrase);line.append(text.slice(0,i),el('strong',phrase),text.slice(i+phrase.length));
   }else line.textContent=text;
  }
  explanation.append(line);
 }
 section.append(explanation);
}

function renderReadingQuestions(data,translations){
 const items=new Map([...$('answers').querySelectorAll('.answerItem')].map(item=>[Number(item.dataset.number),item]));
 const questions=new Map(data.questions.map(q=>[q.number,q]));
 const panels=[],inline=new Set(),multi=new Set(),groups=new Map(),tableTranslations=new Map();
 const optionLists=new Set();
 for(const group of data.questionGroups||[]){
  const first=items.get(group.first);if(!first)continue;
  const section=el('div',undefined,'questionGroup');
  section.append(el('h3',group.first===group.last?'Question '+group.first:'Questions '+group.first+'–'+group.last,'paperQuestionHeading'));
  appendQuestionInstructions(section,group.instructions);
  if(group.text)section.append(el('p',group.text));
  first.before(section);
  const translation=translations?.questionGroups?.find(t=>t.id===group.id);
  if(translation?.zh){
   const detail=foldedTranslation('Show instructions translation',translation.zh);
   panels.push(detail);section.append(detail);
  }
  for(let n=group.first;n<=group.last;n++)groups.set(n,group);
  if(group.type==='multi'&&group.options?.length){
   renderMultipleChoice(section,group,items,questions.get(group.first).prompt);
   for(let n=group.first;n<=group.last;n++)multi.add(n);
  }
  if(group.table)section.append(readingQuestionTable(group.table,items,inline));
  if(group.body){
   const notes=el('div',undefined,'questionNotes');
   for(const [i,text] of group.body.entries()){
    const line=el('div',undefined,i===0&&!text.includes('[')?'questionNotesTitle':'questionNotesLine');
    appendAnswerBlanks(line,text,items,inline);notes.append(line);
   }
   section.append(notes);
  }
 }
 for(const [number,item] of items){
  const q=questions.get(number);if(!q||multi.has(number))continue;
  if(!inline.has(number)){
   item.querySelector('.answerValue').before(el('div',q.prompt,'questionPrompt'));
   addAnswerChoices(item,q,groups.get(number),optionLists);
  }
  const t=translations?.questions?.find(tr=>tr.number===number);
  if(t?.zh){
   const table=item.closest('.paperQuestionTable');
   let target=item;
   if(table){
    if(!tableTranslations.has(table)){
     const translations=el('details',undefined,'questionTranslation');
     translations.append(el('summary','Table translations'));
     table.after(translations);tableTranslations.set(table,translations);panels.push(translations);
    }
    target=tableTranslations.get(table);
   }else if(inline.has(number))target=item.parentElement;
   const detail=foldedTranslation(table?'Show translation for question '+number:'Show question translation',t.zh);
   panels.push(detail);
   target.append(detail);
  }
 }
 if(panels.length){
  const bar=el('div',undefined,'line');
  bar.append(makeButton('Show all question translations',()=>panels.forEach(d=>d.open=true)),makeButton('Hide all question translations',()=>panels.forEach(d=>d.open=false)));
  $('questionText').append(bar);
 }
}
