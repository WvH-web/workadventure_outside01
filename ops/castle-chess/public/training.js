import {Chess} from './vendor/chess/chess.mjs';

export const puzzles=Object.freeze([
  {id:'back-rank',name:'Die letzte Reihe',fen:'6k1/5ppp/8/8/8/8/6PP/4R1K1 w - - 0 1'},
  {id:'queen-team',name:'Dame und König',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1'},
  {id:'black-rook',name:'Schwarz am Zug',fen:'4r1k1/6pp/8/8/8/8/5PPP/6K1 b - - 0 1'},
]);
export function puzzleById(id){return puzzles.find(puzzle=>puzzle.id===id)||puzzles[0];}
export function mateMoves(fen){
  const game=new Chess(fen);return game.moves({verbose:true}).filter(move=>{
    game.move(move);const mate=game.isCheckmate();game.undo();return mate;
  }).map(move=>({from:move.from,to:move.to,promotion:move.promotion||null}));
}
