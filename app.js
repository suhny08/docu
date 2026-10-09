const HISTORY_KEY="docu-study-history-v1";
let questions=[], current=null, answers={};

const $=s=>document.querySelector(s);
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

async function init(){
  questions=await fetch("./questions.json",{cache:"no-store"}).then(r=>r.json());
  const d=today();
  current=questions.filter(q=>q.date<=d).sort((a,b)=>b.date.localeCompare(a.date))[0]||questions[0];
  renderToday();
  bindGlobal();
}

function history(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")}catch{return []}}
function saveHistory(item){
  const list=history().filter(x=>x.questionId!==item.questionId);
  list.push(item);
  localStorage.setItem(HISTORY_KEY,JSON.stringify(list.sort((a,b)=>a.date.localeCompare(b.date))));
}
function esc(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

function renderToday(){
  answers={};
  const old=history().find(x=>x.questionId===current.id);
  $("#todayView").classList.remove("hidden"); $("#historyView").classList.add("hidden");
  $("#todayView").innerHTML=`
  <article class="card">
    <div class="meta"><span class="tag">${esc(current.date)}</span><span class="tag">${esc(current.topic)}</span><span class="tag">${esc(current.company)}</span></div>
    <h2>${esc(current.title)}</h2>
    <h3>사실관계</h3>
    <ul class="facts">${current.facts.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    <h3>적용 규정 · 원칙</h3>
    <div class="rule">${esc(current.rule.summary)}</div>
    <div id="questions"></div>
    <button id="submitBtn" class="primary">판단 제출</button>
    <div id="result"></div>
  </article>`;
  const qBox=$("#questions");
  current.questions.forEach((q,i)=>{
    const el=document.createElement("div"); el.className="question";
    el.innerHTML=`<div class="question-title">Q${i+1}. ${esc(q.prompt)}</div>`;
    if(q.type==="choice"){
      q.options.forEach((op,idx)=>{
        const b=document.createElement("button"); b.className="option"; b.textContent=op;
        b.onclick=()=>{answers[q.id]=idx; el.querySelectorAll(".option").forEach(x=>x.classList.remove("selected")); b.classList.add("selected")};
        el.appendChild(b);
      });
    }else{
      const ta=document.createElement("textarea"); ta.className="text-answer"; ta.placeholder="한 문장으로 적어보세요.";
      ta.oninput=()=>answers[q.id]=ta.value; el.appendChild(ta);
    }
    qBox.appendChild(el);
  });
  $("#submitBtn").onclick=submit;
  if(old) showResult(old);
}

function submit(){
  const unanswered=current.questions.some(q=>answers[q.id]===undefined||answers[q.id]==="");
  if(unanswered){alert("모든 질문에 답해 주세요.");return}
  let score=0, graded=0;
  current.questions.forEach(q=>{if(q.type==="choice"){graded++; if(answers[q.id]===q.answer)score++;}});
  const item={questionId:current.id,date:current.date,topic:current.topic,title:current.title,answers,score,graded,completedAt:new Date().toISOString()};
  saveHistory(item); showResult(item);
}

function showResult(item){
  const pct=item.graded?Math.round(item.score/item.graded*100):null;
  $("#result").innerHTML=`
    <div class="result">
      ${pct!==null?`<div class="correct">객관식 ${item.score}/${item.graded} · ${pct}%</div>`:""}
      <h3>실제 판단</h3><p>${esc(current.explanation)}</p>
      <h3>실무 포인트</h3><p>${esc(current.practicalPoint)}</p>
      <h3>한 단계 더 묻기</h3><p>${esc(current.followUp)}</p>
      <div class="source"><h3>출처</h3>${current.sources.map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a></p>`).join("")}</div>
    </div>`;
}

function renderHistory(){
  $("#todayView").classList.add("hidden"); $("#historyView").classList.remove("hidden");
  const list=history().sort((a,b)=>b.date.localeCompare(a.date));
  $("#historyView").innerHTML=`<div class="card"><h2>학습기록</h2>${list.length?list.map(x=>`<div class="history-row"><strong>${esc(x.date)} · ${esc(x.topic)}</strong><div>${esc(x.title)}</div><small>${x.graded?`객관식 ${x.score}/${x.graded}`:"완료"} · ${new Date(x.completedAt).toLocaleString("ko-KR")}</small></div>`).join(""):"<p>아직 기록이 없습니다.</p>"}</div>`;
}

function bindGlobal(){
  $("#historyBtn").onclick=()=>$("#historyView").classList.contains("hidden")?renderHistory():renderToday();
  $("#exportBtn").onclick=()=>{
    const blob=new Blob([JSON.stringify(history(),null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`docu-history-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  $("#importInput").onchange=async e=>{
    const f=e.target.files[0]; if(!f)return;
    try{const data=JSON.parse(await f.text()); if(!Array.isArray(data))throw 0; localStorage.setItem(HISTORY_KEY,JSON.stringify(data)); alert("복원 완료"); renderToday()}catch{alert("올바른 백업 파일이 아닙니다.")}
  };
}
init().catch(()=>{$("#todayView").innerHTML='<div class="card"><h2>문제를 불러오지 못했습니다.</h2><p>잠시 후 다시 시도해 주세요.</p></div>'});