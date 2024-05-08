const chess = require('chess.js');
const stockfish = require('stockfish');
const fs = require('fs');
const readline = require('readline');

const engine = stockfish();

const STOCKFISH_CONFIG = { time: 0.25 };

const openings_df = fs.readFileSync('openings_master.csv', 'utf8');
// only 2 openings have more than 12 moves

function search_opening(dataframe, pgn) {
    // Check if the search_string is in column 'A'
    const mask = dataframe['pgn'] === pgn;

    // If there is a match, return the corresponding value in column 'B'
    if (mask.some(Boolean)) {
        return dataframe[mask]['name'][0];
    } else {
        return null;
    }
}

function is_defended(board, square, by_color = null, return_list_of_defenders = false) {
    const piece = board.piece_at(square);

    let defenders;
    if (by_color === null) {
        defenders = board.attackers(piece.color, square);
    } else {
        defenders = board.attackers(by_color, square);
    }

    if (return_list_of_defenders) {
        return defenders;
    }

    if (defenders.length > 0) {
        return true;
    }

    return false;
}

function check_for_hanging_pieces(board, return_list_of_hanging = false, fr_format = false) {
    const hanging_pieces = [];
    const hanging_pieces_and_attackers = {};

    for (let square = 0; square < 64; square++) {
        const maybe_hanging_piece = board.piece_at(square);

        if (maybe_hanging_piece !== null) {
            if (!is_defended(board, square)) {
                const attackers = board.attackers(!maybe_hanging_piece.color, square);
                if (attackers.length > 0) {
                    if (fr_format) {
                        hanging_pieces_and_attackers[chess.square_name(square)] = attackers.map(s => chess.square_name(s));
                        hanging_pieces.push(chess.square_name(square));
                    } else {
                        hanging_pieces_and_attackers[square] = attackers;
                        hanging_pieces.push(square);
                    }
                }
            }
        }
    }

    if (return_list_of_hanging) {
        return hanging_pieces;
    } else {
        return hanging_pieces_and_attackers;
    }
}

function is_hanging(board, square, capturable_by = null, return_list_of_attackers = false) {
    const maybe_hanging_piece = board.piece_at(square);

    if (capturable_by === null) {
        const square_is_defended = is_defended(board, square);

        if (!square_is_defended) {
            const attackers = board.attackers(!maybe_hanging_piece.color, square);
            if (attackers.length > 0) {
                if (return_list_of_attackers) {
                    return attackers;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        }
    } else {
        const square_is_defended = is_defended(board, square, !capturable_by);

        if (!square_is_defended) {
            const attackers = board.attackers(capturable_by, square);

            if (attackers.length > 0) {
                if (return_list_of_attackers) {
                    return attackers;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        }
    }

    return false;
}

function move_hangs_piece(board, move, return_hanging_squares = false) {
    const position_after_move = board.copy();
    position_after_move.push(move);

    const hanging_before = check_for_hanging_pieces(board, true);
    const hanging_after = check_for_hanging_pieces(position_after_move, true);

    if (return_hanging_squares) {
        return hanging_after;
    } else {
        if (hanging_before.length === hanging_after.length) {
            return false;
        } else {
            return true;
        }
    }
}

function move_defends_hanging_piece(board, move, return_list_defended = false) {
    if (board.is_castling(move)) {
        if (return_list_defended) {
            return [];
        }
        return false;
    }

    const position_after_move = board.copy();
    position_after_move.push(move);

    const defended_squares = [];
    for (const defended_square of position_after_move.attacks(move.to_square)) {
        const defended_piece = position_after_move.piece_at(defended_square);
        if (defended_piece !== null && defended_piece.color === board.turn) {
            if (!is_defended(board, defended_square, board.turn)) {
                defended_squares.push(defended_square);
            }
        }
    }

    if (return_list_defended) {
        return defended_squares;
    }

    if (defended_squares.length > 0) {
        return true;
    } else {
        return false;
    }
}

function move_creates_fork(board, move, return_forked_squares = false) {
    const position_after_move = board.copy();
    position_after_move.push(move);

    return is_forking(position_after_move, move.to_square, return_forked_squares);
}

function move_allows_fork(board, move, return_forking_moves = false) {
    const forking_moves = [];

    const position_after_move = board.copy();
    position_after_move.push(move);

    for (const maybe_forking_move of position_after_move.legal_moves) {
        if (move_creates_fork(position_after_move, maybe_forking_move)) {
            forking_moves.push(maybe_forking_move);
        }
    }

    if (return_forking_moves) {
        return forking_moves;
    }

    if (forking_moves.length === 0) {
        return false;
    } else {
        return true;
    }
}

function move_misses_fork(board, move, return_forking_moves = false) {
    const forking_moves = [];

    for (const maybe_fork_move of board.legal_moves) {
        if (move_creates_fork(board, maybe_fork_move)) {
            forking_moves.push(maybe_fork_move);
        }
    }

    if (return_forking_moves) {
        return forking_moves;
    }

    if (forking_moves.includes(move)) {
        return false;
    } else {
        return true;
    }
}

function is_forking(board, square, return_forked_squares = false) {
    const forked_squares = [];

    const square_can_be_captured_by = !board.piece_at(square).color;

    if (board.attackers(square_can_be_captured_by, square).length > 0) {
        if (!is_defended(board, square, !square_can_be_captured_by)) {
            if (return_forked_squares) {
                return [];
            }
            return false;
        }
    }

    const attacks = board.attacks(square);
    for (const attacked_square of attacks) {
        const attacked_piece = board.piece_at(attacked_square);
        if (attacked_piece !== null && attacked_piece.color !== board.piece_at(square).color) {
            if (!is_defended(board, attacked_square)) {
                forked_squares.push(attacked_square);
            } else {
                if (board.piece_type_at(attacked_square) > board.piece_type_at(square)) {
                    forked_squares.push(attacked_square);
                } else if (board.piece_type_at(attacked_square) < board.piece_type_at(square)) {
                    if (attacked_piece.toString().toLowerCase() === 'k') {
                        forked_squares.push(attacked_square);
                    }
                }
            }
        }
    }

    if (return_forked_squares) {
        return forked_squares;
    } else {
        if (forked_squares.length >= 2) {
            return true;
        } else {
            return false;
        }
    }
}

function move_blocks_check(board, move) {
    if (board.is_check() && !board.is_capture(move)) {
        const king_square = board.king(board.turn);
        const position_after_move = board.copy();
        position_after_move.push(move);

        if (position_after_move.piece_at(king_square).toString().toLowerCase() === 'k') {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function evaluate(board, return_mate_n = false) {
    const info = engine.analyse(board.fen(), STOCKFISH_CONFIG);

    const possible_mate_score = info.score.relative.toString();
    if (possible_mate_score.includes('#')) {
        const n = Math.abs(parseInt(possible_mate_score.replace('#', '')));

        if (possible_mate_score.includes('+')) {
            if (board.turn) {
                if (return_mate_n) {
                    return [10000, n];
                } else {
                    return 10000;
                }
            } else {
                if (return_mate_n) {
                    return [-10000, n];
                } else {
                    return -10000;
                }
            }
        } else {
            if (board.turn) {
                if (return_mate_n) {
                    return [-10000, n];
                } else {
                    return -10000;
                }
            } else {
                if (return_mate_n) {
                    return [10000, n];
                } else {
                    return 10000;
                }
            }
        }
    }

    let score;
    if (board.turn) {
        score = info.score.relative.score();
    } else {
        score = -info.score.relative.score();
    }

    if (return_mate_n) {
        return [score, null];
    } else {
        return score;
    }
}

function has_mate_in_n(board) {
    const info = engine.analyse(board.fen(), STOCKFISH_CONFIG);

    if (info.score.relative.toString().includes('#')) {
        return true;
    } else {
        return false;
    }
}

function calculate_points_gained_by_move(board, move, kwargs) {
    const previous_score = evaluate(board);

    const position_after_move = board.copy();
    position_after_move.push(move);

    const current_score = evaluate(position_after_move);

    if (board.turn) {
        if (previous_score !== 10000 && current_score === 10000) {
            return `mates ${kwargs.n}`;
        } else if (previous_score === 10000 && current_score === 10000) {
            return `mates ${kwargs.n}`;
        } else if (previous_score === -10000 && current_score === -10000) {
            return `continues gets mated ${kwargs.n}`;
        } else if (previous_score !== -10000 && current_score === -10000) {
            return `gets mated ${kwargs.n}`;
        } else if (previous_score === 10000 && current_score !== 10000) {
            return 'lost mate';
        }

        const points_gained = current_score - previous_score;
    } else {
        if (previous_score !== -10000 && current_score === -10000) {
            return `mates ${kwargs.n}`;
        } else if (previous_score === -10000 && current_score === -10000) {
            return `mates ${kwargs.n}`;
        } else if (previous_score === 10000 && current_score === 10000) {
            return `continues gets mated ${kwargs.n}`;
        } else if (previous_score !== 10000 && current_score === 10000) {
            return `gets mated ${kwargs.n}`;
        } else if (previous_score === -10000 && current_score !== -10000) {
            return 'lost mate';
        }

        const points_gained = previous_score - current_score;
    }

    return points_gained;
}

function classify_move(board, move) {
    const points_gained = calculate_points_gained_by_move(board, move);

    if (typeof points_gained === 'string') {
        if (points_gained.includes('mates')) {
            return points_gained;
        } else if (points_gained.includes('continues gets mated')) {
            return points_gained;
        } else if (points_gained.includes('gets mated')) {
            return points_gained;
        } else if (points_gained.includes('lost mate')) {
            return points_gained;
        }
    }

    if (points_gained >= -20) {
        return 'excellent';
    } else if (points_gained < -20 && points_gained >= -100) {
        return 'good';
    } else if (points_gained < -100 && points_gained >= -250) {
        return 'inaccuracy';
    } else if (points_gained < -250 && points_gained >= -450) {
        return 'mistake';
    } else {
        return 'blunder';
    }
}

function is_developing_move(board, move) {
    if ([chess.B1, chess.G1, chess.B8, chess.G8].includes(move.from_square)) {
        if (board.piece_at(move.from_square).toString().toLowerCase() === 'n') {
            return 'N';
        } else {
            return false;
        }
    } else if ([chess.C1, chess.F1, chess.C8, chess.F8].includes(move.from_square)) {
        if (board.piece_at(move.from_square).toString().toLowerCase() === 'b') {
            return 'B';
        } else {
            return false;
        }
    } else if ([chess.C1, chess.F1, chess.C8, chess.F8].includes(move.from_square)) {
        if (board.piece_at(move.from_square).toString().toLowerCase() === 'q') {
            return 'Q';
        } else {
            return false;
        }
    } else if ([chess.H1, chess.A1, chess.H8, chess.A8].includes(move.from_square)) {
        if (board.piece_at(move.from_square).toString().toLowerCase() === 'r') {
            return 'R';
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function is_fianchetto(board, move) {
    if (board.piece_at(move.from_square).toString().toLowerCase() === 'b') {
        if ([chess.C1, chess.F1, chess.C8, chess.F8].includes(move.from_square)) {
            if ([chess.B2, chess.G2, chess.B7, chess.G7].includes(move.to_square)) {
                return true;
            }
        }
    }
    return false;
}

function is_possible_trade(board, move) {
    if (board.is_capture(move)) {
        if (is_defended(board, move.to_square, !board.turn)) {
            if (board.piece_type_at(move.to_square) === board.piece_type_at(move.from_square)) {
                return true;
            } else if (board.piece_type_at(move.to_square) === 2 && board.piece_type_at(move.from_square) === 3) {
                return true;
            } else if (board.piece_type_at(move.to_square) === 3 && board.piece_type_at(move.from_square) === 2) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        const attackers = board.attackers(!board.turn, move.to_square);
        if (attackers.length > 0) {
            for (const attacking_square of attackers) {
                if (is_defended(board, move.to_square, board.turn)) {
                    if (board.piece_type_at(attacking_square) === board.piece_type_at(move.from_square)) {
                        if (!board.is_pinned(!board.turn, attacking_square)) {
                            return true;
                        }
                    } else if (board.piece_type_at(attacking_square) === 2 && board.piece_type_at(move.from_square) === 3) {
                        return true;
                    } else if (board.piece_type_at(attacking_square) === 3 && board.piece_type_at(move.from_square) === 2) {
                        return true;
                    }
                } else {
                    return true;
                }
            }
        }

        return false;
    }
}

function move_is_discovered_check(board, move) {
    const position_after_move = board.copy();
    position_after_move.push(move);

    if (position_after_move.is_check()) {
        for (const attacked_square of position_after_move.attacks(move.to_square)) {
            if (position_after_move.piece_at(attacked_square).toString().toLowerCase() === 'k') {
                return false;
            }
        }
        return true;
    }

    return false;
}


function move_is_discovered_check_and_attacks(board, move, return_attacked_squares=false) {
    if (!move_is_discovered_check(board, move)) {
        if (return_attacked_squares) {
            return [];
        }
        return false;
    }
    let position_after_move = board.copy();
    position_after_move.push(move);
    let attacked_squares = [];
    for (let attacked_square of position_after_move.attacks(move.to_square)) {
        if (position_after_move.piece_at(attacked_square) !== null) {
            if (is_hanging(position_after_move, attacked_square, capturable_by=board.turn)) {
                attacked_squares.push(attacked_square);
            } else if (position_after_move.piece_type_at(attacked_square) > position_after_move.piece_type_at(move.to_square)) {
                attacked_squares.push(attacked_square);
            }
        }
    }
    if (return_attacked_squares) {
        return attacked_squares;
    }
    if (attacked_squares.length > 0) {
        return true;
    } else {
        return false;
    }
}

function is_trapped(board, square, by) {
    if (String(board.piece_at(square)).toLowerCase() === 'k') {
        return false;
    }
    let attackers = board.attackers(by, square);
    let capturable_by_lower = false;
    for (let attacking_square of attackers) {
        if (board.piece_at(attacking_square).color !== board.piece_at(square).color) {
            if (board.piece_type_at(attacking_square) < board.piece_type_at(square)) {
                capturable_by_lower = true;
            }
        }
    }
    if (!capturable_by_lower) {
        return false;
    }
    let can_be_saved = true;
    let movable_squares = board.attacks(square);
    for (let move_to_square of movable_squares) {
        if (board.piece_at(move_to_square) === null) {
            let defending_squares = board.attackers(by, move_to_square);
            if (defending_squares.length === 0) {
                can_be_saved = true;
                return false;
            }
            for (let defending_square of defending_squares) {
                if (board.piece_at(defending_square).color !== board.piece_at(square).color) {
                    if (board.piece_type_at(defending_square) < board.piece_type_at(square)) {
                        if (!board.is_pinned(by, defending_square)) {
                            can_be_saved = false;
                        } else {
                            can_be_saved = true;
                        }
                    } else if (board.piece_type_at(defending_square) === board.piece_type_at(square)) {
                        if (!board.is_pinned(by, defending_square)) {
                            defenders = is_defended(board, defending_square, by_color=!by, return_list_of_defenders=true);
                            if (defenders.length <= 1) {
                                can_be_saved = false;
                            }
                        }
                    } else {
                        can_be_saved = true;
                    }
                }
            }
        } else if (board.piece_at(move_to_square).color !== board.piece_at(square).color && board.piece_type_at(move_to_square) <= board.piece_type_at(square)) {
            let defending_squares = board.attackers(by, move_to_square);
            if (defending_squares.length === 0) {
                can_be_saved = true;
                return false;
            }
            for (let defending_square of defending_squares) {
                if (board.piece_at(defending_square).color !== board.piece_at(square).color) {
                    if (board.piece_type_at(defending_square) < board.piece_type_at(square)) {
                        if (!board.is_pinned(by, defending_square)) {
                            can_be_saved = false;
                        } else {
                            can_be_saved = true;
                        }
                    } else if (board.piece_type_at(defending_square) === board.piece_type_at(square)) {
                        if (!board.is_pinned(by, defending_square)) {
                            defenders = is_defended(board, defending_square, by_color=!by, return_list_of_defenders=true);
                            if (defenders.length <= 1) {
                                can_be_saved = false;
                            }
                        }
                    } else {
                        can_be_saved = true;
                    }
                }
            }
        }
    }
    if (!can_be_saved) {
        return true;
    } else {
        return false;
    }
}

function move_traps_opponents_piece(board, move, return_trapped_squares=false) {
    let position_after_move = board.copy();
    position_after_move.push(move);
    let trapped_squares = [];
    for (let attacked_square of position_after_move.attacks(move.to_square)) {
        if (position_after_move.piece_at(attacked_square) !== null) {
            if (position_after_move.piece_at(attacked_square).color !== position_after_move.piece_at(move.to_square)) {
                if (is_trapped(position_after_move, attacked_square, by=board.turn)) {
                    trapped_squares.push(attacked_square);
                }
            }
        }
    }
    if (return_trapped_squares) {
        return trapped_squares;
    }
    if (trapped_squares.length > 0) {
        return true;
    } else {
        return false;
    }
}

function is_possible_sacrifice(board, move) {
    if (String(board.piece_at(move.from_square)).toLowerCase() === 'p') {
        return false;
    }
    if (board.is_capture(move)) {
        defending_squares = is_defended(board, move.to_square, by_color=!board.turn, return_list_of_defenders=true);
        if (defending_squares.length > 0) {
            if (board.piece_type_at(move.to_square) < board.piece_type_at(move.from_square)) {
                if (board.piece_type_at(move.to_square) !== 2 || board.piece_type_at(move.from_square) !== 3) {
                    for (let defending_square of defending_squares) {
                        if (board.piece_type_at(defending_square) < board.piece_type_at(move.from_square)) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        attackers = Array.from(board.attackers(!board.turn, move.to_square));
        if (attackers.length > 0) {
            for (let attacking_square of attackers) {
                if (is_defended(board, move.to_square, by_color=board.turn)) {
                    if (board.piece_type_at(attacking_square) < board.piece_type_at(move.from_square)) {
                        if (board.piece_type_at(attacking_square) !== 2 || board.piece_type_at(move.from_square) !== 3) {
                            if (!board.is_pinned(!board.turn, attacking_square)) {
                                return true;
                            }
                        }
                    }
                } else {
                    return true;
                }
            }
        }
        return false;
    }
}

function move_pins_opponent(board, move, return_pinned_square=false) {
    if (board.is_attacked_by(!board.turn, move.to_square)) {
        if (!is_defended(board, move.to_square, by_color=board.turn)) {
            return false;
        }
    }
    let position_after_move = board.copy();
    position_after_move.push(move);
    let pinned_square = null;
    let possible_pinned_squares = Array.from(position_after_move.attacks(move.to_square));
    for (let square of possible_pinned_squares) {
        if (position_after_move.piece_at(square) !== null && position_after_move.piece_at(square).color === position_after_move.turn) {
            if (position_after_move.is_pinned(position_after_move.turn, square)) {
                pinned_square = square;
                break;
            } else {
                pinned_square = null;
            }
        }
    }
    if (return_pinned_square) {
        return pinned_square;
    }
    if (pinned_square !== null) {
        return true;
    } else {
        return false;
    }
}

function board_has_pin(board, return_pin_moves=false) {
    let pin_moves = [];
    for (let move of board.legal_moves) {
        if (move_pins_opponent(board, move)) {
            pin_moves.push(move);
        }
    }
    if (return_pin_moves) {
        return pin_moves;
    }
    if (pin_moves.length > 0) {
        return true;
    } else {
        return false;
    }
}

function move_misses_pin(board, move, return_pin_move=false) {
    let pin_moves = board_has_pin(board, return_pin_moves=true);
    if (return_pin_move) {
        return pin_moves;
    }
    if (pin_moves.length === 0) {
        return false;
    } else {
        if (pin_moves.includes(move)) {
            return false;
        } else {
            return true;
        }
    }
}

function move_misses_mate(board, move) {
    if (has_mate_in_n(board)) {
        let position_after_move = board.copy();
        position_after_move.push(move);
        if (has_mate_in_n(position_after_move)) {
            return false;
        } else {
            return true;
        }
    }
}

function moves_rook_to_open_file(board, move) {
    let from_square_reqs = Array.from(Array(16).keys()).concat(Array.from(Array(16).keys()).map(x => x + 48));
    if (String(board.piece_at(move.from_square)).toLowerCase() === 'r') {
        if (from_square_reqs.includes(move.from_square)) {
            if (Math.abs(move.from_square - move.to_square) < 8) {
                let file_name = chess.square_name(move.to_square)[0];
                let num_pieces_on_file = 0;
                for (let i = 1; i < 9; i++) {
                    if (board.piece_at(chess.parse_square(`${file_name}${i}`)) !== null) {
                        num_pieces_on_file += 1;
                    }
                }
                if (num_pieces_on_file < 3) {
                    return true;
                }
            }
        }
    }
    return false;
}

function is_endgame(board) {
    let major_pieces = 0;
    let fen = board.fen();
    for (let p of fen.split(' ')[0]) {
        if (['r', 'b', 'n', 'q'].includes(p.toLowerCase())) {
            major_pieces += 1;
        }
    }
    if (major_pieces < 6) {
        return true;
    } else {
        return false;
    }
}

function move_moves_king_off_backrank(board, move) {
    let backrank_squares = Array.from(Array(8).keys()).concat(Array.from(Array(8).keys()).map(x => x + 56));
    if (is_endgame(board)) {
        if (String(board.piece_at(move.from_square)).toLowerCase() === 'k') {
            if (backrank_squares.includes(move.from_square)) {
                if (!backrank_squares.includes(move.to_square)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function move_attacks_piece(board, move, return_attacked_piece=false) {
    let position_after_move = board.copy();
    position_after_move.push(move);
    if (is_defended(position_after_move, move.to_square) || !board.is_attacked_by(position_after_move.turn, move.to_square)) {
        let attacked_squares = Array.from(position_after_move.attacks(move.to_square));
        for (let attacked_square of attacked_squares) {
            if (position_after_move.piece_at(attacked_square) !== null) {
                if (String(position_after_move.piece_at(attacked_square)).toLowerCase() !== 'k') {
                    if (position_after_move.piece_at(attacked_square).color !== position_after_move.piece_at(move.to_square).color) {
                        if (position_after_move.piece_type_at(attacked_square) > position_after_move.piece_type_at(move.to_square)) {
                            if (return_attacked_piece) {
                                return position_after_move.piece_at(attacked_square);
                            }
                            return true;
                        } else if (is_hanging(position_after_move, attacked_square, capturable_by=!position_after_move.turn)) {
                            if (return_attacked_piece) {
                                return position_after_move.piece_at(attacked_square);
                            }
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

function move_wins_tempo(board, move) {
    if (!move_attacks_piece(board, move)) {
        return false;
    }
    let points_gained = calculate_points_gained_by_move(board, move);
    if (typeof points_gained === 'string') {
        return false;
    }
    if (points_gained > 0) {
        return true;
    }
    return false;
}

function parse_pgn(pgn, san_only=false) {
    pgn = io.StringIO(pgn);
    pgn = chess.pgn.read_game(pgn);
    let board = chess.Board();
    let san_moves = [];
    let uci_moves = [];
    let fens = [];
    if (san_only) {
        for (let move of pgn.mainline_moves()) {
            san_moves.push(board.san(move));
            board.push(move);
            fens.push(board.fen());
        }
        return [san_moves, fens];
    } else {
        for (let move of pgn.mainline_moves()) {
            san_moves.push(board.san(move));
            board.push(move);
            uci_moves.push(move);
            fens.push(board.fen());
        }
        return [uci_moves, san_moves, fens];
    }
}

function convert_movelist_to_pgn(moves) {
    let pgn = "";
    let move_number = 1;
    for (let move of moves) {
        if (move_number % 2 === 1) {
            pgn += `${Math.floor(move_number / 2) + 1}.${move} `;
        } else {
            pgn += `${move} `;
        }
        move_number += 1;
    }
    return pgn.trim();
}

function move_captures_free_piece(board, move) {
    if (board.is_capture(move)) {
        if (is_hanging(board, move.to_square, capturable_by=board.turn)) {
            return true;
        }
    }
    return false;
}

function move_misses_free_piece(board, move, return_free_captures=false) {
    let free_captures = [];
    for (let legal_move of board.legal_moves) {
        if (move_captures_free_piece(board, legal_move)) {
            free_captures.push(legal_move);
        }
    }
    if (return_free_captures) {
        return free_captures;
    }
    if (free_captures.length === 0) {
        return false;
    } else {
        if (free_captures.includes(move)) {
            return false;
        } else {
            return true;
        }
    }
}

function move_threatens_mate(board, move) {
    let experiment_board = board.copy();
    experiment_board.push(move);
    if (experiment_board.is_check()) {
        return false;
    }
    experiment_board.push(chess.Move.null());
    with (chess.engine.SimpleEngine.popen_uci(stockfish_path)) {
        let info = engine.analyse(experiment_board, chess.engine.Limit(**STOCKFISH_CONFIG));
    }
    let score = String(info['score'].relative);
    if (score.includes('#') && score.includes('+')) {
        return true;
    } else {
        return false;
    }
}

function is_capturable_by_lower_piece(board, square, capturable_by) {
    let attacker_squares = board.attackers(capturable_by, square);
    for (let attacker_square of attacker_squares) {
        if (board.piece_type_at(attacker_square) < board.piece_type_at(square)) {
            return true;
        }
    }
}

function move_captures_higher_piece(board, move) {
    if (board.is_capture(move)) {
        if (board.piece_type_at(move.from_square) < board.piece_type_at(move.to_square)) {
            return true;
        }
    }
    return false;
}

function check_for_capturable_pieces_by_lower(board) {
    let capturable_squares = [];
    for (let square of board.piece_map()) {
        if (board.piece_at(square).color !== board.turn) {
            if (is_capturable_by_lower_piece(board, square, capturable_by=board.turn)) {
                capturable_squares.push(square);
            }
        }
    }
    return capturable_squares;
}

function get_best_move(board) {
    with (chess.engine.SimpleEngine.popen_uci(stockfish_path)) {
        let info = engine.analyse(board, chess.engine.Limit(**STOCKFISH_CONFIG));
    }
    let best_move = info['pv'][0];
    return best_move;
}

function get_best_sequence(board) {
    with (chess.engine.SimpleEngine.popen_uci(stockfish_path)) {
        let info = engine.analyse(board, chess.engine.Limit(**STOCKFISH_CONFIG));
    }
    let best_move = info['pv'];
    return best_move;
}

function mate_in_n_for(board) {
    with (chess.engine.SimpleEngine.popen_uci(stockfish_path)) {
        let info = engine.analyse(board, chess.engine.Limit(**STOCKFISH_CONFIG));
    }
    let score = String(info['score'].relative);
    console.log(score);
    assert(score.includes('#'));
    let n = parseInt(score.split('').filter(x => ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(x)).join(''));
    if (score.includes('-')) {
        let losing_side = board.turn === false ? 'Black' : 'White';
        return `${losing_side} gets checkmated in ${n}. `;
    } else if (score.includes('+')) {
        let losing_side = board.turn === true ? 'Black' : 'White';
        return `${losing_side} gets checkmated in ${n}. `;
    }
}

function compute_cpl(moves) {
    let cpls_white = [];
    let cpls_black = [];
    let scores = [];
    let board = chess.Board();
    for (let [e, move] of moves.entries()) {
        let comp_board = board.copy();
        let best_move = get_best_move(comp_board);
        comp_board.push(best_move);
        let score_best = evaluate(comp_board);
        if (score_best === 10000) {
            score_best = 1000;
        } else if (score_best === -10000) {
            score_best = -1000;
        }
        board.push(move);
        let score_player = evaluate(board);
        if (score_player === 10000) {
            score_player = 1000;
        } else if (score_player === -10000) {
            score_player = -1000;
        }
        scores.push(score_player);
        if (e % 2 === 0) {
            cpls_white.push(Math.abs(score_best - score_player));
        } else {
            cpls_black.push(Math.abs(score_best - score_player));
        }
    }
    let average_cpl_white = cpls_white.reduce((a, b) => a + b, 0) / cpls_white.length;
    let average_cpl_black = cpls_black.reduce((a, b) => a + b, 0) / cpls_black.length;
    return [scores, cpls_white, cpls_black, average_cpl_white, average_cpl_black];
}

function estimate_elo(acpl, n_moves) {
    if (acpl > 500) {
        return 100;
    }
    let e = 2.71828;
    let estimate = 3000 * (e ** (-0.01 * acpl)) * ((n_moves / 50) ** 0.5);
    return Math.ceil(estimate / 100) * 100;
}


function calculate_accuracy(eval_scores) {
    eval_scores = [0].concat(eval_scores);
    function calculate_win_percentage(cp_eval, color) {
        if (color == 'w') {
            return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp_eval)) - 1);
        } else if (color == 'b') {
            return 50 + 50 * (2 / (1 + Math.exp(0.00368208 * cp_eval)) - 1);
        }
    }
    var white_win_percentages = eval_scores.map(function (s) { return calculate_win_percentage(s, 'w'); });
    var black_win_percentages = white_win_percentages.map(function (p) { return 100 - p; });
    var white_accuracies = [];
    var black_accuracies = [];
    for (var i = 0; i < white_win_percentages.length - 1; i++) {
        if (i % 2 == 0) {
            var win_delta = white_win_percentages[i] - white_win_percentages[i + 1];
            if (win_delta <= 0) {
                white_accuracies.push(100);
            } else {
                var accuracy = 100.0307234 * Math.exp(-0.1008298 * win_delta) - 0.03076726;
                white_accuracies.push(accuracy);
            }
        } else {
            var win_delta = black_win_percentages[i] - black_win_percentages[i + 1];
            if (win_delta <= 0) {
                black_accuracies.push(100);
            } else {
                var accuracy = 100.0307234 * Math.exp(-0.1008298 * win_delta) - 0.03076726;
                black_accuracies.push(accuracy);
            }
        }
    }
    return [white_accuracies.reduce(function (a, b) { return a + b; }, 0) / white_accuracies.length, black_accuracies.reduce(function (a, b) { return a + b; }, 0) / black_accuracies.length];
}

function calculate_material(board) {
    var white_material = 0;
    var black_material = 0;
    for (var square in chess.SQUARES) {
        var piece = board.piece_at(square);
        if (piece != null) {
            if (piece.color == true) {
                white_material += piece.piece_type;
            } else {
                black_material += piece.piece_type;
            }
        }
    }
    return [white_material, black_material];
}

function get_development(board) {
    var white_dev = 0;
    var black_dev = 0;
    for (var square in [chess.A1, chess.H1]) {
        if (String(board.piece_at(square)) != 'R') {
            white_dev += 1;
        }
    }
    for (var square in [chess.B1, chess.G1]) {
        if (String(board.piece_at(square)) != 'N') {
            white_dev += 1;
        }
    }
    for (var square in [chess.C1, chess.F1]) {
        if (String(board.piece_at(square)) != 'B') {
            white_dev += 1;
        }
    }
    if (String(board.piece_at(chess.D1)) != 'Q') {
        white_dev += 1;
    }
    for (var square in [chess.A8, chess.H8]) {
        if (String(board.piece_at(square)) != 'r') {
            black_dev += 1;
        }
    }
    for (var square in [chess.B8, chess.G8]) {
        if (String(board.piece_at(square)) != 'n') {
            black_dev += 1;
        }
    }
    for (var square in [chess.C8, chess.F8]) {
        if (String(board.piece_at(square)) != 'b') {
            black_dev += 1;
        }
    }
    if (String(board.piece_at(chess.D8)) != 'q') {
        black_dev += 1;
    }
    return [white_dev, black_dev];
}

function get_tension(board) {
    var player_tension = 0;
    for (var move in board.legal_moves) {
        if (board.is_capture(move)) {
            player_tension += 1;
        }
    }
    board.push(chess.Move.null());
    var opponent_tension = 0;
    for (var move in board.legal_moves) {
        if (board.is_capture(move)) {
            opponent_tension += 1;
        }
    }
    board.pop();
    if (board.turn == true) {
        return [player_tension, opponent_tension];
    } else {
        return [opponent_tension, player_tension];
    }
}

function get_mobility(board) {
    var player_mobility = 0;
    for (var move in board.legal_moves) {
        if (String(board.piece_at(move.from_square)).toLowerCase() != 'p') {
            player_mobility += 1;
        }
    }
    board.push(chess.Move.null());
    var opponent_mobility = 0;
    for (var move in board.legal_moves) {
        if (String(board.piece_at(move.from_square)).toLowerCase() != 'p') {
            opponent_mobility += 1;
        }
    }
    board.pop();
    if (board.turn == true) {
        return [player_mobility, opponent_mobility];
    } else {
        return [opponent_mobility, player_mobility];
    }
}

function get_control(board) {
    var white_control = 0;
    var black_control = 0;
    for (var square in chess.SQUARES) {
        var piece = board.piece_at(square);
        if (piece != null) {
            if (piece.color == true) {
                white_control += board.attacks(square).length;
            } else {
                black_control += board.attacks(square).length;
            }
        }
    }
    return [white_control, black_control];
}

function calculate_metrics(fens) {
    var devs = [];
    var mobs = [];
    var tens = [];
    var conts = [];
    for (var fen in fens) {
        var board = chess.Board(fen);
        devs.push(get_development(board));
        mobs.push(get_mobility(board));
        tens.push(get_tension(board));
        conts.push(get_control(board));
    }
    return [devs, mobs, tens, conts];
}

var piece_dict = {
    'k': 'King',
    'n': 'Knight',
    'q': 'Queen',
    'r': 'Rook',
    'p': 'Pawn',
    'b': 'Bishop'
};

function review_move(board, move, previous_review, check_if_opening) {
    function format_item_list(items) {
        if (items.length == 0) {
            return "";
        }
        if (items.length == 1) {
            return items[0];
        }
        var formatted_items = items.slice(0, -1).join(", ") + ", and " + items.slice(-1);
        return formatted_items;
    }
    var position_after_move = board.copy();
    position_after_move.push(move);
    var review = '';
    var best_move = get_best_move(board);
    if (check_if_opening) {
        var opening = search_opening(openings_df, get_board_pgn(position_after_move));
        if (opening != null) {
            review = "This is a book move. The opening is called " + opening + ". ";
            return ['book', review, best_move, board.san(best_move)];
        }
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
            review += "This defends a " + format_item_list(defended_pieces) + " on " + format_item_list(defended_squares) + ". ";
        }
        var possible_forked_squares = move_creates_fork(board, move, true);
        if (possible_forked_squares.length >= 2) {
            var forked_pieces = possible_forked_squares.map(function (s) { return piece_dict[String(board.piece_at(s)).toLowerCase()]; });
            review += "This creates a fork on " + format_item_list(forked_pieces) + ". ";
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
            review += "This creates a discovered check whilst attacking a " + format_item_list(attacked_pieces_with_check) + ". ";
        }
        var trapped_squares = move_traps_opponents_piece(board, move, true);
        if (trapped_squares.length > 0) {
            var trapped_pieces = trapped_squares.map(function (s) { return board.piece_at(s); });
            trapped_pieces = trapped_pieces.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This traps a " + format_item_list(trapped_pieces) + ". ";
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
            possible_hanging_squares = possible_hanging_squares.filter(function (s) { return position_after_move.piece_at(s).color == board.turn; });
            if (possible_hanging_squares.length > 0) {
                var hanging_squares = possible_hanging_squares.map(function (s) { return chess.square_name(s); });
                var hanging_pieces = possible_hanging_squares.map(function (s) { return piece_dict[String(position_after_move.piece_at(s)).toLowerCase()]; });
                review += "This move leaves " + format_item_list(hanging_pieces) + " hanging on " + format_item_list(hanging_squares) + ". ";
            }
        }
        var capturable_pieces_by_lower = check_for_capturable_pieces_by_lower(position_after_move);
        capturable_pieces_by_lower = capturable_pieces_by_lower.filter(function (s) { return !possible_hanging_squares.includes(s); });
        if (capturable_pieces_by_lower.length > 0 && !position_after_move.is_check() && !is_possible_trade(board, move)) {
            capturable_pieces_by_lower = capturable_pieces_by_lower.map(function (s) { return piece_dict[String(position_after_move.piece_at(s)).toLowerCase()]; });
            review += "A " + format_item_list(capturable_pieces_by_lower) + " can be captured by a lower value piece. ";
        }
        var possible_forking_moves = move_allows_fork(board, move, true);
        if (get_best_move(position_after_move) in possible_forking_moves) {
            review += 'This move leaves pieces vulnerable to a fork. ';
        }
        var missed_forks = move_misses_fork(board, move, true);
        if (missed_forks.includes(get_best_move(position_after_move)) && move != get_best_move(position_after_move)) {
            review += "There was a missed fork with " + board.san(best_move) + ". ";
        }
        var missed_pins = move_misses_pin(board, move, true);
        if (missed_pins.includes(get_best_move(position_after_move)) && move != get_best_move(position_after_move)) {
            review += "There was a missed pin in the previous move with " + board.san(best_move) + ". ";
        }
        var missed_free_captures = move_misses_free_piece(board, move, true);
        if (missed_free_captures.length > 0) {
            if (missed_free_captures.includes(get_best_move(position_after_move)) && move != get_best_move(position_after_move)) {
                review += "An opportunity to take a " + piece_dict[String(board.piece_at(best_move.to_square)).toLowerCase()] + " was lost. ";
            }
        }
        var lets_opponent_play_move = get_best_move(position_after_move);
        if (move_threatens_mate(board, best_move)) {
            review += 'This misses an opportunity to create a checkmate threat. ';
        }
        var missed_attacked_piece = move_attacks_piece(board, best_move, true);
        if (missed_attacked_piece != false) {
            review += "A chance to attack a " + piece_dict[String(missed_attacked_piece).toLowerCase()] + " with " + board.san(best_move) + " was missed. ";
        }
        if (move_attacks_piece(position_after_move, lets_opponent_play_move)) {
            review += 'This permits the opponent to attack a piece. ';
        }
        var attacked_squares_with_check = move_is_discovered_check_and_attacks(position_after_move, lets_opponent_play_move, true);
        if (attacked_squares_with_check.length > 0) {
            var attacked_pieces_with_check = attacked_squares_with_check.map(function (s) { return position_after_move.piece_at(s); });
            attacked_pieces_with_check = attacked_pieces_with_check.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This lets the opponent win a " + format_item_list(attacked_pieces_with_check) + " from a discovered check. ";
        }
        var missed_attacked_squares_with_check = move_is_discovered_check_and_attacks(board, best_move, true);
        if (missed_attacked_squares_with_check.length > 0) {
            var missed_attacked_pieces_with_check = missed_attacked_squares_with_check.map(function (s) { return board.piece_at(s); });
            missed_attacked_pieces_with_check = missed_attacked_pieces_with_check.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This looses a chance to attack a " + format_item_list(missed_attacked_pieces_with_check) + " from a discovered check. ";
        }
        if (!(attacked_squares_with_check.length > 0)) {
            var trapped_squares = move_traps_opponents_piece(position_after_move, lets_opponent_play_move, true);
            if (trapped_squares.length > 0) {
                var trapped_pieces = trapped_squares.map(function (s) { return position_after_move.piece_at(s); });
                trapped_pieces = trapped_pieces.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
                review += "This allows a " + format_item_list(trapped_pieces) + " to be trapped. ";
            }
        }
        var missed_trapped_squares = move_traps_opponents_piece(board, best_move, true);
        if (missed_trapped_squares.length > 0) {
            var missed_trapped_pieces = missed_trapped_squares.map(function (s) { return board.piece_at(s); });
            missed_trapped_pieces = missed_trapped_pieces.map(function (p) { return piece_dict[String(p).toLowerCase()]; });
            review += "This looses a chance to trap a " + format_item_list(missed_trapped_pieces) + ". ";
        }
        if (move_wins_tempo(position_after_move, lets_opponent_play_move)) {
            review += "The opponent can win a tempo. ";
        }
        review += "The opponent can play " + position_after_move.san(lets_opponent_play_move) + ". ";
    } else if (move_classication.includes('continues gets mated')) {
        var losing_side = board.turn ? 'White' : 'Black';
        review += board.san(move) + " is good, but " + losing_side + " will still get checkmated. " + losing_side + " gets mated in " + move_classication.slice(-1) + ".";
        if (move == best_move) {
            move_classication = "best";
        } else {
            move_classication = 'good';
        }
    } else if (move_classication.includes('gets mated')) {
        var lets_opponent_play_move = get_best_move(position_after_move);
        var losing_side = board.turn ? 'White' : 'Black';
        review += "The opponent can play " + position_after_move.san(lets_opponent_play_move) + ". ";
        review += board.san(move) + " is a blunder and allows checkmate. " + losing_side + " gets mated in " + move_classication.slice(-1) + ".";
        move_classication = 'blunder';
    } else if (move_classication.includes('lost mate')) {
        var lets_opponent_play_move = get_best_move(position_after_move);
        review += "This loses the checkmate sequence. The opponent can play " + position_after_move.san(lets_opponent_play_move) + ". ";
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
    return [move_classication, review, best_move, board.san(best_move)];
}

function get_board_pgn(board) {
    var game = chess.pgn.Game();
    var node = game;
    for (var move in board.move_stack) {
        node = node.add_variation(move);
    }
    return game.mainline_moves().toString();
}

function review_game(uci_moves, roast, verbose) {
    var board = chess.Board();
    var san_best_moves = [];
    var uci_best_moves = [];
    var classification_list = [];
    var review_list = [];
    var best_review_list = [];
    for (var i = 0; i < uci_moves.length; i++) {
        var move = uci_moves[i];
        var check_if_opening = i < 11;
        var previous_review = review_list.length == 0 ? null : review_list.slice(-1)[0];
        var _a = review_move(board, move, previous_review, check_if_opening), classification = _a[0], review = _a[1], uci_best_move = _a[2], san_best_move = _a[3];
        if (classification != 'book') {
            var _b = review_move(board, uci_best_move, previous_review, check_if_opening), _ = _b[0], best_review = _b[1], _2 = _b[2], _3 = _b[3];
        } else {
            var best_review = '';
        }
        classification_list.push(classification);
        review_list.push(review);
        best_review_list.push(best_review);
        uci_best_moves.push(uci_best_move);
        san_best_moves.push(san_best_move);
        if (verbose) {
            console.log(move + ' | ' + review);
            console.log(uci_best_move + ' | ' + best_review);
        }
        board.push(move);
    }
    return [review_list, best_review_list, classification_list, uci_best_moves, san_best_moves];
}

function seperateSquaresInMoveList(uciMoves) {
    let seperatedSquares = [];

    for (let move of uciMoves) {
        move = String(move);
        seperatedSquares.push([move.substring(0, 2), move.substring(2)]);
    }

    return seperatedSquares;
}
