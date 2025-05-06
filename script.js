const board = document.getElementById("board");
const turnDisplay = document.getElementById("turn");
const editStatus = document.getElementById("editModeStatus");
let currentTurn = "black";
const cells = [];
let moveHistory = [];
let editMode = false; // 色変更モード中かどうか
let passCount = 0;
let gameCount = 0;
let stopwatchStarted = false;
let stopwatchInterval = null;
let elapsedTime = 0;
let consecutivePasses = 0;

document.getElementById("ruleBtn").addEventListener("click", () => {
  const box = document.getElementById("ruleBox");
  box.style.display = box.style.display === "none" ? "block" : "none";
});

document.getElementById("closeRuleBtn").addEventListener("click", () => {
  document.getElementById("ruleBox").style.display = "none";
});

document.getElementById("toggleEditBtn").addEventListener("click", () => {
  editMode = !editMode;
  console.log(`色変更モード: ${editMode ? "ON" : "OFF"}`);
  document.getElementById("toggleEditBtn").textContent = editMode ? "色変更終了" : "色変更モード";
  editStatus.textContent = editMode ? "ON" : "OFF";
});

document.getElementById("passBtn").addEventListener("click", () => {
  consecutivePasses++; // 連続パスをカウント
  currentTurn = currentTurn === "black" ? "white" : "black";
  turnDisplay.textContent = currentTurn === "black" ? "黒の番です" : "白の番です";

  // 2回連続でパス → ゲーム終了
  if (consecutivePasses >= 2) {
    console.log("両者が連続でパスしたため、ゲーム終了");
    showResult(); // 終了処理を呼び出す関数（あとで説明）
    return;
  }

  // 白の番ならCPUに打たせる
  if (currentTurn === "white") {
    setTimeout(cpuMove, 300);
  }
});

document.getElementById("endBtn").addEventListener("click", () => {
  console.log("手動でゲームを終了します。");
  showResult();
});


document.getElementById("undoBtn").addEventListener("click", undoMove);

document.getElementById("restartBtn").addEventListener("click", resetGame);

function createBoard() {
  console.log("盤面作成開始");
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;
    cell.addEventListener("click", () => placeDisc(i));
    board.appendChild(cell);
    cells.push(null);
  }

  // 初期配置
  placeInitialDisc(27, "white");
  placeInitialDisc(28, "black");
  placeInitialDisc(35, "black");
  placeInitialDisc(36, "white");
  console.log("盤面初期配置完了");
  updateScore();
}

function placeInitialDisc(index, color) {
  const cell = board.children[index];
  const disc = document.createElement("div");
  disc.classList.add("disc", color);
  cell.appendChild(disc);
  cells[index] = color;
  console.log("石設置完了");
}

function updateScore() {
  let black = 0, white = 0;
  cells.forEach(cell => {
    if (cell === "black") black++;
    if (cell === "white") white++;
  });
  document.getElementById("blackCount").textContent = black;
  document.getElementById("whiteCount").textContent = white;
  console.log("スコア更新");
}

function isValidDirection(from, to, dir) {
  const fromRow = Math.floor(from / 8);
  const toRow = Math.floor(to / 8);
  const fromCol = from % 8;
  const toCol = to % 8;
  console.log("配置可能な方向を計算開始")

  if (dir === -1 || dir === 1) {
    // 横方向：行を跨いではいけない
    return fromRow === toRow;
  }
  if (dir === -9 || dir === -7 || dir === 7 || dir === 9) {
    // 斜め方向：縦横差が一致しているか
    return Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol);
  }
  return true; // 縦方向（-8, 8）は常にOK
}

function placeDisc(index) {
  if (!stopwatchStarted) {
    startStopwatch();
  }

  if (editMode) {
    if (!cells[index]) {
      console.log("空のセルは色変更できません。");
      return;
    }

    // 色を切り替える
    const currentColor = cells[index];
    const newColor = currentColor === "black" ? "white" : "black";
    cells[index] = newColor;
    board.children[index].querySelector(".disc").className = `disc ${newColor}`;

    console.log(`セル ${index} の色を ${currentColor} → ${newColor} に変更しました`);
    updateScore();
    return; // 通常の処理は実行しない
  }
  
  if (cells[index]) return;

  const directions = [-1, 1, -8, 8, -9, -7, 7, 9];
  let flipped = [];

  for (let dir of directions) {
    let i = index + dir;
    let temp = [];

    while (
      i >= 0 && i < 64 &&
      cells[i] &&
      cells[i] !== currentTurn &&
      isValidDirection(index, i, dir)
    ) {
      temp.push(i);
      i += dir;
    }

    if (
      i >= 0 && i < 64 &&
      cells[i] === currentTurn &&
      isValidDirection(index, i, dir)
    ) {
      flipped = flipped.concat(temp);
    }
  }

  if (flipped.length === 0) return;

  if (flipped.length === 0) return;

  consecutivePasses = 0; // 有効な手を打ったのでリセット

  // ⏪ ヒストリ記録
  moveHistory.push({
    index,
    flipped: [...flipped],
    prevTurn: currentTurn
  });

  const disc = document.createElement("div");
  disc.classList.add("disc", currentTurn);
  board.children[index].appendChild(disc);
  cells[index] = currentTurn;

  for (let i of flipped) {
    cells[i] = currentTurn;
    board.children[i].querySelector(".disc").className = `disc ${currentTurn}`;
  }

  currentTurn = currentTurn === "black" ? "white" : "black";
  turnDisplay.textContent = currentTurn === "black" ? "黒の番です" : "白の番です";

  updateScore();

  checkGameOver(); // ← ここでゲーム終了チェック！

  // 🧠 CPUターン（白）
  if (currentTurn === "white") {
    setTimeout(cpuMove, 300); // 少し間を空けて自然に見せる
    console.log("CPUターン")
  }
}

function undoMove() {
  if (moveHistory.length === 0) return;

  // CPUが打っていたら2手分戻す（白→黒）
  let last = moveHistory.pop();
  revertMove(last);

  if (last.prevTurn === "white" && moveHistory.length > 0) {
    let prev = moveHistory.pop();
    revertMove(prev);
  }

  currentTurn = "black";
  turnDisplay.textContent = "黒の番です";
  updateScore();
}


function getValidMoves(color) {
  const valid = [];
  for (let i = 0; i < 64; i++) {
    if (cells[i]) continue;
    const directions = [-1, 1, -8, 8, -9, -7, 7, 9];
    for (let dir of directions) {
      let j = i + dir;
      let temp = [];
      while (
        j >= 0 && j < 64 &&
        cells[j] &&
        cells[j] !== color &&
        isValidDirection(i, j, dir)
      ) {
        temp.push(j);
        j += dir;
      }
      if (
        j >= 0 && j < 64 &&
        cells[j] === color &&
        isValidDirection(i, j, dir) &&
        temp.length > 0
      ) {
        valid.push(i);
        break;
      }
    }
  }
  return valid;
}

function cpuMove() {
  const validMoves = getValidMoves("white");
  if (validMoves.length === 0) {
    // 自動パスして黒の番へ
    console.log("CPUパス処理")
    currentTurn = "black";
    turnDisplay.textContent = "黒の番です";
    return;
  }

  const choice = validMoves[Math.floor(Math.random() * validMoves.length)];
  setTimeout(() => placeDisc(choice), 300);
}


function checkGameOver() {
  console.log("ゲーム終了判定開始");

  // 盤面がすべて埋まっている、またはパスが2回連続
  const boardFull = cells.every(cell => cell !== null);
  const gameShouldEnd = boardFull || passCount >= 2;

  if (gameShouldEnd) {
    console.log("ゲーム終了条件を満たしました。結果を表示します。");
    setTimeout(showResult, 100); // 少し待って表示
    return true;
  }

  console.log("ゲームは継続されます。");
  return false;
}

function showResult() {
  let black = 0, white = 0;
  cells.forEach(cell => {
    if (cell === "black") black++;
    if (cell === "white") white++;
  });

  let result = "";
  if (black > white) {
    result = "黒の勝ち！🎉";
  } else if (white > black) {
    result = "白の勝ち！🎉";
  } else {
    result = "引き分け！🤝";
  }

  alert(`ゲーム終了！\n⚫ 黒: ${black}　⚪ 白: ${white}\n${result} リスタートボタンでもう一度始めからゲームができるよ！`);
  console.log(`最終結果: 黒 ${black} - 白 ${white} → ${result}`);
  stopStopwatch();
}

function resetGame() {
  console.log("ゲームリセット機能実行");
  // 盤面・配列・履歴リセット
  for (let i = 0; i < 64; i++) {
    cells[i] = null;
    board.children[i].innerHTML = "";
  }
  moveHistory = [];
  currentTurn = "black";
  passCount = 0;
  stopwatchStarted = false;
  consecutivePasses = 0;

  turnDisplay.textContent = "黒の番です";

  // 初期配置再設定
  placeInitialDisc(27, "white");
  placeInitialDisc(28, "black");
  placeInitialDisc(35, "black");
  placeInitialDisc(36, "white");

  updateScore();
}

function revertMove(move) {
  console.log("一手戻す機能開始");
  const { index, flipped, prevTurn } = move;
  cells[index] = null;
  board.children[index].innerHTML = "";

  for (let i of flipped) {
    const opponent = prevTurn === "black" ? "white" : "black";
    cells[i] = opponent;
    board.children[i].querySelector(".disc").className = `disc ${opponent}`;
  }
  console.log("一手戻す機能完了");
}

function startStopwatch() {
  clearInterval(stopwatchInterval);
  elapsedTime = 0;
  const display = document.getElementById("stopwatch");

  stopwatchInterval = setInterval(() => {
    elapsedTime += 100; // 100ms = 0.1秒
    display.textContent = (elapsedTime / 1000).toFixed(1);
  }, 100);
}

function stopStopwatch() {
  clearInterval(stopwatchInterval);
  console.log(`ゲーム終了までの時間: ${(elapsedTime / 1000).toFixed(1)} 秒`);
}

function startStopwatch() {
  if (stopwatchStarted) return;
  stopwatchStarted = true;
  clearInterval(stopwatchInterval);
  elapsedTime = 0;
  const display = document.getElementById("stopwatch");

  stopwatchInterval = setInterval(() => {
    elapsedTime += 100;
    display.textContent = (elapsedTime / 1000).toFixed(1);
  }, 100);
}

function stopStopwatch() {
  clearInterval(stopwatchInterval);
  console.log(`ゲーム終了までの時間: ${(elapsedTime / 1000).toFixed(1)} 秒`);
  recordTime();
  stopwatchStarted = false;
}

function recordTime() {
  gameCount++;
  const list = document.getElementById("historyList");
  const item = document.createElement("li");
  item.textContent = `#${gameCount}: ${(elapsedTime / 1000).toFixed(1)} 秒`;
  list.appendChild(item);
}

createBoard();

