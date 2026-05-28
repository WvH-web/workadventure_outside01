import { Chess } from "https://esm.sh/chess.js@1.0.0";

const STORAGE_KEY = "wvh-chess-tournament-v1";
const pieces = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

const els = {
  playerForm: document.querySelector("#playerForm"),
  playerName: document.querySelector("#playerName"),
  standings: document.querySelector("#standings"),
  roundNumber: document.querySelector("#roundNumber"),
  pairings: document.querySelector("#pairings"),
  startRound: document.querySelector("#startRound"),
  resetTournament: document.querySelector("#resetTournament"),
  exportPgn: document.querySelector("#exportPgn"),
  board: document.querySelector("#board"),
  boardRound: document.querySelector("#boardRound"),
  boardTitle: document.querySelector("#boardTitle"),
  gameStatus: document.querySelector("#gameStatus"),
  moveList: document.querySelector("#moveList"),
  flipBoard: document.querySelector("#flipBoard"),
  drawGame: document.querySelector("#drawGame"),
  whiteWins: document.querySelector("#whiteWins"),
  blackWins: document.querySelector("#blackWins")
};

let state = loadState();
let selectedPairingId = null;
let selectedSquare = null;
let boardFlipped = false;

render();

els.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.playerName.value.trim();
  if (!name) return;
  if (state.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    els.playerName.value = "";
    return;
  }
  state.players.push({ id: crypto.randomUUID(), name, active: true });
  els.playerName.value = "";
  saveAndRender();
});

els.startRound.addEventListener("click", () => {
  if (state.players.filter((player) => player.active).length < 2) return;
  if (currentRound().some((pairing) => !pairing.result)) return;
  state.round += 1;
  state.rounds.push({ round: state.round, pairings: createPairings() });
  selectedPairingId = state.rounds.at(-1).pairings.find((pairing) => pairing.blackId)?.id || null;
  saveAndRender();
});

els.resetTournament.addEventListener("click", () => {
  if (!confirm("Turnier wirklich zuruecksetzen?")) return;
  state = defaultState();
  selectedPairingId = null;
  selectedSquare = null;
  saveAndRender();
});

els.exportPgn.addEventListener("click", async () => {
  const text = state.rounds.flatMap((round) => round.pairings.map((pairing) => pairing.pgn).filter(Boolean)).join("\n\n");
  await navigator.clipboard.writeText(text || "Noch keine Partien.");
});

els.flipBoard.addEventListener("click", () => {
  boardFlipped = !boardFlipped;
  renderBoard();
});

els.drawGame.addEventListener("click", () => setManualResult("1/2-1/2"));
els.whiteWins.addEventListener("click", () => setManualResult("1-0"));
els.blackWins.addEventListener("click", () => setManualResult("0-1"));

function defaultState() {
  return { round: 0, players: [], rounds: [] };
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState();
  } catch {
    return defaultState();
  }
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function currentRound() {
  return state.rounds.at(-1)?.pairings || [];
}

function playerById(id) {
  return state.players.find((player) => player.id === id);
}

function scoreFor(playerId) {
  return state.rounds.reduce((score, round) => {
    for (const pairing of round.pairings) {
      if (pairing.whiteId !== playerId && pairing.blackId !== playerId) continue;
      if (pairing.result === "bye" && pairing.whiteId === playerId) score += 1;
      if (pairing.result === "1-0" && pairing.whiteId === playerId) score += 1;
      if (pairing.result === "0-1" && pairing.blackId === playerId) score += 1;
      if (pairing.result === "1/2-1/2") score += 0.5;
    }
    return score;
  }, 0);
}

function gamesFor(playerId) {
  return state.rounds.reduce((games, round) => {
    return games + round.pairings.filter((pairing) => pairing.blackId && (pairing.whiteId === playerId || pairing.blackId === playerId)).length;
  }, 0);
}

function hasPlayed(a, b) {
  return state.rounds.some((round) => round.pairings.some((pairing) => {
    return (pairing.whiteId === a && pairing.blackId === b) || (pairing.whiteId === b && pairing.blackId === a);
  }));
}

function createPairings() {
  const players = state.players
    .filter((player) => player.active)
    .sort((a, b) => scoreFor(b.id) - scoreFor(a.id) || gamesFor(a.id) - gamesFor(b.id) || a.name.localeCompare(b.name));
  const pairings = [];
  const waiting = [...players];

  if (waiting.length % 2 === 1) {
    const bye = [...waiting].reverse().find((player) => !state.rounds.some((round) => round.pairings.some((pairing) => pairing.result === "bye" && pairing.whiteId === player.id))) || waiting.at(-1);
    waiting.splice(waiting.findIndex((player) => player.id === bye.id), 1);
    pairings.push({ id: crypto.randomUUID(), whiteId: bye.id, blackId: null, result: "bye", fen: null, pgn: "" });
  }

  while (waiting.length) {
    const white = waiting.shift();
    let opponentIndex = waiting.findIndex((player) => !hasPlayed(white.id, player.id));
    if (opponentIndex === -1) opponentIndex = 0;
    const black = waiting.splice(opponentIndex, 1)[0];
    pairings.push({
      id: crypto.randomUUID(),
      whiteId: white.id,
      blackId: black.id,
      result: null,
      fen: new Chess().fen(),
      pgn: "",
      moves: []
    });
  }

  return pairings;
}

function render() {
  renderStandings();
  renderPairings();
  renderBoard();
}

function renderStandings() {
  const rows = [...state.players]
    .sort((a, b) => scoreFor(b.id) - scoreFor(a.id) || gamesFor(b.id) - gamesFor(a.id) || a.name.localeCompare(b.name));
  els.standings.innerHTML = rows.map((player, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(player.name)}</td>
      <td>${scoreFor(player.id)}</td>
      <td>${gamesFor(player.id)}</td>
      <td><button class="ghost" data-remove="${player.id}" type="button">X</button></td>
    </tr>
  `).join("");
  els.standings.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.players = state.players.filter((player) => player.id !== button.dataset.remove);
      saveAndRender();
    });
  });
}

function renderPairings() {
  els.roundNumber.textContent = String(state.round);
  const pairings = currentRound();
  if (!pairings.length) {
    els.pairings.innerHTML = '<div class="empty">Teilnehmer eintragen und die erste Runde starten.</div>';
    return;
  }
  els.pairings.innerHTML = pairings.map((pairing) => {
    const white = playerById(pairing.whiteId)?.name || "frei";
    const black = pairing.blackId ? playerById(pairing.blackId)?.name : "Freilos";
    const result = pairing.result || "offen";
    return `
      <article class="pairing">
        <div class="pairing-top">
          <div>
            <div class="pairing-title">${escapeHtml(white)} - ${escapeHtml(black)}</div>
            <div class="eyebrow">${result}</div>
          </div>
          ${pairing.blackId ? `<button data-open="${pairing.id}" type="button">Brett</button>` : ""}
        </div>
        ${pairing.blackId ? `
          <div class="pairing-actions">
            <button class="ghost" data-result="${pairing.id}:1-0" type="button">1-0</button>
            <button class="ghost" data-result="${pairing.id}:1/2-1/2" type="button">1/2</button>
            <button class="ghost" data-result="${pairing.id}:0-1" type="button">0-1</button>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");
  els.pairings.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPairingId = button.dataset.open;
      selectedSquare = null;
      renderBoard();
    });
  });
  els.pairings.querySelectorAll("[data-result]").forEach((button) => {
    button.addEventListener("click", () => {
      const [id, result] = button.dataset.result.split(":");
      setResult(id, result);
    });
  });
}

function activePairing() {
  return currentRound().find((pairing) => pairing.id === selectedPairingId) || currentRound().find((pairing) => pairing.blackId) || null;
}

function activeGame() {
  const pairing = activePairing();
  if (!pairing?.fen) return null;
  const game = new Chess();
  for (const move of pairing.moves || []) {
    game.move(move);
  }
  return game;
}

function renderBoard() {
  const pairing = activePairing();
  const game = activeGame();
  if (!pairing || !game) {
    els.boardTitle.textContent = "Brett";
    els.boardRound.textContent = "Keine Partie";
    els.gameStatus.textContent = "Bereit";
    els.board.innerHTML = "";
    els.moveList.innerHTML = "";
    return;
  }

  selectedPairingId = pairing.id;
  const white = playerById(pairing.whiteId)?.name || "Weiss";
  const black = playerById(pairing.blackId)?.name || "Schwarz";
  els.boardTitle.textContent = `${white} - ${black}`;
  els.boardRound.textContent = `Runde ${state.round}`;
  els.gameStatus.textContent = pairing.result || statusText(game);

  const board = game.board();
  const ranks = boardFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = boardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const legalTargets = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
  els.board.innerHTML = "";

  for (const rankIndex of ranks) {
    for (const fileIndex of files) {
      const file = "abcdefgh"[fileIndex];
      const rank = String(rankIndex + 1);
      const square = `${file}${rank}`;
      const piece = board[7 - rankIndex][fileIndex];
      const target = legalTargets.find((move) => move.to === square);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `square ${((fileIndex + rankIndex) % 2 ? "dark" : "light")}`;
      if (square === selectedSquare) button.classList.add("selected");
      if (target) button.classList.add("legal", target.captured ? "capture" : "");
      button.dataset.square = square;
      button.textContent = piece ? pieces[piece.color === "w" ? piece.type.toUpperCase() : piece.type] : "";
      button.addEventListener("click", onSquareClick);
      els.board.appendChild(button);
    }
  }

  els.moveList.innerHTML = game.history().map((move) => `<li>${escapeHtml(move)}</li>`).join("");
}

function onSquareClick(event) {
  const pairing = activePairing();
  const game = activeGame();
  if (!pairing || !game || pairing.result) return;
  const square = event.currentTarget.dataset.square;
  if (!selectedSquare) {
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) selectedSquare = square;
    renderBoard();
    return;
  }

  const move = game.move({ from: selectedSquare, to: square, promotion: "q" });
  if (move) {
    pairing.fen = game.fen();
    pairing.pgn = game.pgn();
    pairing.moves = game.history();
    pairing.result = gameResult(game);
    selectedSquare = null;
    saveAndRender();
    return;
  }

  selectedSquare = null;
  const piece = game.get(square);
  if (piece && piece.color === game.turn()) selectedSquare = square;
  renderBoard();
}

function gameResult(game) {
  if (game.isCheckmate()) return game.turn() === "w" ? "0-1" : "1-0";
  if (game.isDraw()) return "1/2-1/2";
  return null;
}

function statusText(game) {
  if (game.isCheckmate()) return "Matt";
  if (game.isDraw()) return "Remis";
  if (game.isCheck()) return `${game.turn() === "w" ? "Weiss" : "Schwarz"} im Schach`;
  return `${game.turn() === "w" ? "Weiss" : "Schwarz"} am Zug`;
}

function setManualResult(result) {
  const pairing = activePairing();
  if (!pairing) return;
  setResult(pairing.id, result);
}

function setResult(id, result) {
  const pairing = currentRound().find((item) => item.id === id);
  if (!pairing) return;
  pairing.result = result;
  saveAndRender();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
