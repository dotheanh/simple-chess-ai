var board,
    game = new Chess();

const isUseAI = $('#checkbox-ai').prop('checked');
if (isUseAI) {
    window.setTimeout(async () => {
        let sugestion = await generateSuggestion(game);
        renderSuggestion(sugestion);
    }, 200);
}

$(document).ready(function() {
    $('#checkbox-cvc').change(function() {
        if ($(this).is(':checked')) {
            $('#checkbox-ai').prop('checked', true);
            $('#checkbox-ai').prop('disabled', true);

            window.setTimeout(async () => {
                await makeBestMove();
            }, 200);
        } else {
            $('#checkbox-ai').prop('disabled', false);
        }
    });
    $('#language').change(function() {
        window.setTimeout(async () => {
            let sugestion = await generateSuggestion(game);
            renderSuggestion(sugestion);
        }, 200);
    });
});

document.body.addEventListener('click', function(event) {
    if (event.target.classList.contains('comment-arrow')) {
        const arrowData = JSON.parse(event.target.getAttribute('data-info'));
        
        removeAllArrows();
        arrowData.forEach(arrowData => {
            renderArrow(arrowData);
        });
    }
});

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
    if (game.in_checkmate() === true || game.in_draw() === true) {
        return false;
    }
    
    const isUseAI = $('#checkbox-ai').prop('checked');
    const isComVSCom = $('#checkbox-cvc').prop('checked');
    
    // if using ComVSCom, block all drag and drop events for both color
    if (isComVSCom && ((piece.search(/^w/) !== -1) || (piece.search(/^b/) !== -1))) {
        return false;
    }

    // if using AI, block moving black pieces
    if (isUseAI && (piece.search(/^b/) !== -1)) {
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
    var bestMove = (await getBestMoveFromStockfish(game)).bestmove; // Wait for the best move asynchronously

    let uglyMove = convertToUglyMove(bestMove);
    let commentaries = generateCommentaries(game, uglyMove);
    renderCommentary(commentaries);
    game.ugly_move(uglyMove);
    board.position(game.fen());
    renderMoveHistory(game.history());

    if (game.game_over()) {
        return;
    }
    
    let sugestion = await generateSuggestion(game);
    renderSuggestion(sugestion);

    const isComVSCom = $('#checkbox-cvc').prop('checked');
    if (isComVSCom) {
        window.setTimeout(async () => {
            await makeBestMove();
        }, 200);
    }
};

async function generateSuggestion(game) {
    var suggestionStockfish = await getBestMoveFromStockfish(game);

    let uglyMove = convertToUglyMove(suggestionStockfish.bestmove);
    let suggestion = generateCommentaries(game, uglyMove);

    // Normalization Commentaries into suggestions
    suggestion.shift();
    suggestion.push("");
    suggestion.push(localize("Continuation") + ": " + suggestionStockfish.continuation);
    suggestion.push("");
    suggestion.push(generateEvaluationComment(suggestionStockfish.evaluation));


    return suggestion;
};

function generateCommentaries(gameBeforeMove, uglyMove) {
    if (uglyMove === null || uglyMove === undefined) return [];
    let prettyMove = gameBeforeMove.make_pretty(uglyMove);
    const lsAllOurAvaiableMovesBefore = gameBeforeMove.ugly_moves();
    const lsAllEnemyAvaiableMovesBefore = gameBeforeMove.enemy_ugly_moves();

    console.log("Generating commentaries", uglyMove, prettyMove);
    // general comment
    let fromPos = prettyMove.from;
    let toPos = prettyMove.to;
    let isWhite = uglyMove.color === 'w';
    let side = isWhite ? localize('White') : localize('Black');
    let piece = getPieceName(uglyMove.piece, uglyMove.color);
    let moveIndex = gameBeforeMove.get_move_number() * 2 - (isWhite ? 1 : 0);
    let commentaries = [moveIndex + ". [" + prettyMove.san + "]"];
    commentaries.push(`${side} ${localize('moves')} ${piece} ${localize('from')} ${fromPos} ${localize('to')} ${toPos}` + generateArrowData(fromPos, toPos, ARROW_COLOR.GREEN));
    
    // AVOID ATTACK
    let attackers = gameBeforeMove.get_cell_attackers(uglyMove.color, uglyMove.from);
    if (attackers.length > 0) {
        let lsStrAttackers = attackers.map((attacker) => getPieceName(attacker.type, attacker.color));
        lsStrAttackers = [...new Set(lsStrAttackers)]; // unique attackers
        let strArrow = "";
        attackers.forEach(attacker => {
            strArrow += generateArrowData(attacker.pos, prettyMove.from, ARROW_COLOR.RED);
        });
        commentaries.push(`- ${localize('Avoiding threat from enemy\'s')} ${arrayToSentence(lsStrAttackers)}` + strArrow);
    }

    if (prettyMove.flags !== FLAGS.NORMAL) {
        let flags = prettyMove.flags.split("");
        flags.forEach(flag => {
            if (flag === FLAGS.CAPTURE) {
                let piece = gameBeforeMove.get(toPos);
                commentaries.push(`- ${localize('Capture enemy\'s')} ${getPieceName(piece.type, piece.color)}`);
            }
            else if (flag === FLAGS.EP_CAPTURE) {
                commentaries.push(`- ${localize('En passant Capture enemy\'s')} ${localize('Pawn')}`);
            }
            else if (flag === FLAGS.PROMOTION) {
                commentaries.push(`- ${localize('Promoted the Pawn into a')} ${getPieceName(uglyMove.promotion, uglyMove.color)}`);
            }
            else if (flag === FLAGS.KSIDE_CASTLE) {
                commentaries.push(`- ${localize('King side castle')}`);
            }
            else if (flag === FLAGS.QSIDE_CASTLE) {
                commentaries.push(`- ${localize('Queen side castle')}`);
            }
        });

        // TODO: BIG_PAWN...
    }

    let gameAfterMove = Object.assign({}, gameBeforeMove);
    gameAfterMove.ugly_move(uglyMove);

    // get all the moves that this piece will be available to attack or support after this move
    let potentialMoves = gameAfterMove.get_potential_moves(uglyMove.to);
    let lsAttacking = [];
    let lsSupporting = [];
    let strArrowThreating = "";
    let strArrowSupport = "";

    // convert flags from BITS to FLAGS, and then classify the move 
    potentialMoves.forEach((move) => {
        const prettyMove = gameAfterMove.make_pretty(move, false);

        if (prettyMove.flags.includes(FLAGS.CAPTURE)) {
            let piece = gameAfterMove.get(prettyMove.to);
            let target = getPieceName(piece.type, piece.color) + " (" + prettyMove.to + ")";
            lsAttacking.push(target);
            strArrowThreating += generateArrowData(prettyMove.from, prettyMove.to, ARROW_COLOR.ORANGE);
        }
        if (prettyMove.flags.includes(FLAGS.SUPPORT)) {
            let piece = gameAfterMove.get(prettyMove.to);
            let target = getPieceName(piece.type, piece.color) + " (" + prettyMove.to + ")";
            lsSupporting.push(target);
            strArrowSupport += generateArrowData(prettyMove.from, prettyMove.to, ARROW_COLOR.BLUE);
        }
    });
    console.log("potentialMoves", potentialMoves);

    // ATTACKING / THREATENING
    if (lsAttacking.length > 0) {
        commentaries.push(`- ${localize('Threating enemy\'s')} ${arrayToSentence(lsAttacking)}` + strArrowThreating);
    }

    // SUPPORTING
    if (lsSupporting.length > 0) {
        commentaries.push(`- ${localize('Support allied')} ${arrayToSentence(lsSupporting)}` + strArrowSupport);
    }

    // ALLOW/PREPARE FOR NEW MOVES
    const lsAllOurAvaiableMovesAfter = gameAfterMove.enemy_ugly_moves();
    const lsStrNewGoodAvailableMoves = [];
    for (let i = 0; i < lsAllOurAvaiableMovesAfter.length; i++) {
        let move = lsAllOurAvaiableMovesAfter[i];
        // exclude all the moves starting from the end pos of current move, because we have talked about them above in the "potentialMoves" section
        if (move.from === uglyMove.to) {
            continue;
        }

        let isNewMove = !lsAllOurAvaiableMovesBefore.some(function(obj) {
            return compareObjects(obj, move);
        });
        if (isNewMove) {
            let prettyMove = gameAfterMove.make_pretty(move, false);
            if (prettyMove.flags.includes(FLAGS.CAPTURE)
            // || prettyMove.flags.includes(FLAGS.EP_CAPTURE) ////////////////////////////// TODO: TA (why EP_CAPTURE moves are here, when they are not available)
            || prettyMove.flags.includes(FLAGS.PROMOTION)
            || prettyMove.flags.includes(FLAGS.KSIDE_CASTLE)
            || prettyMove.flags.includes(FLAGS.QSIDE_CASTLE)) {
                lsStrNewGoodAvailableMoves.push(prettyMove.from + prettyMove.to);
            }
        }
    }
    if (lsStrNewGoodAvailableMoves.length > 0) {
        commentaries.push(`- ${localize('Allow us to do')} ${arrayToSentence(lsStrNewGoodAvailableMoves, localize("or"))}`);
    }

    // BLOCK ENEMY GOOD MOVES
    const lsAllEnemyAvaiableMovesAfter = gameAfterMove.ugly_moves();
    const lsStrBlockedGoodAvailableMoves = [];
    for (let i = 0; i < lsAllEnemyAvaiableMovesBefore.length; i++) {
        let move = lsAllEnemyAvaiableMovesBefore[i];
        if ((move.to === uglyMove.from) || (move.from === uglyMove.to)) { // exclude all these move comments because it's obvious
            continue;
        }
        let isBlockedMove = !lsAllEnemyAvaiableMovesAfter.some(function(obj) {
            return compareObjects(obj, move);
        });
        if (isBlockedMove) {
            let prettyMove = gameAfterMove.make_pretty(move, false);
            if (prettyMove.flags.includes(FLAGS.CAPTURE)
            // || prettyMove.flags.includes(FLAGS.EP_CAPTURE) ////////////////////////////// TODO: TA (why EP_CAPTURE moves are here, when they are not available)
            || prettyMove.flags.includes(FLAGS.PROMOTION)
            || prettyMove.flags.includes(FLAGS.KSIDE_CASTLE)
            || prettyMove.flags.includes(FLAGS.QSIDE_CASTLE)) {
                lsStrBlockedGoodAvailableMoves.push(prettyMove.from + prettyMove.to);
            }
        }
    }
    if (lsStrBlockedGoodAvailableMoves.length > 0) {
        commentaries.push(`- ${localize('Block enemy from doing')} ${arrayToSentence(lsStrBlockedGoodAvailableMoves, localize("or"))}`);
    }

    // TODO: protect king or queen
    // TODO: prepare to capture unsupported enemy pieces
    // TODO: prepare for the moves in continuation from stockfish


    // GAME OVER
    if (gameAfterMove.in_checkmate()) {
        commentaries.push(`${localize('Checkmate')}!!!`);
    }
    if (gameAfterMove.in_stalemate()) {
        commentaries.push(`${localize('The game has been stalemate')}...`);
    }
    
    if (gameAfterMove.game_over()) {
        commentaries.push(`${localize('GAME OVER')}`);
    }
    
    gameAfterMove.undo(); // although I have cloned the gameBeforeMove object, the method move still
    // affects the original object, so we need to revert it here

    return commentaries;
};

function generateEvaluationComment(evalScore) {
    evalScore = parseFloat(evalScore);
    if (isNaN(evalScore)) return "";

    let color = evalScore > 0 ? localize("White") : localize("Black");
    evalScore = Math.abs(evalScore);

    if (evalScore >= 7.0) {
        return `${localize(color)} ${localize("is absolutely dominating the game!")}`;
    } else if (evalScore >= 5.0) {
        return `${localize(color)} ${localize("is overwhelmingly ahead!")}`;
    } else if (evalScore >= 4.0) {
        return `${localize(color)} ${localize("has an enormous advantage!")}`;
    } else if (evalScore >= 3.0) {
        return `${localize(color)} ${localize("is greatly ahead!")}`;
    } else if (evalScore >= 2.0) {
        return `${localize(color)} ${localize("is dominating the game!")}`;
    } else if (evalScore >= 1.0) {
        return `${localize(color)} ${localize("is in a winning position!")}`;
    } else if (evalScore >= 0.5) {
        return `${localize(color)} ${localize("has a significant advantage.")}`;
    } else if (evalScore >= 0.2) {
        return `${localize(color)} ${localize("is slightly ahead.")}`;
    } else {
        return localize("The position is balanced.");
    }
}

function localize(key) {
    let currentLanguage = $('#language').find(':selected').val();
    let translations = {};

    // Load translations from JSON file
    $.ajax({
        url: "translations.json",
        async: false,
        dataType: 'json',
        success: function(data) {
            translations = data;
        },
        error: function(xhr, status, error) {
            console.error("Error loading translations:", error);
        }
    });

    if (translations[currentLanguage] && translations[currentLanguage][key]) {
        return translations[currentLanguage][key];
    } else {
        return key;
    }
}

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
        console.log('Best Move:', data);
        let d2 = new Date().getTime();
        let moveTime = (d2 - d);
        let positionsPerS = ( positionCount * 1000 / moveTime);

        $('#position-count').text(positionCount);
        $('#time').text(moveTime/1000 + 's');
        $('#positions-per-s').text(positionsPerS);
        return data;
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
    if (!comments || comments.length === 0) return;
    var commentaryElement = $('#move-commentary');
    for (var i = 0; i < comments.length; i ++) {
        commentaryElement.append('<span>' + comments[i] + '</span><br>')
    }
    commentaryElement.append('<br>')
    commentaryElement.scrollTop(commentaryElement[0].scrollHeight);

};

var renderSuggestion = function (comments) {
    if (!comments || comments.length === 0) return;

    var suggestionElement = $('#move-suggestion').empty();
    suggestionElement.empty();
    removeAllArrows();

    for (var i = 0; i < comments.length; i ++) {
        let parseData = parseArrowDataNRemove(comments[i]);
        comments[i] = parseData.remainingSentence;
        let arrowData = parseData.matches;
        arrowData.forEach(arrowData => {
            renderArrow(arrowData);
        });
        suggestionElement.append('<span class=' + (arrowData.length > 0 ? "comment-arrow" : "") + ' data-info=' + JSON.stringify(arrowData) + '>' + comments[i] + '</span><br>')
    }
    suggestionElement.scrollTop(suggestionElement[0].scrollHeight);
};

var parseArrowDataNRemove = function (sentence) {
    const regex = /(\S+)\s*{(\w+)\s*->\s*(\w+)}/g;
    let matches = [];
    let match;

    while ((match = regex.exec(sentence)) !== null) {
        const color = match[1];
        const from = match[2];
        const to = match[3];
        matches.push({
            from: from,
            to: to,
            color: color
        });

        // Remove the matched group from the sentence
        sentence = sentence.replace(match[0], '');
    }

    return { matches: matches, remainingSentence: sentence };
};

var renderArrow = function(arrow) {
    console.log(arrow)
    const startElement = document.querySelector(`.square-${arrow.from}`);
    const endElement = document.querySelector(`.square-${arrow.to}`);
    
    // Get positions of start and end elements relative to viewport
    const startPos = startElement.getBoundingClientRect();
    const endPos = endElement.getBoundingClientRect();
    let x1 = startPos.left + startPos.width / 2;
    let y1 = startPos.top + startPos.height / 2;
    let x2 = endPos.left + endPos.width / 2;
    let y2 = endPos.top + endPos.height / 2;

    // shorten length of the arrow line by 20px, which is the length of the arrow head
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const newDistance = distance - 20;
    const ratio = newDistance / distance;
    x2 = x1 + dx * ratio;
    y2 = y1 + dy * ratio;
    
    const arrowElements = document.querySelectorAll('.arrow-' + arrow.color);
    arrowElements.forEach(element => {
        if (element.classList.contains('d-none')) {
            const arrowLine = element.querySelector('line');
            arrowLine.setAttribute('x1', x1);
            arrowLine.setAttribute('y1', y1);
            arrowLine.setAttribute('x2', x2);
            arrowLine.setAttribute('y2', y2);

            element.classList.remove('d-none');
            return;
        }
    });
}

function removeAllArrows() {
    const arrowElements = document.querySelectorAll('.arrow');
    arrowElements.forEach(element => {
        if (!element.classList.contains('d-none')) {
            element.classList.add('d-none');
        }
    });
}

var onDrop = function (source, target) {
    removeAllArrows();
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

    const isUseAI = $('#checkbox-ai').prop('checked');
    if (isUseAI) {
        window.setTimeout(async () => {
            await makeBestMove();
        }, 200);
    }
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

$('#btn-restart').click(() => {
    board.start();
    game.reset();
    $('#move-commentary').empty();
    $('#move-suggestion').empty();
});

$('#btn-export-fen').click(() => {
    $('#fen-input').val(game.fen());
});

$('#btn-import-fen').click(() => {
    let strFen = $('#fen-input').val();
    if (strFen !== '') {
        game.load(strFen);
        board.position(game.fen());
        
        window.setTimeout(async () => {
            let sugestion = await generateSuggestion(game);
            renderSuggestion(sugestion);
        }, 200);
    } else {
        alert('Fen is empty');
    }
});

$('#btn-flip').click(() => {
    board.flip();
});

$('#btn-undo').click(() => {
    game.undo();
    game.undo();
    board.position(game.fen());
    window.setTimeout(async () => {
        let sugestion = await generateSuggestion(game);
        renderSuggestion(sugestion);
    }, 200);
});


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

let FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e', // en passant
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q',
    SUPPORT: 's',
};

let BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64,
    SUPPORT: 128,
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
    let to = pos2Index(bestMove.substring(2, 4));
    let promotion = bestMove.substring(4, 5);
    let piece = getPieceAtCellIndex(game.fen(), convertPosition2CellIndex(strFromPos));

    /////////////////////////////////////////////////
    // replace the temp move with the valid generated move by chess.js
    let allMovesAtPos = game.ugly_moves({legal: true, square: strFromPos});
    let generatedMove = allMovesAtPos.find(move => move.from === from && move.to === to && move.piece.toUpperCase() === piece.toUpperCase()
    && (!promotion || promotion.toLowerCase() === move.promotion));
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

function compareObjects(obj1, obj2) {
    var obj1String = JSON.stringify(obj1);
    var obj2String = JSON.stringify(obj2);
    return obj1String === obj2String;
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

function getPieceName(pieceAbbreviation, color) {
    if (color !== undefined) {
        let isWhite = color === 'w';
        switch(pieceAbbreviation.toUpperCase()) {
            case 'K':
                return `${localize('King')} <span class="chess-icon"> ${isWhite ? '♔' : '♚'}</span>`;
            case 'Q':
                return `${localize('Queen')} <span class="chess-icon"> ${isWhite ? '♕' : '♛'}</span>`;
            case 'R':
                return `${localize('Rook')} <span class="chess-icon"> ${isWhite ? '♖' : '♜'}</span>`;
            case 'B':
                return `${localize('Bishop')} <span class="chess-icon"> ${isWhite ? '♗' : '♝'}</span>`;
            case 'N':
                return `${localize('Knight')} <span class="chess-icon"> ${isWhite ? '♘' : '♞'}</span>`;
            case 'P':
                return `${localize('Pawn')} <span class="chess-icon"> ${isWhite ? '♙' : '♟'}</span>`;
            default:
                return localize('Unknown');
        }
    }

    switch(pieceAbbreviation.toUpperCase()) {
        case 'K':
            return localize('King');
        case 'Q':
            return localize('Queen');
        case 'R':
            return localize('Rook');
        case 'B':
            return localize('Bishop');
        case 'N':
            return localize('Knight');
        case 'P':
            return localize('Pawn');
        default:
            return localize('Unknown');
    }
}

function arrayToSentence(names, linkingWord) {
    if (linkingWord === undefined) linkingWord = localize("and");
    names = [...new Set(names)]; // unique names
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    
    // For two or more elements
    const last = names.pop(); // Remove the last element
    return names.join(", ") + " " + linkingWord + " " + last;
}

let ARROW_COLOR = {
    RED: "red",
    GREEN: "green",
    BLUE: "blue",
    ORANGE: "orange",
};

function generateArrowData(fromCell, toCell, color) {
    return " " + color + "{" + fromCell + "->" + toCell + "}";
}