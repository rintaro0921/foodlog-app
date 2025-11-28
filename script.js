//--------------------------------------------------
// USER SYSTEM
//--------------------------------------------------

function getUsers(){
  return JSON.parse(localStorage.getItem("users") || "{}");
}

function saveUsers(data){
  localStorage.setItem("users", JSON.stringify(data));
}

function login(){
  const username = document.getElementById("login-user").value;
  const password = document.getElementById("login-pass").value;

  const users = getUsers();

  if(users[username] === password){
    localStorage.setItem("login", username);
    location.href = "main.html";
  } else {
    document.getElementById("login-msg").textContent = "ユーザー名またはパスワードが違います";
  }
}

function registerUser(){
  const username = document.getElementById("reg-user").value;
  const password = document.getElementById("reg-pass").value;

  if(!username || !password){
    return document.getElementById("reg-msg").textContent = "未入力があります";
  }

  const users = getUsers();
  if(users[username]){
    return document.getElementById("reg-msg").textContent = "そのユーザー名は既に存在しています";
  }

  users[username] = password;
  saveUsers(users);
  alert("登録完了！");
  location.href = "index.html";
}

function logout(){
  localStorage.removeItem("login");
  location.href = "index.html";
}


//--------------------------------------------------
// MAIN PAGE (only run on main.html)
//--------------------------------------------------

if(location.pathname.includes("main.html")){
  const uid = localStorage.getItem("login");

  if(!uid){
    alert("ログインが必要です");
    location.href = "index.html";
  }

  let data = JSON.parse(localStorage.getItem("food_" + uid) || "[]");

  function saveData(){
    localStorage.setItem("food_" + uid, JSON.stringify(data));
  }

  document.getElementById("addForm").onsubmit = e=>{
    e.preventDefault();
    data.push({
      id:crypto.randomUUID(),
      name:name.value,
      qty:qty.value,
      exp:exp.value,
      hidden:false,
      added:Date.now()
    });
    saveData();
    render();
  };

  function remain(d){
    return Math.ceil((new Date(d) - new Date()) / 86400000);
  }

  function hideItem(id){ data.find(x=>x.id===id).hidden=true; saveData(); render();}
  function unhide(id){ data.find(x=>x.id===id).hidden=false; saveData(); render();}
  function removeItem(id){ data=data.filter(x=>x.id!==id); saveData(); render(); }

  document.getElementById("sort").onchange = render;

  //--------------------------------------------------
  // RENDER TABLE
  //--------------------------------------------------
  function render(){
    const tbody=document.getElementById("table-body");
    tbody.innerHTML="";

    const method=document.getElementById("sort").value;
    if(method==="name") data.sort((a,b)=>a.name.localeCompare(b.name));
    if(method==="exp") data.sort((a,b)=>new Date(a.exp)-new Date(b.exp));
    if(method==="added") data.sort((a,b)=>a.added-b.added);

    document.getElementById("hidden-list").innerHTML="";

    data.forEach(item=>{
      if(item.hidden){
        document.getElementById("hidden-list").innerHTML+=
        `<li>${item.name} <button onclick="unhide('${item.id}')">戻す</button></li>`;
        return;
      }

      const diff = remain(item.exp);

      tbody.innerHTML+=`
        <tr class="${diff<0?'expired': diff<=3?'warning': diff<=7?'caution':''}">
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>${item.exp}</td>
          <td>${diff}日</td>
          <td>
            <button onclick="hideItem('${item.id}')">非表示</button>
            <button onclick="removeItem('${item.id}')">削除</button>
          </td>
        </tr>`;
    });

    updateCharts();
    // 消費履歴ログ
let consumptionLog = JSON.parse(localStorage.getItem("consumption_"+uid) || "[]");

function logConsumption(name) {
  const entry = { food: name, time: new Date().toISOString() };
  consumptionLog.push(entry);
  localStorage.setItem("consumption_"+uid, JSON.stringify(consumptionLog));
}

// 消費ボタンに記録処理を追加
function removeItem(id){
  const item = data.find(x=>x.id===id);
  if(!confirm(`${item.name} を消費しましたか？`)) return;
  logConsumption(item.name);
  data = data.filter(x=>x.id!==id);
  saveData();
  render();
}

function showUsage(){
  if(chart) chart.destroy();

  // 日付ごとの消費回数を集計
  const count = {};
  consumptionLog.forEach(l=>{
    const day = l.time.slice(0,10);
    count[day] = (count[day]||0)+1;
  });
  const labels = Object.keys(count).sort();
  const values = labels.map(d=>count[d]);

  chart = new Chart(document.getElementById("chart"), {
    type:'line',
    data:{ labels, datasets:[{ label:'日別消費回数', data:values, borderColor:'orange', fill:false }]},
    options:{ scales:{ y:{ beginAtZero:true, title:{ display:true, text:'回数' }}}}
  });
}

  }

  // -------------------- GRAPH ------------------

  let chart=null;

  function getVisible(){ return data.filter(x=>!x.hidden); }

  function draw(type, labels, values){
    if(chart) chart.destroy();
    chart=new Chart(document.getElementById("chart"),{
      type,
      data:{labels,datasets:[{label:"食品データ",data:values}]}
    });
  }

  function showPie(){ draw("pie", getVisible().map(x=>x.name), getVisible().map(x=>Number(x.qty))); }
  function showBar(){ draw("bar", getVisible().map(x=>x.name), getVisible().map(x=>Number(x.qty))); }
  function showLine(){ draw("line", getVisible().map(x=>x.name), getVisible().map(x=>remain(x.exp))); }

  window.showPie=showPie;
  window.showBar=showBar;
  window.showLine=showLine;

  render();
}
