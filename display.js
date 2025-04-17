let peer;
let conn;
let voteStatus = {};
let currentTopic = "";

function initDisplay() {
  const hostId = location.hash.slice(1);
  peer = new Peer();
  peer.on("open", id => {
    conn = peer.connect(hostId);
    conn.on("open", () => {
      conn.send({ type: "display-connect" });
    });
    conn.on("data", data => handleDisplayData(data));
  });
}

function handleDisplayData(data) {
  switch (data.type) {
    case "new-topic":
      currentTopic = data.topic;
      document.getElementById("current-topic").textContent = currentTopic;
      document.getElementById("meeting-info").textContent = `會議事由：${data.meetingInfo}`;
      updateVoteStatus(data.status);
      break;
    case "vote-status":
      updateVoteStatus(data.status);
      break;
  }
}

function updateVoteStatus(status) {
  voteStatus = status;
  const list = document.getElementById("vote-status-list");
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

  // 顯示統計數字
    const stats = document.getElementById("vote-stats");
    stats.innerHTML = `
    <strong>表決結果：</strong><br>　　
    出席：${totalCount}　
    <span class="agree">同意：</span><span class="agree">${agreeCount}</span>　
    <span class="disagree">反對：</span><span class="disagree">${disagreeCount}</span>　
    <span class="abstain">棄權：</span><span class="abstain">${abstainCount}</span>
    `;
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
    }
}

initDisplay();
