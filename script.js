const board = document.getElementById("board");
const turnDisplay = document.getElementById("turn");
let currentTurn = "black";
const cells = [];
let moveHistory = [];

document.getElementById("passBtn").addEventListener("click", () => {
  currentTurn = currentTurn === "black" ? "white" : "black";
  turnDisplay.textContent = currentTurn === "black" ? "黒の番です" : "白の番です";
});

document.getElementById("undoBtn").addEventListener("click", undoMove);

document.getElementById("restartBtn").addEventListener("click", resetGame);

function createBoard() {
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

  updateScore();
}

function placeInitialDisc(index, color) {
  const cell = board.children[index];
  const disc = document.createElement("div");
  disc.classList.add("disc", color);
  cell.appendChild(disc);
  cells[index] = color;
}

function updateScore() {
  let black = 0, white = 0;
  cells.forEach(cell => {
    if (cell === "black") black++;
    if (cell === "white") white++;
  });
  document.getElementById("blackCount").textContent = black;
  document.getElementById("whiteCount").textContent = white;
}

function isValidDirection(from, to, dir) {
  const fromRow = Math.floor(from / 8);
  const toRow = Math.floor(to / 8);
  const fromCol = from % 8;
  const toCol = to % 8;

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
    currentTurn = "black";
    turnDisplay.textContent = "黒の番です";
    return;
  }

  const choice = validMoves[Math.floor(Math.random() * validMoves.length)];
  setTimeout(() => placeDisc(choice), 300);
}


function checkGameOver() {
  if (cells.every(cell => cell !== null)) {
    setTimeout(() => {
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

      alert(`ゲーム終了！\n⚫ 黒: ${black}　⚪ 白: ${white}\n${result}`);
    }, 100); // ← 少し待ってから表示（描画タイミング確保）
  }
}


function resetGame() {
  // 盤面・配列・履歴リセット
  for (let i = 0; i < 64; i++) {
    cells[i] = null;
    board.children[i].innerHTML = "";
  }
  moveHistory = [];
  currentTurn = "black";
  turnDisplay.textContent = "黒の番です";

  // 初期配置再設定
  placeInitialDisc(27, "white");
  placeInitialDisc(28, "black");
  placeInitialDisc(35, "black");
  placeInitialDisc(36, "white");

  updateScore();
}

function revertMove(move) {
  const { index, flipped, prevTurn } = move;
  cells[index] = null;
  board.children[index].innerHTML = "";

  for (let i of flipped) {
    const opponent = prevTurn === "black" ? "white" : "black";
    cells[i] = opponent;
    board.children[i].querySelector(".disc").className = `disc ${opponent}`;
  }
}

createBoard();

