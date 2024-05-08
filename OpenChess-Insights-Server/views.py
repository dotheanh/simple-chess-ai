from flask import Blueprint, render_template, request, jsonify
import os
import chess_review
import json

views = Blueprint(__name__, "views")

@views.route("/")
def home():
    return render_template('index.html')

@views.route('/analysis', methods=['GET', 'POST'])
def analyse():
    # Create a dictionary containing details of the request
    request_data = {
        "method": request.method,
        "form": dict(request.form),
        "referrer": request.referrer,
        "host_url": request.host_url,
        # Add any other relevant details of the request here
    }
    # Print the request data as JSON
    print(json.dumps(request_data, indent=4))

    roast = False

    if request.method == 'POST':
        pgn_data = request.form['pgn']
        time_limit = request.form['time-limit']
        depth_limit = request.form['depth-limit']

        if request.form['limits'] == "time":
            chess_review.STOCKFISH_CONFIG = {'time': float(time_limit)}
        else:
            chess_review.STOCKFISH_CONFIG = {'depth': int(depth_limit)}

        if 'roastmode' in request.form:
            roast = True

    uci_moves, san_moves, fens = chess_review.parse_pgn(pgn_data)

    scores, cpls_white, cpls_black, average_cpl_white, average_cpl_black = chess_review.compute_cpl(uci_moves)
    n_moves = len(scores) // 2
    white_elo_est, black_elo_est = chess_review.estimate_elo(average_cpl_white, n_moves), chess_review.estimate_elo(average_cpl_black, n_moves)
    white_acc, black_acc = chess_review.calculate_accuracy(scores)
    devs, mobs, tens, conts = chess_review.calculate_metrics(fens)

    review_list, best_review_list, classification_list, uci_best_moves, san_best_moves = chess_review.review_game(uci_moves, roast)

    uci_best_moves = chess_review.seperate_squares_in_move_list(uci_best_moves)

    # Check if the request is from the same origin
    if request.referrer and request.referrer.startswith(request.host_url):
        # Request is from the same origin, return HTML
        return render_template('analysis.html',
            move_list=san_moves,
            fen_list=fens,
            score_list=scores,
            cls_list=classification_list,
            review_list=review_list,
            best_review_list=best_review_list,
            best_move_list=san_best_moves,
            best_move_uci_list=uci_best_moves,
            dev_list=devs,
            ten_list=tens,
            mob_list=mobs,
            cont_list=conts,
            acc_pair=[round(white_acc), round(black_acc)],
            elo_pair=[round(white_elo_est), round(black_elo_est)],
            acpl_pair=[round(average_cpl_white), round(average_cpl_black)]
        )
    else:
        # Request is from a different origin, return JSON
        data = {
            "move_list": san_moves,
            "fen_list": fens,
            "score_list": scores,
            "cls_list": classification_list,
            "review_list": review_list,
            "best_review_list": best_review_list,
            "best_move_list": san_best_moves,
            "best_move_uci_list": uci_best_moves,
            "dev_list": devs,
            "ten_list": tens,
            "mob_list": mobs,
            "cont_list": conts,
            "acc_pair": [round(white_acc), round(black_acc)],
            "elo_pair": [round(white_elo_est), round(black_elo_est)],
            "acpl_pair": [round(average_cpl_white), round(average_cpl_black)]
        }
        return jsonify(data)
