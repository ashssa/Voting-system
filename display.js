let peer;
let conn;
let voteStatus = {};
let currentTopic = "";
let countdownTimer = null;

// 從 URL 取得 hostId
function getHostIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("hostId");
}

function connectToHost(hostId) {
  peer = new Peer();

  peer.on("open", id => {
    // 在這裡加入 metadata: "display"
    conn = peer.connect(hostId, { metadata: "display" });

    conn.on("open", () => {
      console.log("已連接至主持人");
    });

    conn.on("data", data => {
      handleData(data);
    });
  });
}

function handleData(data) {
  switch (data.type) {
    case "new-topic":
      currentTopic = data.topic;
      document.getElementById("current-topic").textContent = `議題：${currentTopic}`;
      document.getElementById("meeting-info").textContent = `會議事由：${data.meetingInfo}`;

      voteStatus = {};
      data.users.forEach(name => voteStatus[name] = null);
      updateVoteStatus();
      updateVoteStats();
      startCountdown(data.duration);
      break;

    case "vote-status":
      voteStatus = data.status;
      updateVoteStatus();
      updateVoteStats();
      break;

    case "user-list":
      voteStatus = {};
      data.users.forEach(name => voteStatus[name] = null);
      updateVoteStatus();
      updateVoteStats();
      break;
  }
}

function updateVoteStatus() {
  const list = document.getElementById("vote-status");
  list.innerHTML = "";
/*
  let agreeCount = 0;
  let disagreeCount = 0;
  let abstainCount = 0;
  let totalCount = 0;
*/
  for (const name in voteStatus) {
    const li = document.createElement("li");
    li.textContent = `${name}：${voteStatus[name] || "尚未投票"}`;
    li.className = voteStatus[name] === "同意" ? "agree" :
                   voteStatus[name] === "反對" ? "disagree" :
                   voteStatus[name] === "棄權" ? "abstain" : "";
    list.appendChild(li);
  }
}

function updateVoteStats() {
  let agree = 0, disagree = 0, abstain = 0, total = 0;

  for (const name in voteStatus) {
    const vote = voteStatus[name];
    if (vote === "同意") agree++;
    if (vote === "反對") disagree++;
    if (vote === "棄權") abstain++;
    if (vote !== null) total++;
  }

  const stats = document.getElementById("vote-stats");
  stats.innerHTML = `
    出席：${total}　
    <span class="agree">同意：</span><span class="agree">${agree}</span>　
    <span class="disagree">反對：</span><span class="disagree">${disagree}</span>　
    <span class="abstain">棄權：</span><span class="abstain">${abstain}</span>
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
    }
  }, 1000);
}

// 支援從 postMessage 傳來的資料
window.addEventListener("message", (event) => {
  if (event.origin !== location.origin) return; // 保險：只接受同源資料
  const data = event.data;
  handleData(data); // 用同樣的資料處理函數
});

// 初始化
const hostId = getHostIdFromUrl();
if (hostId) {
  connectToHost(hostId);
} else {
  alert("無法取得主持人 ID，請確認網址是否正確");
}
