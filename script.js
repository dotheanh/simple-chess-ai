var board,
    game = new Chess();

/*The "AI" part starts here */

var minimaxRoot =function(depth, game, isMaximisingPlayer) {

    var newGameMoves = game.ugly_moves();
    var bestMove = -9999;
    var bestMoveFound;

    for(var i = 0; i < newGameMoves.length; i++) {
        var newGameMove = newGameMoves[i]
        game.ugly_move(newGameMove);
        var value = minimax(depth - 1, game, -10000, 10000, !isMaximisingPlayer);
        game.undo();
        if(value >= bestMove) {
            bestMove = value;
            bestMoveFound = newGameMove;
        }
    }
    return bestMoveFound;
};

var minimax = function (depth, game, alpha, beta, isMaximisingPlayer) {
    positionCount++;
    if (depth === 0) {
        return -evaluateBoard(game.board());
    }

    var newGameMoves = game.ugly_moves();

    if (isMaximisingPlayer) {
        var bestMove = -9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            game.ugly_move(newGameMoves[i]);
            bestMove = Math.max(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer));
            game.undo();
            alpha = Math.max(alpha, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
        return bestMove;
    } else {
        var bestMove = 9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            game.ugly_move(newGameMoves[i]);
            bestMove = Math.min(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer));
            game.undo();
            beta = Math.min(beta, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
        return bestMove;
    }
};

var evaluateBoard = function (board) {
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(board[i][j], i ,j);
        }
    }
    return totalEvaluation;
};

var reverseArray = function(array) {
    return array.slice().reverse();
};

var pawnEvalWhite =
    [
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
        [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
        [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
        [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
        [0.5,  1.0, 1.0,  -2.0, -2.0,  1.0,  1.0,  0.5],
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

var pawnEvalBlack = reverseArray(pawnEvalWhite);

var knightEval =
    [
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
        [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
        [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0],
        [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
        [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0],
        [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
        [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0],
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
    ];

var bishopEvalWhite = [
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  1.0,  1.0,  0.5,  0.0, -1.0],
    [ -1.0,  0.5,  0.5,  1.0,  1.0,  0.5,  0.5, -1.0],
    [ -1.0,  0.0,  1.0,  1.0,  1.0,  1.0,  0.0, -1.0],
    [ -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0],
    [ -1.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.5, -1.0],
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];

var bishopEvalBlack = reverseArray(bishopEvalWhite);

var rookEvalWhite = [
    [  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
    [  0.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [  0.0,   0.0, 0.0,  0.5,  0.5,  0.0,  0.0,  0.0]
];

var rookEvalBlack = reverseArray(rookEvalWhite);

var evalQueen = [
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -0.5,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [  0.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [ -1.0,  0.5,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];

var kingEvalWhite = [

    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
    [ -1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [  2.0,  2.0,  0.0,  0.0,  0.0,  0.0,  2.0,  2.0 ],
    [  2.0,  3.0,  1.0,  0.0,  0.0,  1.0,  3.0,  2.0 ]
];

var kingEvalBlack = reverseArray(kingEvalWhite);




var getPieceValue = function (piece, x, y) {
    if (piece === null) {
        return 0;
    }
    var getAbsoluteValue = function (piece, isWhite, x ,y) {
        if (piece.type === 'p') {
            return 10 + ( isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x] );
        } else if (piece.type === 'r') {
            return 50 + ( isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x] );
        } else if (piece.type === 'n') {
            return 30 + knightEval[y][x];
        } else if (piece.type === 'b') {
            return 30 + ( isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x] );
        } else if (piece.type === 'q') {
            return 90 + evalQueen[y][x];
        } else if (piece.type === 'k') {
            return 900 + ( isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x] );
        }
        throw "Unknown piece type: " + piece.type;
    };

    var absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x ,y);
    return piece.color === 'w' ? absoluteValue : -absoluteValue;
};


/* board visualization and games state handling */

var onDragStart = function (source, piece, position, orientation) {
    if (game.in_checkmate() === true || game.in_draw() === true ||
        piece.search(/^b/) !== -1) {
        return false;
    }
};

// var makeBestMove = function () {
//     var bestMove = getBestMove(game);
//     console.log("aaaaaaaaaaaaaaaaa", bestMove);
//     game.ugly_move(bestMove);
//     board.position(game.fen());
//     renderMoveHistory(game.history());
//     if (game.game_over()) {
//         alert('Game over');
//     }
// };


var makeBestMove = async function () {
    var bestMove = await getBestMoveFromStockfish(game); // Wait for the best move asynchronously

    let uglyMove = convertToUglyMove(bestMove);
    let commentaries = generateCommentaries(game, uglyMove);
    renderCommentary(commentaries);
    let pretty_move = game.ugly_move(uglyMove);
    board.position(game.fen());
    renderMoveHistory(game.history());
    if (game.game_over()) {
        alert('Game over');
    }
};

function generateCommentaries(gameBeforeMove, uglyMove) {
    if (uglyMove === null || uglyMove === undefined) return [];
    console.log("Generating commentaries", uglyMove);
    // general comment
    let fromPos = algebraic(uglyMove.from);
    let toPos = algebraic(uglyMove.to);
    let side = uglyMove.color === 'w' ? 'White' : 'Black';
    let piece = getPieceName(uglyMove.piece);
    let commentaries = [side + " moves " + piece + " from " + fromPos + " to " + toPos];

    if (uglyMove.flags !== BITS.NORMAL) {
        if (uglyMove.flags === BITS.CAPTURE) {
            commentaries.push("Capture enemy's " + getPieceName(gameBeforeMove.get(toPos).type));
        }
        else if (uglyMove.flags === BITS.EP_CAPTURE) {
            commentaries.push("En passant Capture enemy's Pawn");
        }
        else if (uglyMove.flags === BITS.PROMOTION) {
            commentaries.push("Promoted the Pawn into a " + getPieceName(uglyMove.promotion));
        }
        else if (uglyMove.flags === BITS.KSIDE_CASTLE) {
            commentaries.push("It is King side castle!");
        }
        else if (uglyMove.flags === BITS.QSIDE_CASTLE) {
            commentaries.push("It is Queen side castle!");
        }

        // BIG_PAWN...
    }

    // chạy ra khỏi vị trí nguy hiểm
    // check commentaries
    // checkmate commentaries
    // support other pieces
    // chuẩn bị ăn unsupported
    // threatened
    // chuẩn bị cho các move tiếp theo

    return commentaries;
};

var positionCount;
var getBestMove = function (game) {
    if (game.game_over()) {
        alert('Game over');
    }

    positionCount = 0;
    var depth = parseInt($('#search-depth').find(':selected').text());

    var d = new Date().getTime();
    var bestMove = minimaxRoot(depth, game, true);
    var d2 = new Date().getTime();
    var moveTime = (d2 - d);
    var positionsPerS = ( positionCount * 1000 / moveTime);

    $('#position-count').text(positionCount);
    $('#time').text(moveTime/1000 + 's');
    $('#positions-per-s').text(positionsPerS);
    return bestMove;
};

var getBestMoveFromStockfish = async function (game) {
    if (game.game_over()) {
        alert('Game over');
        return null;
    }

    // Extract FEN position from the game
    let fenPosition = game.fen();
    let depth = parseInt($('#search-depth').find(':selected').text());  // Adjust depth as needed
    let d = new Date().getTime();

    // Define the URL of the Stockfish Online API
    let apiUrl = 'https://stockfish.online/api/s/v2.php';
    // Construct the URL with query parameters
    var apiUrlWithParams = apiUrl + '?fen=' + encodeURIComponent(fenPosition) + '&depth=' + depth;

    try {
        // Make the API call using fetch
        const response = await fetch(apiUrlWithParams);

        // Check if the response is successful
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        // Parse the JSON response
        const data = await response.json();
        
        positionCount = 0;
        let bestMove = data.bestmove;
        console.log('Best Move:', bestMove);
        let d2 = new Date().getTime();
        let moveTime = (d2 - d);
        let positionsPerS = ( positionCount * 1000 / moveTime);

        $('#position-count').text(positionCount);
        $('#time').text(moveTime/1000 + 's');
        $('#positions-per-s').text(positionsPerS);
        return bestMove;
    } catch (error) {
        // Handle errors
        console.error('There was a problem with the fetch operation:', error);
        return null;
    }
};



var renderMoveHistory = function (moves) {
    var historyElement = $('#move-history').empty();
    historyElement.empty();
    for (var i = 0; i < moves.length; i = i + 2) {
        historyElement.append('<span>' + moves[i] + ' ' + ( moves[i + 1] ? moves[i + 1] : ' ') + '</span><br>')
    }
    historyElement.scrollTop(historyElement[0].scrollHeight);

};

var renderCommentary = function (comments) {
    if (comments.length === 0) return;
    var commentaryElement = $('#move-commentary').empty();
    commentaryElement.empty();
    for (var i = 0; i < comments.length; i ++) {
        commentaryElement.append('<span>' + comments[i] + '</span><br>')
    }
    commentaryElement.scrollTop(commentaryElement[0].scrollHeight);

};

var onDrop = function (source, target) {
    let uglyMove = null;
    let tempMoveObj = {
        from: source,
        to: target,
        promotion: 'q'
    }
    
    let allMovesAtPos = game.ugly_moves({legal: true, square: tempMoveObj.from});

    /* convert the pretty move object to an ugly move object */
    for (var i = 0, len = allMovesAtPos.length; i < len; i++) {
        if (tempMoveObj.from === algebraic(allMovesAtPos[i].from) &&
            tempMoveObj.to === algebraic(allMovesAtPos[i].to) &&
            (!('promotion' in allMovesAtPos[i]) ||
            tempMoveObj.promotion === allMovesAtPos[i].promotion)) {
                uglyMove = allMovesAtPos[i];
            break;
        }
    }
    let commentaries = generateCommentaries(game, uglyMove);
    renderCommentary(commentaries);

    var move = game.move(tempMoveObj);

    removeGreySquares();
    if (move === null) {
        return 'snapback';
    }

    renderMoveHistory(game.history());
    window.setTimeout(async () => {
        await makeBestMove();
    }, 250);
};

var onSnapEnd = function () {
    board.position(game.fen());
};

var onMouseoverSquare = function(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    greySquare(square);

    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
};

var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function(square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
};
board = ChessBoard('board', cfg);

/*****************************************************************************
 * UTILITY FUNCTIONS
 ****************************************************************************/

let BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64
};

function rank(i) {
    return i >> 4;
}

function file(i) {
    return i & 15;
}

function algebraic(i){
    var f = file(i), r = rank(i);
    return 'abcdefgh'.substring(f,f+1) + '87654321'.substring(r,r+1);
}

function convertToUglyMove(stockfish_move) {
    // stockfish_move "bestmove d7d5 ponder b2b3"
    // output
    // {
    //     "color": "b",
    //     "from": 6,
    //     "to": 37,
    //     "flags": 1,
    //     "piece": "n"
    // }
    let pattern = /^bestmove (\S+)(?:\s+ponder\s+(\S+))?/;
    let match = stockfish_move.match(pattern);
    
    let bestMove = match[1];
    let ponder = match[2]; // This will be undefined if "ponder" is not present
    if (ponder !== undefined) {
    }

    let strFromPos = bestMove.substring(0, 2);
    let from = pos2Index(strFromPos);
    let to = pos2Index(bestMove.substring(bestMove.length - 2));
    let piece = getPieceAtCellIndex(game.fen(), convertPosition2CellIndex(strFromPos));

    /////////////////////////////////////////////////
    // replace the temp move with the valid generated move by chess.js
    let allMovesAtPos = game.ugly_moves({legal: true, square: strFromPos});
    let generatedMove = allMovesAtPos.find(move => move.from === from && move.to === to && move.piece === piece);
    /////////////////////////////////////////////////

    return generatedMove;
}

function pos2Index(position) {
    let SQUARES = {
        a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
        a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
        a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
        a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
        a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
        a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
        a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
        a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
    };

    return SQUARES[position];
}

function isUppercase(char) {
    return char === char.toUpperCase() && char !== char.toLowerCase();
}

function convertPosition2CellIndex(position) {
    var file = position.charAt(0);
    var rank = 8 - parseInt(position.charAt(1));
    var fileIndex = 'abcdefgh'.indexOf(file);
    var index = rank * 8 + fileIndex;

    return index;
}

function getPieceAtCellIndex(fen, cellIndex) {

    // Split the FEN string into its components
    var fenParts = fen.split(' ');

    // Extract the board layout part
    var boardLayout = fenParts[0];
    // chuẩn hóa fen
    boardLayout = convertToFenWithDashes(boardLayout).replaceAll("/", "");

    // Get the piece at the specified position
    var piece = boardLayout.charAt(cellIndex);

    return piece;
}

function convertToFenWithDashes(fen) {
    var fenParts = fen.split(' ');
    var boardLayout = fenParts[0];
    var convertedBoardLayout = '';

    for (var i = 0; i < boardLayout.length; i++) {
        var char = boardLayout.charAt(i);
        if ('12345678'.includes(char)) {
            // If it's a number, it represents empty squares
            var emptySquares = '-'.repeat(parseInt(char));
            convertedBoardLayout += emptySquares;
        } else if (char === '/') {
            // If it's a slash, it represents the end of a rank
            convertedBoardLayout += '/';
        } else {
            // Otherwise, it's a piece
            convertedBoardLayout += char;
        }
    }

    return convertedBoardLayout;
}

function getPieceName(pieceAbbreviation) {
    switch(pieceAbbreviation.toUpperCase()) {
        case 'K':
            return 'King';
        case 'Q':
            return 'Queen';
        case 'R':
            return 'Rook';
        case 'B':
            return 'Bishop';
        case 'N':
            return 'Knight';
        case 'P':
            return 'Pawn';
        default:
            return 'Unknown';
    }
}