/*
  The interface only includes the info this extension needs.
  Chess.com's board API is available thanks to
  - https://everyonesdesign.ru/articles/chess-com-keyboard.html
  - https://github.com/everyonesdesign/Chess-Helper
 */

export interface WCChessBoard extends HTMLElement {
  game: {
    getFEN: () => string;
    markings: {
      getAll: () => MarkingOutput[];
      removeOne: (key: string) => boolean;
      toggleOne: (markingInput: MarkingInput) => string | boolean;
    };
    move: (moveInfo: {
      from: string;
      to: string;
      promotion: string | undefined;
    }) => void;
  };
}
export type KeyPressed = 'none' | 'ctrl' | 'shift' | 'alt';

interface MarkingInput {
  data: {
    from: string;
    to: string;
    keyPressed?: KeyPressed;
    opacity?: number;
  };
  type: string;
}

interface MarkingOutput {
  data: {
    from: string;
    to: string;
    keyPressed: KeyPressed;
    opacity: number;
  };
  type: string;
  node: boolean;
  persistent: boolean;
  key: string; // e.g. 'arrow|e2e4'
  id: string; // e.g. 'arrow|e2e4-(-1)|(0)'
}
