let peer;
let connList = {};
let myId = "";
let myName = "";
let isHost = false;
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
    myId = "";
    isHost = false;
    document.getElementById("join-section").classList.remove("hidden");
  } else {
    isHost = true;
    peer = new Peer();
    peer.on("open", id => {
      myId = id;
      document.getElementById("host-controls").classList.remove("hidden");
      document.getElementById("voting-section").classList.remove("hidden");
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
      voteStatus = {};
      data.users.forEach(name => voteStatus[name] = null);
      document.getElementById("current-topic").textContent = currentTopic;
      updateUserList();
      updateVoteStatus();
      startCountdown(data.duration);
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
  const topic = document.getElementById("topic").value.trim();
  const duration = parseInt(document.getElementById("duration").value.trim());
  if (!topic || !duration) return alert("請填寫完整");
  currentTopic = topic;
  const users = Object.keys(voteStatus);
  voteStatus = {};
  users.forEach(name => voteStatus[name] = null);
  broadcast({ type: "new-topic", topic, duration, users });
  document.getElementById("current-topic").textContent = currentTopic;
  updateUserList();
  updateVoteStatus();
  startCountdown(duration);
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
  for (const name in voteStatus) {
    const li = document.createElement("li");
    li.textContent = name + "：" + (voteStatus[name] || "尚未投票");
    li.className = voteStatus[name] === "同意" ? "agree" :
                   voteStatus[name] === "反對" ? "disagree" :
                   voteStatus[name] === "棄權" ? "abstain" : "";
    list.appendChild(li);
  }
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
    }
  }, 1000);
}

function exportHistory() {
  const content = voteHistory.map(v => {
    const votes = Object.entries(v.result).map(([name, vote]) => {
      const displayVote = vote === null ? "尚未投票" : vote;
      return `  ${name}：${displayVote}`;
    }).join("\n");
    return `【${v.time}】${v.topic}\n${votes}`;
  }).join("\n\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vote_history.txt";
  a.click();
  URL.revokeObjectURL(url);
}
