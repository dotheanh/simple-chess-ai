
function reviewMove(game, uglyMove) {    
    let check_if_opening = game.get_move_number() < 11;

    let previous_review = null; // TODO: TA update read from previous_review
    let _a = review_move(game, uglyMove, previous_review, check_if_opening);
    let classification = _a.move_classication;
    let review = _a.review;
    let best_move = _a.best_move;
    let san_best_move = game.move_to_san(_a.best_move);
    let best_review;
    if (classification != 'book') {
        let _b = review_move(game, best_move, previous_review, check_if_opening);
        best_review = _b.review;
    } else {
        best_review = '';
    }

    return [review, best_review, classification, best_move, san_best_move];
}

/**
 * Review a move in the context of a chess game.
 * 
 * @param {Game} board - The current state of the chess board.
 * @param {uglyMove} move - The move to be reviewed.
 * @param {String} previous_review
 * @param {boolean} check_if_opening - A flag indicating whether to check if the move is part of an opening.
 */
function review_move(board, move, previous_review, check_if_opening) {
    let gameAfterMove = Object.assign({}, board);
    gameAfterMove.ugly_move(move);

    let review = '';
    let best_move = get_best_move(board);
    if (check_if_opening) {
        // TODO: TA Check if opening
        // var opening = search_opening(openings_df, get_board_pgn(gameAfterMove));
        // if (opening != null) {
        //     review = "This is a book move. The opening is called " + opening + ". ";
        //     return ['book', review, best_move, board.san(best_move)];
        // }
    }
    var move_classication = classify_move(board, move);
    if (move_classication == 'excellent' || move_classication == 'good') {
        if (move == best_move) {
            move_classication = "best";
        }
        review += board.san(move) + " is " + move_classication + ". ";
        var trade = false;
        if (is_possible_trade(board, move) && !move_is_discovered_check(board, move)) {
            if (board.is_capture(move)) {
                review += 'This is a trade. ';
            } else {
                review += 'This offers a trade. ';
            }
            trade = true;
        }
        var defended_pieces = move_defends_hanging_piece(board, move, true);
        var defended_squares = defended_pieces.map(function (s) { return chess.square_name(s); });
        defended_pieces = defended_pieces.map(function (s) { return piece_dict[String(board.piece_at(s)).toLowerCase()]; });
        if (defended_pieces.includes('King')) {
            var ki = defended_pieces.indexOf('King');
            defended_pieces.splice(ki, 1);
            defended_squares.splice(ki, 1);
        }
        if (defended_pieces.length > 0 && !trade) {
            review += "This defends a " + arrayToSentence(defended_pieces) + " on " + arrayToSentence(defended_squares) + ". ";
        }
        var possible_forked_squares = move_creates_fork(board, move, true);
        if (possible_forked_squares.length >= 2) {
            var forked_pieces = possible_forked_squares.map(function (s) { return piece_dict[String(board.piece_at(s)).toLowerCase()]; });
            review += "This creates a fork on " + arrayToSentence(forked_pieces) + ". ";
        } else {
            var possible_attakced_piece = move_attacks_piece(board, move, true);
            if (possible_attakced_piece != false) {
                review += "This attacks the " + piece_dict[String(possible_attakced_piece).toLowerCase()] + ". ";
            }
        }
        if (move_blocks_check(board, move)) {
            review += "This blocks a check to the king with a piece. ";
        }
        var developing = is_developing_move(board, move);
        if (developing != false) {
            review += "This develops a " + piece_dict[developing.toLowerCase()] + ". ";
        }
        if (is_fianchetto(board, move)) {
            review += 'This fianchettos the bishop by putting it on a powerful diagonal. ';
        }
        if (move_pins_opponent(board, move)) {
            review += 'This pins a piece of the opponent to their king. ';
        }
        if (moves_rook_to_open_file(board, move)) {
            review += "By placing the rook on an open file, it controls important columns. ";
        }
        if (is_endgame(board)) {
            if (move_moves_king_off_backrank(board, move)) {
                review += "By moving the king off the back rank, the risk of back rank mate threats is reduced and improve the king's safety. ";
            }
        }
        if (move_wins_tempo(board, move)) {
            review += 'This move gains a tempo. ';
        }
        if (!previous_review.includes('trade')) {
            if (move_captures_higher_piece(board, move)) {
                review += "This captures a higher value piece. ";
            }
            if (!previous_review.includes('higher value piece')) {
                if (move_captures_free_piece(board, move)) {
                    review += "This captures a free " + piece_dict[String(board.piece_at(move.to_square)).toLowerCase()] + ". ";
                }
            }
        }
        var attacked_squares_with_check = move_is_discovered_check_and_attacks(board, move, true);
        if (attacked_squares_with_check.length > 0) {
            var attacked_pieces_with_check = attacked_squares_with_check.map(function (s) { return board.piece_at(s); });
            attacked_pieces_with_check = attacked_pieces_with_check.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This creates a discovered check whilst attacking a " + arrayToSentence(attacked_pieces_with_check) + ". ";
        }
        var trapped_squares = move_traps_opponents_piece(board, move, true);
        if (trapped_squares.length > 0) {
            var trapped_pieces = trapped_squares.map(function (s) { return board.piece_at(s); });
            trapped_pieces = trapped_pieces.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This traps a " + arrayToSentence(trapped_pieces) + ". ";
        }
        if (is_possible_sacrifice(board, move)) {
            move_classication = 'brilliant';
            review = review.replace('best', 'brilliant');
            review = review.replace('good', 'brilliant');
            review = review.replace('excellent', 'brilliant');
            review += "This sacrifices the " + piece_dict[String(board.piece_at(move.from_square)).toLowerCase()] + ". ";
        }
        if (move_threatens_mate(board, move)) {
            review += 'This creates a checkmate threat. ';
        }
    } else if (move_classication == 'inaccuracy' || move_classication == 'mistake' || move_classication == 'blunder') {
        review += board.san(move) + " is " + move_classication + ". ";
        var possible_hanging_squares = [];
        if (!previous_review.includes('creates a fork') || !board.is_check() || !previous_review.includes('trade') || !previous_review.includes('lower value')) {
            possible_hanging_squares = move_hangs_piece(board, move, true);
            if (is_possible_trade(board, move)) {
                if (possible_hanging_squares.includes(move.to_square)) {
                    possible_hanging_squares.splice(possible_hanging_squares.indexOf(move.to_square), 1);
                }
            }
            possible_hanging_squares = possible_hanging_squares.filter(function (s) { return gameAfterMove.piece_at(s).color == board.turn; });
            if (possible_hanging_squares.length > 0) {
                var hanging_squares = possible_hanging_squares.map(function (s) { return chess.square_name(s); });
                var hanging_pieces = possible_hanging_squares.map(function (s) { return piece_dict[String(gameAfterMove.piece_at(s)).toLowerCase()]; });
                review += "This move leaves " + arrayToSentence(hanging_pieces) + " hanging on " + arrayToSentence(hanging_squares) + ". ";
            }
        }
        var capturable_pieces_by_lower = check_for_capturable_pieces_by_lower(gameAfterMove);
        capturable_pieces_by_lower = capturable_pieces_by_lower.filter(function (s) { return !possible_hanging_squares.includes(s); });
        if (capturable_pieces_by_lower.length > 0 && !gameAfterMove.is_check() && !is_possible_trade(board, move)) {
            capturable_pieces_by_lower = capturable_pieces_by_lower.map(function (s) { return piece_dict[String(gameAfterMove.piece_at(s)).toLowerCase()]; });
            review += "A " + arrayToSentence(capturable_pieces_by_lower) + " can be captured by a lower value piece. ";
        }
        var possible_forking_moves = move_allows_fork(board, move, true);
        if (get_best_move(gameAfterMove) in possible_forking_moves) {
            review += 'This move leaves pieces vulnerable to a fork. ';
        }
        var missed_forks = move_misses_fork(board, move, true);
        if (missed_forks.includes(get_best_move(gameAfterMove)) && move != get_best_move(gameAfterMove)) {
            review += "There was a missed fork with " + board.san(best_move) + ". ";
        }
        var missed_pins = move_misses_pin(board, move, true);
        if (missed_pins.includes(get_best_move(gameAfterMove)) && move != get_best_move(gameAfterMove)) {
            review += "There was a missed pin in the previous move with " + board.san(best_move) + ". ";
        }
        var missed_free_captures = move_misses_free_piece(board, move, true);
        if (missed_free_captures.length > 0) {
            if (missed_free_captures.includes(get_best_move(gameAfterMove)) && move != get_best_move(gameAfterMove)) {
                review += "An opportunity to take a " + piece_dict[String(board.piece_at(best_move.to_square)).toLowerCase()] + " was lost. ";
            }
        }
        var lets_opponent_play_move = get_best_move(gameAfterMove);
        if (move_threatens_mate(board, best_move)) {
            review += 'This misses an opportunity to create a checkmate threat. ';
        }
        var missed_attacked_piece = move_attacks_piece(board, best_move, true);
        if (missed_attacked_piece != false) {
            review += "A chance to attack a " + piece_dict[String(missed_attacked_piece).toLowerCase()] + " with " + board.san(best_move) + " was missed. ";
        }
        if (move_attacks_piece(gameAfterMove, lets_opponent_play_move)) {
            review += 'This permits the opponent to attack a piece. ';
        }
        var attacked_squares_with_check = move_is_discovered_check_and_attacks(gameAfterMove, lets_opponent_play_move, true);
        if (attacked_squares_with_check.length > 0) {
            var attacked_pieces_with_check = attacked_squares_with_check.map(function (s) { return gameAfterMove.piece_at(s); });
            attacked_pieces_with_check = attacked_pieces_with_check.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This lets the opponent win a " + arrayToSentence(attacked_pieces_with_check) + " from a discovered check. ";
        }
        var missed_attacked_squares_with_check = move_is_discovered_check_and_attacks(board, best_move, true);
        if (missed_attacked_squares_with_check.length > 0) {
            var missed_attacked_pieces_with_check = missed_attacked_squares_with_check.map(function (s) { return board.piece_at(s); });
            missed_attacked_pieces_with_check = missed_attacked_pieces_with_check.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This looses a chance to attack a " + arrayToSentence(missed_attacked_pieces_with_check) + " from a discovered check. ";
        }
        if (!(attacked_squares_with_check.length > 0)) {
            var trapped_squares = move_traps_opponents_piece(gameAfterMove, lets_opponent_play_move, true);
            if (trapped_squares.length > 0) {
                var trapped_pieces = trapped_squares.map(function (s) { return gameAfterMove.piece_at(s); });
                trapped_pieces = trapped_pieces.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
                review += "This allows a " + arrayToSentence(trapped_pieces) + " to be trapped. ";
            }
        }
        var missed_trapped_squares = move_traps_opponents_piece(board, best_move, true);
        if (missed_trapped_squares.length > 0) {
            var missed_trapped_pieces = missed_trapped_squares.map(function (s) { return board.piece_at(s); });
            missed_trapped_pieces = missed_trapped_pieces.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This looses a chance to trap a " + arrayToSentence(missed_trapped_pieces) + ". ";
        }
        if (move_wins_tempo(gameAfterMove, lets_opponent_play_move)) {
            review += "The opponent can win a tempo. ";
        }
        review += "The opponent can play " + gameAfterMove.san(lets_opponent_play_move) + ". ";
    } else if (move_classication.includes('continues gets mated')) {
        var losing_side = board.turn ? 'White' : 'Black';
        review += board.san(move) + " is good, but " + losing_side + " will still get checkmated. " + losing_side + " gets mated in " + move_classication.slice(-1) + ".";
        if (move == best_move) {
            move_classication = "best";
        } else {
            move_classication = 'good';
        }
    } else if (move_classication.includes('gets mated')) {
        var lets_opponent_play_move = get_best_move(gameAfterMove);
        var losing_side = board.turn ? 'White' : 'Black';
        review += "The opponent can play " + gameAfterMove.san(lets_opponent_play_move) + ". ";
        review += board.san(move) + " is a blunder and allows checkmate. " + losing_side + " gets mated in " + move_classication.slice(-1) + ".";
        move_classication = 'blunder';
    } else if (move_classication.includes('lost mate')) {
        var lets_opponent_play_move = get_best_move(gameAfterMove);
        review += "This loses the checkmate sequence. The opponent can play " + gameAfterMove.san(lets_opponent_play_move) + ". ";
        move_classication = 'blunder';
    } else if (move_classication.includes('mates')) {
        var n = previous_review.slice(-2);
        if (n.match(/^\d+$/)) {
            if (parseInt(move_classication.slice(-1)) <= parseInt(n)) {
                var winning_side = board.turn ? 'White' : 'Black';
                if (parseInt(move_classication.slice(-1)) == 0) {
                    review += "Checkmate!";
                } else {
                    review += board.san(move) + " continues the checkmate sequence. " + winning_side + " gets mated in " + move_classication.slice(-1) + ".";
                }
            } else {
                var winning_side = board.turn ? 'White' : 'Black';
                review += board.san(move) + " is good, but there was a faster way to checkmate. " + winning_side + " gets mated in " + move_classication.slice(-1) + ".";
                move_classication = 'good';
            }
            if (move == best_move) {
                move_classication = "best";
            }
        }
    }
    return {
        move_classication: move_classication,
        review: review,
        best_move: best_move
    };
}