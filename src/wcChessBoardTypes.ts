/**
 * Chess.com's board API deduced.
 * Only includes info this extension needs.
 */
export interface WCChessBoard extends HTMLElement {
  game: {
    getFEN: () => string;
    markings: {
      addMany: (elems: ElemInput[]) => string[];
      addOne: (elem: ElemInput) => string;
      getAll: () => ElemOutput[];
      getAllWhere: (allWhereFilter: AllWhereFilter) => ElemOutput[];
      removeAllWhere: (allWhereFilter: AllWhereFilter) => boolean;
      removeOne: (key: string, obj?: { move: number; line: number }) => boolean;
      toggleOne: (elemInput: ElemInput) => string | boolean; // e.g. 'arrow|f3f5', 'highlight|h5', 'effect|d4'
    };
    move: (moveInfo: {
      from: string;
      to: string;
      promotion: string | undefined;
    }) => void;
  };
}
/**
 * - `arrow` - an arrow
 * - `highlight` - a highlighted square
 * - `effect` - icons (move classification (Book, Inaccuracy, Blunder. etc.), game endings (Winner, ResignWhite, TimeoutBlack, CheckmateWhite, etc.))
 */
type ElemType = 'arrow' | 'effect' | 'highlight';

export type KeyPressed = 'none' | 'ctrl' | 'shift' | 'alt';
type Node = boolean | { move: number; line: number };

export const ccTweaksTag = 'ccTweaks';
type Tag = typeof ccTweaksTag | 'analysis-markings' | 'ceeArrow' | 'ceeSquare';
type ElemInput = ArrowInput | HighlightInput | EffectInput;
type ElemOutput = ArrowOutput | HighlightOutput | EffectOutput;

interface ArrowInput {
  data: {
    from: string;
    to: string;
    color?: string;
    opacity?: number;
    keyPressed?: KeyPressed;
  };
  type: 'arrow';
  tags?: Tag[];
  node?: boolean;
  persistent?: boolean;
}

interface HighlightInput {
  square: string;
  color: string;
  opacity: number;
}

interface EffectInput {
  data: {
    square: string;
    type: string;
    size?: string; // '100%'
    animated?: boolean;
    persistent?: boolean;
  };
  tags?: Tag[];
  type: 'effect';
  node?: Node;
  persistent?: boolean;
}

interface ArrowOutput {
  data: {
    from: string;
    to: string;
    color?: string;
    opacity?: number;
    keyPressed?: KeyPressed;
  };
  tags?: Tag[];
  type: 'arrow';
  id: string;
  key: string;
  node?: boolean;
  persistent?: boolean;
}

interface HighlightOutput {
  data: {
    square: string;
    color: string;
    opacity: number;
  };
  tags?: Tag[];
  type: 'highlight';
  key: string;
  id: string;
}

interface EffectOutput {
  data: {
    square: string;
    type: string;
    size?: string;
    animated: boolean;
  };
  tags?: Tag[];
  type: 'effect';
  node: boolean;
  persistent: boolean;
  key: string;
  id: string;
}

interface AllWhereFilter {
  node?: boolean;
  persistent?: boolean;
  types?: ElemType[];
  tags?: Tag[];
}
