let peer;
let connList = {};
let myId = "";
let myName = "";
let role = "";  // "host" 或 "guest"
let currentTopic = "";
let voteStatus = {};
let voteHistory = [];
let countdownTimer;

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

function generateQRCode(id) {
  const qrcode = new QRCode(document.getElementById("qrcode"), {
    text: `${location.href}#${id}`,
    width: 128,
    height: 128
  });
}

function init() {
  if (location.hash) {
    role = "guest"; // 設置角色為參與者
    document.getElementById("join-section").classList.remove("hidden");
  } else {
    role = "host"; // 設置角色為主持人
    peer = new Peer();
    peer.on("open", id => {
      myId = id;
      document.getElementById("host-controls").classList.remove("hidden");
      document.getElementById("voting-section").classList.remove("hidden");

      // 只有主持人不顯示投票按鈕
      if (role === "host") {
        document.querySelector(".vote-buttons").classList.add("hidden");
      }

      generateQRCode(id);
    });
    peer.on("connection", conn => {
      conn.on("data", data => handleData(conn.peer, data));
      conn.on("open", () => {
        connList[conn.peer] = conn;
      });
    });
  }
}

function join() {
  role = "guest"; // 設置角色為參與者

  const hostId = location.hash.slice(1);
  myName = document.getElementById("username").value.trim();
  if (!myName) return alert("請輸入姓名");

  peer = new Peer();
  peer.on("open", id => {
    myId = id;
    const conn = peer.connect(hostId);
    conn.on("open", () => {
      connList[hostId] = conn;
      conn.send({ type: "join", name: myName });
    });
    conn.on("data", data => handleData(hostId, data));
  });

  document.getElementById("join-section").classList.add("hidden");
  document.getElementById("voting-section").classList.remove("hidden");
}

function handleData(sender, data) {
  switch (data.type) {
    case "join":
      if (!voteStatus[data.name]) voteStatus[data.name] = null;
      broadcast({ type: "user-list", users: Object.keys(voteStatus) });
      updateUserList();
      break;
    case "user-list":
      voteStatus = {};
      data.users.forEach(name => voteStatus[name] = null);
      updateUserList();
      updateVoteStatus();
      break;
    case "new-topic":
      currentTopic = data.topic;
      document.getElementById("current-topic").textContent = currentTopic;

      // 顯示會議事由
      document.getElementById("meeting-info").textContent = `會議事由：${data.meetingInfo}`;

      voteStatus = {};
      data.users.forEach(name => voteStatus[name] = null);
      updateUserList();
      updateVoteStatus();
      startCountdown(data.duration);

      // 只有參與者顯示投票按鈕
      if (role === "guest") {
        document.querySelector(".vote-buttons").classList.remove("hidden");
      }
      break;
    case "vote":
      if (voteStatus[data.name] === null) {
        voteStatus[data.name] = data.vote;
        updateVoteStatus();
        broadcast({ type: "vote-status", status: voteStatus });
      }
      break;
    case "vote-status":
      voteStatus = data.status;
      updateVoteStatus();
      break;
  }
}

function sendVote(choice) {
  if (!myName || voteStatus[myName] !== null) return;
  voteStatus[myName] = choice;
  connList[Object.keys(connList)[0]].send({ type: "vote", name: myName, vote: choice });
  updateVoteStatus();
}

function broadcast(msg) {
  for (const id in connList) {
    connList[id].send(msg);
  }
}

function startTopic() {
  const topic = document.getElementById("topic").value.trim();  // 取得表決議題
  const meetingInfo = document.getElementById("meeting-info-input").value.trim(); // 取得會議事由
  const duration = parseInt(document.getElementById("duration").value.trim()); // 取得時限

  if (!topic || !duration || !meetingInfo) return alert("請填寫完整");

  currentTopic = topic;
  const users = Object.keys(voteStatus);
  voteStatus = {};
  users.forEach(name => voteStatus[name] = null);

  broadcast({ type: "new-topic", topic, duration, meetingInfo, users });

  document.getElementById("current-topic").textContent = currentTopic;
  document.getElementById("meeting-info").textContent = meetingInfo;

  updateUserList();
  updateVoteStatus();
  startCountdown(duration);

  // 只有主持人隱藏投票按鈕
  if (role === "host") {
    document.querySelector(".vote-buttons").classList.add("hidden");
  } else {
    document.querySelector(".vote-buttons").classList.remove("hidden");
  }
}

function updateUserList() {
  const list = document.getElementById("user-list");
  list.innerHTML = "";
  for (const name in voteStatus) {
    const li = document.createElement("li");
    li.textContent = name;
    list.appendChild(li);
  }
}

function updateVoteStatus() {
  const list = document.getElementById("vote-status");
  list.innerHTML = "";

  let agreeCount = 0;
  let disagreeCount = 0;
  let abstainCount = 0;
  let totalCount = 0;

  for (const name in voteStatus) {
    const li = document.createElement("li");
    li.textContent = name + "：" + (voteStatus[name] || "尚未投票");
    li.className = voteStatus[name] === "同意" ? "agree" :
                   voteStatus[name] === "反對" ? "disagree" :
                   voteStatus[name] === "棄權" ? "abstain" : "";
    list.appendChild(li);

    // 计数
    if (voteStatus[name] === "同意") agreeCount++;
    if (voteStatus[name] === "反對") disagreeCount++;
    if (voteStatus[name] === "棄權") abstainCount++;
    if (voteStatus[name] !== null) totalCount++;
  }

  // 顯示統計數字，並將整個「同意：」等字眼也加上對應顏色
  const stats = document.getElementById("vote-stats");
  stats.innerHTML = `
    <strong>表決結果：</strong><br>　　
    出席：${totalCount}　
    <span class="agree">同意：</span><span class="agree">${agreeCount}</span>　
    <span class="disagree">反對：</span><span class="disagree">${disagreeCount}</span>　
    <span class="abstain">棄權：</span><span class="abstain">${abstainCount}</span>
  `;
}

function startCountdown(seconds) {
  clearInterval(countdownTimer);
  const display = document.getElementById("countdown");
  let timeLeft = seconds;
  display.textContent = `剩餘時間：${timeLeft} 秒`;

  countdownTimer = setInterval(() => {
    timeLeft--;
    display.textContent = `剩餘時間：${timeLeft} 秒`;

    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      display.textContent = "投票結束";

      voteHistory.push({
        topic: currentTopic,
        result: { ...voteStatus },
        time: new Date().toLocaleString()
      });

      // 隱藏投票按鈕
      document.querySelector(".vote-buttons").classList.add("hidden");
    }
  }, 1000);
}

function exportHistory() {
  const content = voteHistory.map(v => {
    const votes = Object.entries(v.result).map(([name, vote]) => {
      const displayVote = vote === null ? "尚未投票" : vote;
      return `  ${name}：${displayVote}`;
    }).join("\n");

    // 計算統計數字
    let agreeCount = 0;
    let disagreeCount = 0;
    let abstainCount = 0;
    let totalCount = 0;

    for (const vote of Object.values(v.result)) {
      if (vote === "同意") agreeCount++;
      if (vote === "反對") disagreeCount++;
      if (vote === "棄權") abstainCount++;
      if (vote !== null) totalCount++;
    }

    return `【時間戳記】${v.time}\n【表決議題】${v.topic}\n【表決狀況】\n${votes}\n【表決結果】 出席：${totalCount}人　同意：${agreeCount}人　反對：${disagreeCount}人　棄權：${abstainCount}人\n`;
  }).join("\n\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vote_history.txt";
  a.click();
  URL.revokeObjectURL(url);
}

init();

function copyLink() {
  const link = `${location.href}#${myId}`;
  navigator.clipboard.writeText(link).then(() => {
    const status = document.getElementById("copy-status");
    status.textContent = "已複製！";
    setTimeout(() => {
      status.textContent = "";
    }, 2000); // 2 秒後自動清除訊息
  }).catch(err => {
    alert("複製失敗：" + err);
  });
}

function toggleQRCode() {
  const qr = document.getElementById("qrcode");
  const btn = document.getElementById("toggle-qrcode");
  const isHidden = qr.classList.contains("hidden");
  if (isHidden) {
    qr.classList.remove("hidden");
    btn.textContent = "隱藏 QR Code";
  } else {
    qr.classList.add("hidden");
    btn.textContent = "顯示 QR Code";
  }
}
