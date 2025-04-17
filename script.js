let isHost = location.hash === "#host";
let peer = new Peer();
let connToHost = null;
let connections = [];
let userName = "";
let peerId = "";
let currentTopic = "";
let hasVoted = false;
let currentVotes = {};
let voteHistory = [];

function $(id) {
  return document.getElementById(id);
}

peer.on("open", id => {
  peerId = id;
  if (isHost) {
    $("host-controls").classList.remove("hidden");
    new QRCode("qrcode", location.href.replace("#host", `#${peerId}`));
  } else if (location.hash.length > 1) {
    $("join-section").classList.remove("hidden");
  }
});

peer.on("connection", conn => {
  if (isHost) {
    connections.push(conn);
    conn.on("data", data => {
      if (data.type === "join") {
        conn.userName = data.name;
        broadcastUserList();
      } else if (data.type === "vote") {
        currentVotes[conn.peer] = { name: conn.userName, vote: data.vote };
        broadcastVoteStatus();
      }
    });
  }
});

function join() {
  userName = $("username").value;
  if (!userName) return alert("請輸入姓名");
  const hostId = location.hash.substring(1);
  connToHost = peer.connect(hostId);
  connToHost.on("open", () => {
    connToHost.send({ type: "join", name: userName });
    $("join-section").classList.add("hidden");
    $("voting-section").classList.remove("hidden");
    updateUserList();
  });
  connToHost.on("data", data => {
    if (data.type === "topic") {
      currentTopic = data.topic;
      hasVoted = false;
      $("current-topic").textContent = `議題：${currentTopic}`;
      resetButtons();
      resetColors();
      if (data.duration > 0) {
        startCountdown(data.duration);
      } else {
        $("countdown").textContent = "";
      }
    } else if (data.type === "users") {
      renderUsers(data.users);
    } else if (data.type === "votes") {
      renderVotes(data.votes);
    }
  });
}

function startTopic() {
  const topic = $("topic").value;
  const duration = parseInt($("duration").value);
  if (!topic) return alert("請輸入議題");
  currentTopic = topic;
  currentVotes = {};
  broadcastAll({
    type: "topic",
    topic: topic,
    duration: duration || 0
  });
  voteHistory.push({ topic, votes: {}, timestamp: new Date().toLocaleString() });
  updateTopicDisplay(topic);
  resetColors();
  if (duration > 0) startCountdown(duration);
}

function sendVote(vote) {
  if (!currentTopic || hasVoted) return;
  connToHost.send({ type: "vote", vote });
  hasVoted = true;
  disableVoteButtons();
  highlightSelf(vote);
}

function broadcastAll(data) {
  connections.forEach(conn => conn.send(data));
}

function broadcastUserList() {
  const users = connections.map(c => ({ id: c.peer, name: c.userName }));
  broadcastAll({ type: "users", users });
  renderUsers(users);
}

function broadcastVoteStatus() {
  broadcastAll({ type: "votes", votes: currentVotes });
  renderVotes(currentVotes);

  // 記錄進歷史
  let last = voteHistory[voteHistory.length - 1];
  if (last) last.votes = JSON.parse(JSON.stringify(currentVotes));
}

function updateTopicDisplay(topic) {
  $("current-topic").textContent = `議題：${topic}`;
}

function renderUsers(users) {
  $("user-list").innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.name;
    li.id = `user-${u.id}`;
    li.className = "user-name";
    $("user-list").appendChild(li);
  });
}

function renderVotes(votes) {
  $("vote-status").innerHTML = "";
  for (const peerId in votes) {
    const { name, vote } = votes[peerId];
    const li = document.createElement("li");
    li.textContent = `${name}：${vote}`;
    $("vote-status").appendChild(li);

    const nameEl = $(`user-${peerId}`);
    if (nameEl) {
      nameEl.classList.remove("agree", "disagree", "abstain");
      if (vote === "同意") nameEl.classList.add("agree");
      else if (vote === "反對") nameEl.classList.add("disagree");
      else if (vote === "棄權") nameEl.classList.add("abstain");
    }
  }
}

function highlightSelf(vote) {
  const nameEl = $(`user-${peerId}`);
  if (!nameEl) return;
  nameEl.classList.remove("agree", "disagree", "abstain");
  if (vote === "同意") nameEl.classList.add("agree");
  else if (vote === "反對") nameEl.classList.add("disagree");
  else if (vote === "棄權") nameEl.classList.add("abstain");
}

function disableVoteButtons() {
  document.querySelectorAll(".vote-btn").forEach(btn => btn.disabled = true);
}

function resetButtons() {
  document.querySelectorAll(".vote-btn").forEach(btn => btn.disabled = false);
}

function resetColors() {
  document.querySelectorAll(".user-name").forEach(el => {
    el.classList.remove("agree", "disagree", "abstain");
  });
}

function startCountdown(duration) {
  let remaining = duration;
  $("countdown").textContent = `剩餘 ${remaining} 秒`;
  const timer = setInterval(() => {
    remaining--;
    $("countdown").textContent = `剩餘 ${remaining} 秒`;
    if (remaining <= 0) {
      clearInterval(timer);
      $("countdown").textContent = "投票結束";
    }
  }, 1000);
}

function exportHistory() {
  let content = "所有表決記錄\n====================\n\n";
  voteHistory.forEach(item => {
    content += `議題：${item.topic}\n時間：${item.timestamp}\n------------------------\n`;
    for (const id in item.votes) {
      const { name, vote } = item.votes[id];
      content += `${name}：${vote}\n`;
    }
    content += "------------------------\n\n";
  });

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vote_history.txt";
  a.click();
}

// 時鐘顯示
setInterval(() => {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString();
}, 1000);
