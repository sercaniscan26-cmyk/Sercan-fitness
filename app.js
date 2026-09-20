const DEFAULT_STATE = {
  settings:{
    startDate:new Date().toISOString().slice(0,10),height:168,startWeight:86,goalWeight:78,
    calories:2100,protein:150,carbs:225,fat:65,steps:9000,water:3
  },
  checkins:[], foods:{}, workouts:{}, cloud:{url:"",key:"",email:"",accessToken:"",userId:""}
};

const WORKOUTS = {
  "Pazartesi • Upper A":[
    ["Bench Press","4×6–8"],["Lat Pulldown / Pull-up","4×6–10"],["Incline Dumbbell Press","3×8–12"],
    ["Chest Supported Row","3×8–12"],["Lateral Raise","4×12–20"],["Triceps Pushdown","3×10–15"],["Dumbbell Curl","3×10–15"]],
  "Salı • Lower A":[
    ["Back Squat","4×5–8"],["Romanian Deadlift","4×6–10"],["Leg Press","3×10–15"],
    ["Leg Curl","3×10–15"],["Standing Calf Raise","4×10–15"],["Cable Crunch / Plank","3 set"]],
  "Çarşamba • Kardiyo + Mobilite":[
    ["Zone-2 Kardiyo","35–45 dk"],["Yürüyüş","Gün toplamı 9–10 bin adım"],["Mobilite","10–15 dk"]],
  "Perşembe • Push":[
    ["Incline Bench Press","4×6–10"],["Machine Chest Press","3×8–12"],["Overhead Press","3×6–10"],
    ["Lateral Raise","4×12–20"],["Overhead Triceps Extension","3×10–15"],["Rope Pushdown","2×12–15"]],
  "Cuma • Pull":[
    ["Pull-up / Lat Pulldown","4×6–10"],["Barbell / T-Bar Row","4×6–10"],["Seated Cable Row","3×8–12"],
    ["Rear Delt Fly","4×12–20"],["EZ Bar Curl","3×8–12"],["Hammer Curl","3×10–15"]],
  "Cumartesi • Legs B":[
    ["Hack Squat / Front Squat","4×8–12"],["Bulgarian Split Squat","3×8–12/bacak"],["Hip Thrust","3×8–12"],
    ["Leg Curl","3×10–15"],["Calf Raise","4×10–15"],["Incline Walk","15–20 dk"]],
  "Pazar • Dinlenme":[["Aktif dinlenme","8–10 bin rahat adım"],["Esneme","10 dk"],["Hazırlık","Ölçüm + yemek planı"]]
};

const QUICK_FOODS = [
  ["2 yumurta",145,13,1,10],["60 g yulaf",228,8,38,4],
  ["200 g protein yoğurt",150,20,12,2],["150 g tavuk göğüs",248,46,0,5],
  ["200 g pişmiş pirinç",260,5,57,1],["1 muz",105,1,27,0],
  ["1 ölçek whey isolate",115,25,2,1],["150 g yağsız dana",300,39,0,15],
  ["300 g patates",231,6,51,0],["10 g zeytinyağı",90,0,0,10]
];

let state = loadState();
let selectedWorkout = todayWorkoutKey();
let deferredInstallPrompt = null;

function clone(x){return JSON.parse(JSON.stringify(x))}
function mergeState(base,extra){
  return {
    settings:{...base.settings,...(extra.settings||{})},
    checkins:Array.isArray(extra.checkins)?extra.checkins:base.checkins,
    foods:{...base.foods,...(extra.foods||{})},
    workouts:{...base.workouts,...(extra.workouts||{})},
    cloud:{...base.cloud,...(extra.cloud||{})}
  };
}
function loadState(){
  try{
    const raw=localStorage.getItem("aytech_fitness_state");
    if(raw) return mergeState(clone(DEFAULT_STATE),JSON.parse(raw));
    // Eski demo verisini yakala
    const oldLogs=JSON.parse(localStorage.getItem("aytech_logs")||"[]");
    const oldSettings=JSON.parse(localStorage.getItem("aytech_settings")||"{}");
    const migrated=clone(DEFAULT_STATE);
    if(oldLogs.length) migrated.checkins=oldLogs.map(x=>({date:x.date,weight:x.weight,waist:x.waist,steps:x.steps,water:x.water,sleep:x.sleep,note:x.notes||""}));
    if(Object.keys(oldSettings).length) migrated.settings={...migrated.settings,...{
      height:oldSettings.height||168,startWeight:oldSettings.startWeight||86,calories:oldSettings.calTarget||2100,
      protein:oldSettings.proteinTarget||150,steps:oldSettings.stepsTarget||9000,water:oldSettings.waterTarget||3
    }};
    return migrated;
  }catch(e){return clone(DEFAULT_STATE)}
}
function saveState(sync=true){
  localStorage.setItem("aytech_fitness_state",JSON.stringify(state));
  if(sync && state.cloud.accessToken && state.cloud.userId) cloudPush(true);
}
function todayISO(){return new Date().toISOString().slice(0,10)}
function fmt(n,d=0){return Number.isFinite(+n)?(+n).toFixed(d):"—"}
function safeNum(v){const n=Number(v);return Number.isFinite(n)?n:0}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function avg(arr,key){const vals=arr.map(x=>safeNum(x[key])).filter(x=>x>0);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null}
function dateDiffDays(a,b){return Math.floor((new Date(b)-new Date(a))/86400000)}
function currentWeek(){
  const d=Math.max(0,dateDiffDays(state.settings.startDate,todayISO()));
  return clamp(Math.floor(d/7)+1,1,12);
}
function phaseForWeek(w){
  if(w<=3)return["Blok 1","Temel + progresyon"];
  if(w===4)return["Deload","Hacmi ~%40 azalt"];
  if(w<=7)return["Blok 2","Yükleme"];
  if(w===8)return["Deload","Toparlan"];
  if(w<=11)return["Blok 3","Güçlü blok"];
  return["Hafta 12","Ölçüm + yeni plan"];
}
function todayWorkoutKey(){
  const day=new Date().getDay();
  const map={0:"Pazar • Dinlenme",1:"Pazartesi • Upper A",2:"Salı • Lower A",3:"Çarşamba • Kardiyo + Mobilite",4:"Perşembe • Push",5:"Cuma • Pull",6:"Cumartesi • Legs B"};
  return map[day];
}
function getCheckin(date){return state.checkins.find(x=>x.date===date)||{}}
function getFoods(date){return state.foods[date]||[]}
function foodTotals(date){
  return getFoods(date).reduce((a,x)=>({cal:a.cal+safeNum(x.cal),p:a.p+safeNum(x.p),c:a.c+safeNum(x.c),f:a.f+safeNum(x.f)}),{cal:0,p:0,c:0,f:0});
}

function setTab(id){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
  if(id==="progress") setTimeout(drawWeightChart,50);
  if(id==="coach") renderCoach();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
document.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.jump)));

function renderAll(){
  const s=state.settings,w=currentWeek(),phase=phaseForWeek(w);
  document.getElementById("weekBadge").textContent=`Hafta ${w} / 12`;
  document.getElementById("phasePill").textContent=phase[0]+" • "+phase[1];
  ["calTargetTxt","proteinTargetTxt","stepsTargetTxt"].forEach(id=>{});
  document.getElementById("calTargetTxt").textContent=s.calories;
  document.getElementById("proteinTargetTxt").textContent=s.protein;
  document.getElementById("stepsTargetTxt").textContent=s.steps;
  document.getElementById("waterTargetTxt").textContent=fmt(s.water,1);
  renderDashboard();
  renderNutrition();
  renderTraining();
  renderProgress();
  renderSettings();
  renderCoach();
}
function renderDashboard(){
  const date=document.getElementById("dailyDate").value||todayISO();
  const ci=getCheckin(date),tot=foodTotals(date),s=state.settings;
  document.getElementById("calUsed").textContent=Math.round(tot.cal);
  document.getElementById("proteinUsed").textContent=Math.round(tot.p);
  document.getElementById("stepsUsed").textContent=Math.round(safeNum(ci.steps));
  document.getElementById("waterUsed").textContent=fmt(safeNum(ci.water),1);
  document.getElementById("calRemain").textContent=Math.max(0,Math.round(s.calories-tot.cal))+" kcal kaldı";
  document.getElementById("proteinRemain").textContent=Math.max(0,Math.round(s.protein-tot.p))+" g kaldı";
  document.getElementById("stepsRemain").textContent=Math.max(0,Math.round(s.steps-safeNum(ci.steps)))+" kaldı";
  document.getElementById("waterRemain").textContent=fmt(Math.max(0,s.water-safeNum(ci.water)),1)+" L kaldı";
  document.getElementById("calBar").style.width=clamp(tot.cal/s.calories*100,0,100)+"%";
  document.getElementById("proteinBar").style.width=clamp(tot.p/s.protein*100,0,100)+"%";
  document.getElementById("stepsBar").style.width=clamp(safeNum(ci.steps)/s.steps*100,0,100)+"%";
  document.getElementById("waterBar").style.width=clamp(safeNum(ci.water)/s.water*100,0,100)+"%";
  const scores=[
    1-Math.min(1,Math.abs(tot.cal-s.calories)/(s.calories*.25)),
    Math.min(1,tot.p/s.protein),Math.min(1,safeNum(ci.steps)/s.steps),Math.min(1,safeNum(ci.water)/s.water)
  ];
  document.getElementById("dayScore").textContent=Math.max(0,Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*100));
  const key=todayWorkoutKey();
  document.getElementById("todayWorkoutTitle").textContent=key;
  document.getElementById("todayWorkoutPreview").innerHTML=WORKOUTS[key].slice(0,5).map(x=>`<div class="compact-item"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
  ["dailyWeight","dailyWaist","dailySteps","dailyWater","dailySleep","dailyNote"].forEach(id=>{
    const map={dailyWeight:"weight",dailyWaist:"waist",dailySteps:"steps",dailyWater:"water",dailySleep:"sleep",dailyNote:"note"};
    if(document.activeElement.id!==id) document.getElementById(id).value=ci[map[id]]??"";
  });
}
function renderNutrition(){
  const date=document.getElementById("foodDate").value||todayISO(),tot=foodTotals(date),foods=getFoods(date);
  nCal.textContent=Math.round(tot.cal);nP.textContent=Math.round(tot.p)+" g";nC.textContent=Math.round(tot.c)+" g";nF.textContent=Math.round(tot.f)+" g";
  foodListTitle.textContent=date===todayISO()?"Bugün":date;
  foodList.className="food-list"+(foods.length?"":" empty-state");
  foodList.innerHTML=foods.length?foods.map((x,i)=>`<div class="food-row">
      <div><b>${escapeHtml(x.name)}</b><small>${Math.round(x.cal)} kcal</small></div>
      <div><b>${fmt(x.p,0)}g</b><small>P</small></div>
      <div class="hide-sm"><b>${fmt(x.c,0)}g</b><small>K</small></div>
      <div class="hide-mobile"><b>${fmt(x.f,0)}g</b><small>Y</small></div>
      <button title="Sil" onclick="removeFood('${date}',${i})">×</button></div>`).join(""):"Henüz öğün eklenmedi.";
}
function renderQuickFoods(){
  quickFoods.innerHTML=QUICK_FOODS.map((x,i)=>`<button class="quick-food" onclick="addQuickFood(${i})"><b>${x[0]}</b><span>${x[1]} kcal • ${x[2]}g protein</span></button>`).join("");
}
window.addQuickFood=function(i){
  const x=QUICK_FOODS[i],date=foodDate.value||todayISO();
  state.foods[date]=state.foods[date]||[];state.foods[date].push({name:x[0],cal:x[1],p:x[2],c:x[3],f:x[4]});
  saveState();renderAll();
}
window.removeFood=function(date,i){state.foods[date].splice(i,1);saveState();renderAll()}

function renderTraining(){
  trainingDays.innerHTML=Object.keys(WORKOUTS).map(k=>`<button class="${k===selectedWorkout?"active":""}" data-k="${k}">${k.split(" • ")[0]}</button>`).join("");
  trainingDays.querySelectorAll("button").forEach(b=>b.onclick=()=>{selectedWorkout=b.dataset.k;renderTraining()});
  trainingTitle.textContent=selectedWorkout;trainingEyebrow.textContent=`HAFTA ${currentWeek()} • ${phaseForWeek(currentWeek())[0].toUpperCase()}`;
  trainingHint.textContent=[4,8,12].includes(currentWeek())?"Deload / ölçüm":"RIR 1–2";
  const date=todayISO(), key=`${date}|${selectedWorkout}`, saved=state.workouts[key]?.entries||[];
  exerciseList.innerHTML=WORKOUTS[selectedWorkout].map((x,i)=>{
    const prev=findPreviousExercise(selectedWorkout,x[0]),cur=saved[i]||{};
    return `<div class="exercise-row" data-ex="${escapeAttr(x[0])}">
      <div class="ex-title"><b>${x[0]}</b><span>Program: ${x[1]}</span></div>
      <label>kg<input class="ex-weight" type="number" step=".5" value="${cur.weight??""}" placeholder="${prev?.weight??""}"></label>
      <label>tekrar<input class="ex-reps" type="text" value="${cur.reps??""}" placeholder="${prev?.reps??"8,8,8"}"></label>
      <label>set<input class="ex-sets" type="number" value="${cur.sets??""}" placeholder="${parseInt(x[1])||3}"></label>
      <div class="last">${prev?`Önceki: ${prev.weight||"—"} kg • ${prev.reps||"—"}`:"İlk kayıt"}</div>
    </div>`;
  }).join("");
}
function findPreviousExercise(day,name){
  const keys=Object.keys(state.workouts).filter(k=>k.endsWith("|"+day)).sort().reverse();
  for(const k of keys){for(const e of state.workouts[k].entries||[]){if(e.name===name)return e}}
  return null;
}
function renderProgress(){
  const logs=[...state.checkins].filter(x=>safeNum(x.weight)>0).sort((a,b)=>a.date.localeCompare(b.date)),last=logs.at(-1);
  pStart.textContent=fmt(state.settings.startWeight,1);pCurrent.textContent=last?fmt(last.weight,1):"—";
  pChange.textContent=last?fmt(safeNum(last.weight)-state.settings.startWeight,1):"—";pGoal.textContent=fmt(state.settings.goalWeight,1);
  historyBody.innerHTML=[...state.checkins].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${x.date}</td><td>${x.weight??"—"}</td><td>${x.waist??"—"}</td><td>${x.steps??"—"}</td><td>${x.water??"—"}</td><td>${x.sleep??"—"}</td><td><button onclick="deleteCheckin('${x.date}')">Sil</button></td></tr>`).join("");
  drawWeightChart();
}
window.deleteCheckin=function(date){state.checkins=state.checkins.filter(x=>x.date!==date);saveState();renderAll()}

function drawWeightChart(){
  const canvas=document.getElementById("weightChart");if(!canvas||!canvas.offsetWidth)return;
  const dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=260;canvas.width=w*dpr;canvas.height=h*dpr;
  const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  const logs=[...state.checkins].filter(x=>safeNum(x.weight)>0).sort((a,b)=>a.date.localeCompare(b.date));
  if(logs.length<2){ctx.fillStyle="#93a0b4";ctx.font="13px system-ui";ctx.fillText("Grafik için en az 2 kilo kaydı gir.",18,40);return}
  const vals=logs.map(x=>safeNum(x.weight)),min=Math.min(...vals)-1,max=Math.max(...vals)+1,pad=30;
  ctx.strokeStyle="#263244";ctx.lineWidth=1;
  for(let i=0;i<5;i++){let y=pad+(h-pad*2)*i/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke()}
  ctx.beginPath();logs.forEach((x,i)=>{const px=pad+(w-pad*2)*(i/(logs.length-1)),py=pad+(h-pad*2)*(1-(x.weight-min)/(max-min));i?ctx.lineTo(px,py):ctx.moveTo(px,py)});
  ctx.strokeStyle="#77e08a";ctx.lineWidth=3;ctx.stroke();
  logs.forEach((x,i)=>{const px=pad+(w-pad*2)*(i/(logs.length-1)),py=pad+(h-pad*2)*(1-(x.weight-min)/(max-min));ctx.fillStyle="#5fa8ff";ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fill()});
  ctx.fillStyle="#93a0b4";ctx.font="11px system-ui";ctx.fillText(max.toFixed(1)+" kg",2,pad+4);ctx.fillText(min.toFixed(1)+" kg",2,h-pad+4);
}

function renderCoach(){
  const logs=[...state.checkins].filter(x=>safeNum(x.weight)>0).sort((a,b)=>b.date.localeCompare(a.date));
  const recent=logs.slice(0,7),prev=logs.slice(7,14),rw=avg(recent,"weight"),pw=avg(prev,"weight");
  let decision="Veri toplanıyor",txt="En az 7 günlük düzenli kilo ve beslenme kaydı girdikten sonra anlamlı değerlendirme başlayacak.";
  const last7Dates=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)});
  const fTotals=last7Dates.map(d=>foodTotals(d)),avgCal=fTotals.reduce((a,x)=>a+x.cal,0)/7,avgP=fTotals.reduce((a,x)=>a+x.p,0)/7;
  const recentSteps=state.checkins.filter(x=>last7Dates.includes(x.date));const avgSteps=avg(recentSteps,"steps");
  const weekWorkoutCount=Object.keys(state.workouts).filter(k=>last7Dates.some(d=>k.startsWith(d+"|"))).length;
  if(recent.length>=5 && prev.length>=5 && rw && pw){
    const loss=pw-rw;
    if(loss>=.4 && loss<=.8){decision="Kaloriyi değiştirme";txt=`Haftalık ortalama yaklaşık ${loss.toFixed(2)} kg düştü. Tempo hedef aralıkta. Aynı kalori ve antrenman düzeniyle devam et.`}
    else if(loss>=0 && loss<.4){decision="Önce uyumu düzelt";txt=`Haftalık düşüş yaklaşık ${loss.toFixed(2)} kg. 2 hafta üst üste böyle giderse önce günlük adım ve gerçek kalori kaydını sıkılaştır; hâlâ yavaşsa yaklaşık 100 kcal azaltmayı değerlendirebilirsin.`}
    else if(loss>.8){decision="Fazla hızlı olabilir";txt=`Haftalık ortalama yaklaşık ${loss.toFixed(2)} kg düştü. Güç, uyku veya toparlanma bozuluyorsa açığı biraz küçültmek mantıklı olabilir.`}
    else{decision="Tek haftaya göre sert kesinti yapma";txt="Ortalama kilo yükselmiş görünüyor. Tuz, karbonhidrat, bağırsak içeriği ve su bunu etkileyebilir. 14 günlük trend ve kalori uyumunu birlikte kontrol et."}
  }
  coachDecision.textContent=decision;coachText.textContent=txt;
  coachStats.innerHTML=[
    ["7g kilo",rw?rw.toFixed(1)+" kg":"—"],["7g kalori",avgCal?Math.round(avgCal):"—"],["7g protein",avgP?Math.round(avgP)+" g":"—"],["Antrenman",weekWorkoutCount+"/5"]
  ].map(x=>`<div class="card coach-stat"><b>${x[1]}</b><span>${x[0]}</span></div>`).join("");
}

function renderSettings(){
  const s=state.settings,map={
    startDate:"startDate",height:"setHeight",startWeight:"setStartWeight",goalWeight:"setGoalWeight",calories:"setCalories",
    protein:"setProtein",carbs:"setCarbs",fat:"setFat",steps:"setSteps",water:"setWater"
  };
  Object.entries(map).forEach(([k,id])=>{if(document.activeElement.id!==id)document.getElementById(id).value=s[k]});
  if(document.activeElement.id!=="supabaseUrl")supabaseUrl.value=state.cloud.url||"";
  if(document.activeElement.id!=="supabaseKey")supabaseKey.value=state.cloud.key||"";
  if(document.activeElement.id!=="cloudEmail")cloudEmail.value=state.cloud.email||"";
  cloudStatus.textContent=state.cloud.accessToken?"Bağlı":"Bağlı değil";
}

saveCheckin.onclick=()=>{
  const date=dailyDate.value||todayISO(),entry={
    date,weight:safeNum(dailyWeight.value)||null,waist:safeNum(dailyWaist.value)||null,steps:safeNum(dailySteps.value)||null,
    water:safeNum(dailyWater.value)||null,sleep:safeNum(dailySleep.value)||null,note:dailyNote.value.trim()
  };
  state.checkins=state.checkins.filter(x=>x.date!==date);state.checkins.push(entry);state.checkins.sort((a,b)=>a.date.localeCompare(b.date));
  saveState();renderAll();toast("Gün kaydedildi");
};
dailyDate.onchange=renderDashboard;

addFood.onclick=()=>{
  const date=foodDate.value||todayISO(),name=foodName.value.trim();if(!name)return toast("Öğün adı yaz");
  state.foods[date]=state.foods[date]||[];state.foods[date].push({name,cal:safeNum(foodCal.value),p:safeNum(foodP.value),c:safeNum(foodC.value),f:safeNum(foodF.value)});
  [foodName,foodCal,foodP,foodC,foodF].forEach(x=>x.value="");saveState();renderAll();
};
foodDate.onchange=renderNutrition;
clearFoods.onclick=()=>{if(confirm("Bu tarihteki öğünleri temizleyelim mi?")){state.foods[foodDate.value||todayISO()]=[];saveState();renderAll()}};

saveWorkout.onclick=()=>{
  const rows=[...document.querySelectorAll(".exercise-row")],entries=rows.map(r=>({
    name:r.dataset.ex,weight:safeNum(r.querySelector(".ex-weight").value)||null,reps:r.querySelector(".ex-reps").value.trim(),
    sets:safeNum(r.querySelector(".ex-sets").value)||null
  }));
  state.workouts[`${todayISO()}|${selectedWorkout}`]={date:todayISO(),day:selectedWorkout,entries};
  saveState();renderAll();toast("Antrenman kaydedildi");
};

saveSettings.onclick=()=>{
  state.settings={
    startDate:startDate.value||todayISO(),height:safeNum(setHeight.value),startWeight:safeNum(setStartWeight.value),
    goalWeight:safeNum(setGoalWeight.value),calories:safeNum(setCalories.value),protein:safeNum(setProtein.value),
    carbs:safeNum(setCarbs.value),fat:safeNum(setFat.value),steps:safeNum(setSteps.value),water:safeNum(setWater.value)
  };
  saveState();renderAll();toast("Hedefler kaydedildi");
};
refreshCoach.onclick=()=>{renderCoach();toast("Analiz yenilendi")};

exportBtn.onclick=()=>{
  const rows=[["date","weight","waist","steps","water","sleep","note"],...state.checkins.map(x=>[x.date,x.weight??"",x.waist??"",x.steps??"",x.water??"",x.sleep??"",x.note??""])];
  const csv="\ufeff"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="AYTECH_Fitness_Gelisim.csv";a.click();
};

resetLocal.onclick=()=>{
  if(confirm("Bu cihazdaki tüm AYTECH Fitness kayıtları silinsin mi?")){
    const cloud={...state.cloud};state=clone(DEFAULT_STATE);state.cloud=cloud;saveState(false);renderAll();toast("Yerel veriler sıfırlandı");
  }
};

function cloudConfigFromUI(){
  state.cloud.url=supabaseUrl.value.trim().replace(/\/$/,"");state.cloud.key=supabaseKey.value.trim();state.cloud.email=cloudEmail.value.trim();
  saveState(false);
  if(!state.cloud.url||!state.cloud.key)throw new Error("Supabase URL ve anon key gerekli.");
}
cloudSignup.onclick=async()=>{
  try{
    cloudConfigFromUI();const password=cloudPassword.value;
    const r=await fetch(`${state.cloud.url}/auth/v1/signup`,{method:"POST",headers:{"Content-Type":"application/json","apikey":state.cloud.key},body:JSON.stringify({email:state.cloud.email,password})});
    const j=await r.json();if(!r.ok)throw new Error(j.msg||j.message||"Hesap oluşturulamadı");
    toast("Hesap oluşturuldu. E-posta doğrulaması açıksa mailini kontrol et.");
  }catch(e){toast(e.message,true)}
};
cloudLogin.onclick=async()=>{
  try{
    cloudConfigFromUI();const password=cloudPassword.value;
    const r=await fetch(`${state.cloud.url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json","apikey":state.cloud.key},body:JSON.stringify({email:state.cloud.email,password})});
    const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.msg||j.message||"Giriş başarısız");
    state.cloud.accessToken=j.access_token;state.cloud.userId=j.user?.id||"";saveState(false);renderSettings();toast("Buluta bağlandın");
  }catch(e){toast(e.message,true)}
};
cloudPush.onclick=()=>cloudPush(false);
async function cloudPush(silent=false){
  try{
    if(!state.cloud.url||!state.cloud.key||!state.cloud.accessToken||!state.cloud.userId){if(!silent)toast("Önce buluta giriş yap",true);return}
    const payload={user_id:state.cloud.userId,state:stripSecrets(state),updated_at:new Date().toISOString()};
    const r=await fetch(`${state.cloud.url}/rest/v1/fitness_state?on_conflict=user_id`,{
      method:"POST",headers:{"Content-Type":"application/json","apikey":state.cloud.key,"Authorization":`Bearer ${state.cloud.accessToken}`,"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload)
    });
    if(!r.ok){const t=await r.text();throw new Error(t||"Bulut kaydı başarısız")}
    if(!silent)toast("Bu cihazın verileri buluta gönderildi");
  }catch(e){if(!silent)toast(e.message,true)}
}
cloudPull.onclick=async()=>{
  try{
    cloudConfigFromUI();if(!state.cloud.accessToken||!state.cloud.userId)throw new Error("Önce giriş yap");
    const r=await fetch(`${state.cloud.url}/rest/v1/fitness_state?user_id=eq.${encodeURIComponent(state.cloud.userId)}&select=state,updated_at`,{
      headers:{"apikey":state.cloud.key,"Authorization":`Bearer ${state.cloud.accessToken}`}
    });
    const j=await r.json();if(!r.ok)throw new Error(j.message||"Bulut okunamadı");if(!j.length)throw new Error("Bulutta henüz kayıt yok");
    const keepCloud={...state.cloud};state=mergeState(clone(DEFAULT_STATE),j[0].state||{});state.cloud=keepCloud;saveState(false);renderAll();toast("Bulut verisi bu cihaza alındı");
  }catch(e){toast(e.message,true)}
};
function stripSecrets(s){
  const c=clone(s);c.cloud={url:c.cloud.url,email:c.cloud.email,key:"",accessToken:"",userId:""};return c;
}

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return escapeHtml(s)}
function toast(msg,bad=false){
  let t=document.getElementById("_toast");if(!t){t=document.createElement("div");t.id="_toast";Object.assign(t.style,{position:"fixed",right:"18px",bottom:"18px",zIndex:999,padding:"12px 14px",borderRadius:"12px",fontWeight:"800",fontSize:"12px",boxShadow:"0 15px 45px #000"});document.body.appendChild(t)}
  t.textContent=msg;t.style.background=bad?"#4a171c":"#eaf7ed";t.style.color=bad?"#ffd4d4":"#07100a";t.style.display="block";clearTimeout(t._x);t._x=setTimeout(()=>t.style.display="none",3200);
}

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;installBanner.classList.remove("hidden")});
installBtn.onclick=async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installBanner.classList.add("hidden")}};

if("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("./sw.js").catch(()=>{});
window.addEventListener("resize",()=>{if(document.getElementById("progress").classList.contains("active"))drawWeightChart()});

function init(){
  dailyDate.value=todayISO();foodDate.value=todayISO();renderQuickFoods();renderAll();
}
init();
