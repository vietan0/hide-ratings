/*
  The interface only includes the info this extension needs.
  Chess.com's board API is available thanks to
  - https://everyonesdesign.ru/articles/chess-com-keyboard.html
  - https://github.com/everyonesdesign/Chess-Helper
 */

export interface WCChessBoard extends HTMLElement {
  game: {
    move: (moveInfo: {
      from: string;
      to: string;
      promotion: string | undefined;
    }) => void;
  };
}
