const TETROMINO = Object.freeze({
    'I': Object.freeze({'states': [[[1],[1],[1],[1]], [[1, 1, 1, 1]]], 'color1': 'rgba(255, 190, 93, 1)', 'color2': 'rgba(255, 171, 89, 1)'}),
    'J': Object.freeze({'states': [[[0, 1], [0, 1], [1, 1]], [[1, 1, 1], [0, 0, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 0, 0],[1, 1, 1]]], 'color1': 'rgba(47, 255, 150, 1)', 'color2': 'rgba(0, 198, 98, 1)'}),
    'L': Object.freeze({'states': [[[1, 0], [1, 0], [1, 1]], [[0, 0, 1], [1, 1, 1]], [[1, 1], [0, 1], [0, 1]], [[1, 1, 1], [1, 0, 0]]], 'color1': 'rgba(0, 178, 255, 1)', 'color2': 'rgba(0, 167, 255, 1)'}),
    'O': Object.freeze({'states': [[[1, 1], [1, 1]]], 'color1': 'rgba(255, 125, 173, 1)', 'color2': 'rgba(255, 79, 143, 1)'}),
    'S': Object.freeze({'states': [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]], 'color1': 'rgba(255, 117, 111, 1)', 'color2': 'rgba(246, 86, 79, 1)'}),
    'T': Object.freeze({'states': [[[1, 1, 1], [0, 1, 0]], [[1, 0], [1, 1], [1, 0]], [[0, 1, 0], [1, 1, 1]], [[0, 1], [1, 1], [0, 1]]], 'color1': 'rgba(168, 124, 255, 1)', 'color2': 'rgba(134, 86, 229, 1)'}),
    'Z': Object.freeze({'states': [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]], 'color1': 'rgba(255, 242, 136, 1)', 'color2': 'rgba(255, 233, 78, 1)'})
});

const DIRECTION = Object.freeze({
    'LEFT'  : Object.freeze({dx:  0, dy: -1}),
    'RIGHT' : Object.freeze({dx:  0, dy:  1}),
    'DOWN'  : Object.freeze({dx:  1, dy:  0}),
    'UP'    : Object.freeze({dx: -1, dy:  0})
});

const REWARDS = [0, 100, 300, 700, 1500];

let getLocalsMessage = (messagename) => { return chrome.i18n.getMessage(messagename); }

function GUILocalization(){
    document.querySelectorAll(".controls > span")[0].textContent = getLocalsMessage("appControlControl");  
    document.querySelectorAll(".controls > span")[1].textContent = getLocalsMessage("appControlRotate");  
    document.querySelectorAll(".controls > span")[2].textContent = getLocalsMessage("appControlPause");
    document.querySelector('.level-text').textContent = getLocalsMessage("appLabelLevel"); 
    document.querySelector('.score-text').textContent = getLocalsMessage("appLabelScore"); 
    document.querySelector('.figure-heading').textContent = getLocalsMessage("appLabelNextFigure"); 
    document.querySelector('#new_game').textContent = getLocalsMessage("appLabelNewGame");
    document.querySelector('.record-text').textContent = getLocalsMessage("appLabelRecord");
}

let Storage = {
    setValue : (key, value) => { localStorage[key] = JSON.stringify(value); },
    getValue : (key) => {
        let result = undefined;
        try {
            if (localStorage[key]) result = JSON.parse(localStorage[key]);
        } catch (e) {
            throw new StorageError(`Error in localStorage[${key}] value. ${localStorage[key]}`);
        }
        return result; 
    }
};

/**
 * StorageError
 * @param   string      _msg    Error message    
 */
class StorageError extends Error {
    constructor(_msg){
        super();
        this.name = 'StorageError';
        this.message = _msg || 'Storage Error';
        this.stack = (new Error()).stack;
    }
}

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
          radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }

}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function controlKeyDown(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    switch(event.keyCode) {
        case 13:
            // Enter
            // TODO : PAUSE/RESUME
            game.onPause(!game.pause);
            break;
        case 32:
            // Space
            game.rotate(game.currentPiece);
            break;
        case 37:
            // Left
            game.move(game.currentPiece, DIRECTION.LEFT)
            break;
        case 38:
            // Up
            // NOTHING
            //move(context_buffer, matrix, this.currentPiece, DIRECTION.UP)
            break;
        case 39:
            // Right
            game.move(game.currentPiece, DIRECTION.RIGHT)
            break;
        case 40: 
            // Down
            game.move(game.currentPiece, DIRECTION.DOWN)
            break;
        default:
            return;
    }
    return false;
}

let EnterPressed = false;

function controlNewGame(event) {
    if (event.ctrlKey || event.altKey || event.metaKey || EnterPressed) return;
    switch(event.keyCode) {
        case 13:
            // Enter
            EnterPressed = true;
            if (game) {
                game.pause && game.onPause(false);
                clearInterval(game.timer);
                game.timer = null;
            }
            setTimeout(()=>{
                game = new GameBoard(document.querySelector('#tetris'), document.querySelector('#preview'), null, 20, 10, 1);
                game.init();
                game.show(game.currentPiece);
                EnterPressed = false;
            }, 1000);
            break;
        default:
            return;
    }
    return false;
}

class GameBoard {
    constructor(canvas, canvas_preview, matrix = null, rows, cols, gap = 1) {
        this.preview = canvas_preview;
        this.previewCtx = this.preview.getContext('2d');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.matrix = (matrix ? matrix : this.emptyMatrix());
        this.rows = rows;
        this.cols = cols;
        this.gap = gap;
        this.cellSize = Math.min((this.width - this.gap * (this.cols + 1))/this.cols, (this.height - this.gap * (this.rows + 1))/this.rows);
        this.currentPiece = null;
        this.nextPiece = null;
        this.finish = false;
        this.pause = true;
        this.score = 0;
        this.level = 0;
        this.acceleration = 100;
        this.basicSpeed = 1000;
        this.levelTimeInterval = 60000;
        this.speed = this.recalcSpeed();
        this.timer = null;
        this.runTime = 0;
        this.canvas.removeEventListener('keydown', controlKeyDown, false);
        window.removeEventListener('keydown', controlNewGame, false);
    }
    loadFromStorage() {
        this.matrix = Storage.getValue('matrix');
        let cpiece = Storage.getValue('currentPiece');
        let npiece = Storage.getValue('nextPiece');
        this.currentPiece = new Piece(cpiece.x, cpiece.y, TETROMINO[cpiece.type], cpiece.type, cpiece.state);
        this.nextPiece = new Piece(npiece.x, npiece.y, TETROMINO[npiece.type], npiece.type, npiece.state);
        this.finish = false; //Storage.getValue('finish');
        this.pause = true; //Storage.getValue('pause');
        this.score = Storage.getValue('score');
        this.level = Storage.getValue('level');
        this.speed = this.recalcSpeed();
        this.timer = null;
        this.runTime = Storage.getValue('runTime');
        this.updateScore();
        this.updateLevel();
        this.drawMatrix();
        this.canvas.addEventListener('keydown', controlKeyDown, false);
        this.drawPreview(this.nextPiece);
        this.canvas.focus();
    }
    recalcSpeed() {
        return (this.basicSpeed - this.level * this.acceleration > this.basicSpeed - 8 * this.acceleration ? this.basicSpeed - this.level * this.acceleration : this.basicSpeed - 8 * this.acceleration);
    }
    init() {
        document.querySelector('.content').className = "content";
        this.updateScore();
        this.updateLevel();
        this.drawMatrix();
        this.canvas.addEventListener('keydown', controlKeyDown, false);
        this.currentPiece = this.getRandomPiece();
        this.nextPiece = this.getRandomPiece();
        Storage.setValue('matrix', this.matrix);
        Storage.setValue('currentPiece', {'type': this.currentPiece.type, 'x': this.currentPiece.x, 'y': this.currentPiece.y, 'state': this.currentPiece.state});
        Storage.setValue('nextPiece', {'type': this.nextPiece.type, 'x': this.nextPiece.x, 'y': this.nextPiece.y, 'state': this.nextPiece.state});
        this.drawPreview(this.nextPiece);
        this.canvas.focus();
        this.pause = false;
        this.finish = false;
        this.timer = setInterval(()=>{ this.iteration(); }, this.speed);
    }
    onPause(p = true) {
        this.pause = p;
        document.querySelector('.label-pause').textContent = p ? getLocalsMessage('appControlPause') : "";
        if (this.pause) {
            clearInterval(this.timer);
            this.timer = null;
            this.animation(-1, 75, (it) => { this.drawCurrentTetrominoAnimation(it); }, () => { return !this.pause; }).then(d=>{this.drawMatrix();})
        } else {
            this.timer = setInterval(()=>{ this.iteration(); }, this.speed);
        }
        this.canvas.focus();
        Storage.setValue('pause', this.pause);
    }
    getRandomPiece() {
        let tetrID = getRandomInt(0, 7);
        let tetr, type;
        switch (tetrID) {
            case 0:
                tetr = TETROMINO.I;
                type = 'I';
                break;
            case 1:
                tetr = TETROMINO.J;
                type = 'J';
                break;
            case 2:
                tetr = TETROMINO.L;
                type = 'L';
                break;
            case 3:
                tetr = TETROMINO.O;
                type = 'O';
                break;
            case 4:
                tetr = TETROMINO.S;
                type = 'S';
                break;
            case 5:
                tetr = TETROMINO.T;
                type = 'T';
                break;
            case 6:
                tetr = TETROMINO.Z;
                type = 'Z';
                break;
            default:
                tetr = TETROMINO.I;
                type = 'I';
                break;
        }
        return new Piece(0, 5, tetr, type);
    }
    move(piece, direction) {
        if (this.finish  || this.pause)
            return false;
        let avail = false;
        if (direction.dx === 1 && direction.dy === 0) {
            if (piece.isBump(this.matrix, piece.x + direction.dx, piece.y + direction.dy)) {
                // check line
                let ilines = this.comboLines();
                if (ilines.length > 0) {
                    this.pause = true;
                    this.explodedRows = ilines;
                    clearInterval(this.timer);
                    this.timer = null;
                    this.animation(10, 50, (it) => { this.drawExplodedLines(it); })
                    .then(d => {
                        this.removeLines(ilines);
                        this.score += REWARDS[ilines.length];
                        this.updateScore();
                        this.nextPieceGenerate();
                        this.drawMatrix();
                        this.explodedRows = [];
                        this.onPause(false);
                    });
                } else {
                    this.nextPieceGenerate();
                    this.drawMatrix();
                }
                return avail;
            }
        }
        avail = piece.move(this.matrix, direction);
        this.drawMatrix();
        Storage.setValue('matrix', this.matrix);
        Storage.setValue('currentPiece', {'type': this.currentPiece.type, 'x': this.currentPiece.x, 'y': this.currentPiece.y, 'state': this.currentPiece.state});
        return avail;
    }
    rotate(piece) {
        if (this.finish)
            return false;
        let startState = piece.state;
        let curState = (startState + 1 >= piece.tetromino.states.length ? 0 : startState + 1);
        let avail = false;
        while (curState !== startState && !avail) {
            avail = piece.place(this.matrix, piece.x, piece.y, curState);
            curState = (curState + 1 >= piece.tetromino.states.length ? 0 : curState + 1);
        }
        this.drawMatrix();
        Storage.setValue('matrix', this.matrix);
        Storage.setValue('currentPiece', {'type': this.currentPiece.type, 'x': this.currentPiece.x, 'y': this.currentPiece.y, 'state': this.currentPiece.state});
        return avail;
    }
    show(piece) {
        piece = piece || this.currentPiece;
        let avail = piece.place(this.matrix);
        this.drawMatrix();
        return avail;
    }
    nextPieceGenerate() {
        if (this.currentPiece.x === 0 && this.currentPiece.y === 5) {
            this.finish = true;
            this.gameOver();
            return;
        }
        this.currentPiece = this.nextPiece;
        this.show(this.currentPiece);
        this.nextPiece = this.getRandomPiece();
        // Save pieces states
        Storage.setValue('matrix', this.matrix);
        Storage.setValue('currentPiece', {'type': this.currentPiece.type, 'x': this.currentPiece.x, 'y': this.currentPiece.y, 'state': this.currentPiece.state});
        Storage.setValue('nextPiece', {'type': this.nextPiece.type, 'x': this.nextPiece.x, 'y': this.nextPiece.y, 'state': this.nextPiece.state});
        this.drawPreview(this.nextPiece);
        if (this.currentPiece.isBump(this.matrix, this.currentPiece.x, this.currentPiece.y)){
            this.finish = true;
            this.gameOver();
        }
    }
    comboLines() {
        let comboIds = [];
        for (let i = 0; i < this.matrix.length; i++) {
            let filled = 0;
            for (let j = 0; j < this.matrix[i].length; j++) {
                if (this.matrix[i][j] !== 0) 
                    filled++;
            }
            if (filled === this.matrix[i].length)
                comboIds.push(i);
        }
        return comboIds;
    }
    removeLines(indexes) {
       for (let idx = 0; idx < indexes.length; idx++) {
            this.removeLine(indexes[idx]);
        }
    }
    removeLine(idx) {
        for (let i = idx; i >= 1; i--) {
            for (let j = 0; j < this.matrix[i].length; j++) {
                this.matrix[i][j] = this.matrix[i - 1][j];
            }
        }
        for (let j = 0; j < this.matrix[0].length; j++) {
            this.matrix[0][j] = 0;
        }
    }
    emptyMatrix() {
        return [
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0]
        ];
    }
    gameOver() {
        SocialModuleInstance && SocialModuleInstance.showSocial();
        this.runTime = 0;
        document.querySelector('.content').className = "content show_overlay";
        document.querySelector('.overlay > img').src = "./files/img/game_over.png";
        let highScore = Storage.getValue('record') ? Storage.getValue('record') : 0;
        if (this.score > highScore) {
            highScore = this.score;
            Storage.setValue('record', highScore);
            document.querySelector('.record-num').textContent = highScore;
        }
        this.canvas.removeEventListener('keydown', controlKeyDown, false);
        window.addEventListener('keydown', controlNewGame, false);
    }
    updateScore() {
        document.querySelector('#score').textContent = this.score;
        Storage.setValue('score', this.score);
    }
    updateLevel() {
        document.querySelector('#level').textContent = this.level;
        Storage.setValue('level', this.level);
    }
    drawBox(row, col, tetr = {'color1': '#463483', 'color2': '#463483'}) {
        let oldFillStyle = this.ctx.fillStyle;
        this.ctx.clearRect((col + 1) * this.gap + col * this.cellSize, (row + 1) * this.gap + row * this.cellSize, this.cellSize, this.cellSize);
        let grd = this.ctx.createLinearGradient((col + 1) * this.gap + col * this.cellSize, (row + 1) * this.gap + row * this.cellSize, (col + 1) * this.gap +  col * this.cellSize, (row + 1) * (this.gap + this.cellSize));
        grd.addColorStop(0, tetr.color1);
        grd.addColorStop(1, tetr.color2);
        this.ctx.fillStyle = grd;
        roundRect(this.ctx, (col + 1) * this.gap + col * this.cellSize, (row + 1) * this.gap + row * this.cellSize, this.cellSize, this.cellSize, this.cellSize/8, true, false);
        this.ctx.fillStyle = oldFillStyle;
    }
    drawMatrix() {
        this.clearGrid();
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.matrix[i][j] !== 0) {
                    this.drawBox(i, j, TETROMINO[this.matrix[i][j]]);
                } else {
                    this.drawBox(i, j, {'color1': '#463483', 'color2': '#463483'});
                }
            }
        }
    }
    drawPreview(piece) {
        let w = this.preview.width;
        let h = this.preview.height;
        this.previewCtx.clearRect(0, 0, w, h);
        let pw = piece.tetromino.states[piece.state][0].length * (this.cellSize + this.gap) + this.gap;
        let ph = piece.tetromino.states[piece.state].length * (this.cellSize + this.gap) + this.gap;
        let offsetLeft  = (w - pw)/2;
        let offsetTop   = (h - ph)/2;
        for (let i = 0; i < piece.tetromino.states[piece.state].length; i++) {
            for (let j = 0; j < piece.tetromino.states[piece.state][i].length; j++) {
                if (piece.tetromino.states[piece.state][i][j] === 1) {
                    let oldFillStyle = this.previewCtx.fillStyle;
                    let grd = this.previewCtx.createLinearGradient((j + 1) * this.gap + j * this.cellSize + offsetLeft, (i + 1) * this.gap + i * this.cellSize + offsetTop, (j + 1) * this.gap + j * this.cellSize + offsetLeft, (i + 1) * (this.gap + this.cellSize) + offsetTop);
                    grd.addColorStop(0, piece.tetromino.color1);
                    grd.addColorStop(1, piece.tetromino.color2);
                    this.previewCtx.fillStyle = grd;
                    roundRect(this.previewCtx, (j + 1) * this.gap + j * this.cellSize + offsetLeft, (i + 1) * this.gap + i * this.cellSize + offsetTop, this.cellSize, this.cellSize, this.cellSize/4, true, false);
                    this.previewCtx.fillStyle = oldFillStyle;
                }
            }   
        }
    }
    clearGrid() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    iteration() {
        if (!this.pause) {
            this.move(this.currentPiece, DIRECTION.DOWN);
            if (!this.finish) {
                this.runTime += this.speed;
                if (this.runTime > (this.level + 1) * this.levelTimeInterval) {
                    this.level++;
                    this.updateLevel();
                    this.speed = this.recalcSpeed();
                    clearInterval(this.timer);
                    this.timer = setInterval(()=>{ this.iteration(); }, this.speed);
                }
            } else {
                clearInterval(this.timer);
                this.timer = null;
            }
            Storage.setValue('matrix', this.matrix);
            Storage.setValue('runTime', this.runTime);
            Storage.setValue('currentPiece', {'type': this.currentPiece.type, 'x': this.currentPiece.x, 'y': this.currentPiece.y, 'state': this.currentPiece.state});
        }
        // save currentPiece state
    }
    drawExplodedLines(it) {
        for (let i = 0; i < this.explodedRows.length; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.ctx.save();
                let rgba = [this.currentPiece.tetromino.color1, this.currentPiece.tetromino.color2];
                for (let k = 0; k < rgba.length; k++) {
                    rgba[k] = rgba[k].match(/(\d+)/g);
                    for (let i = 0; i < rgba[k].length; i++) rgba[k][i] = parseInt(rgba[k][i]);
                    rgba[k][3] = ((it * 10)%100)/100;
                    rgba[k] = 'rgba(' + rgba[k][0] + ', ' + rgba[k][1] + ', ' + rgba[k][2] + ', ' + rgba[k][3] + ')';
                }
                this.drawBox(this.explodedRows[i], j, {'color1': rgba[0], 'color2': rgba[1]});
                this.ctx.restore();
            }
        }
    }
    drawCurrentTetrominoAnimation(it) {
        let tetrCoords = [];
        for (let i = 0; i < this.currentPiece.tetromino.states[this.currentPiece.state].length; i++) {
            for (let j = 0; j < this.currentPiece.tetromino.states[this.currentPiece.state][i].length; j++) {
                if (this.currentPiece.tetromino.states[this.currentPiece.state][i][j] === 1) {
                    this.ctx.save();
                    let rgba = [this.currentPiece.tetromino.color1, this.currentPiece.tetromino.color2];
                    for (let k = 0; k < rgba.length; k++) {
                        rgba[k] = rgba[k].match(/(\d+)/g);
                        for (let i = 0; i < rgba[k].length; i++) rgba[k][i] = parseInt(rgba[k][i]);
                        rgba[k][3] = ((it * 10)%100)/100;
                        rgba[k] = 'rgba(' + rgba[k][0] + ', ' + rgba[k][1] + ', ' + rgba[k][2] + ', ' + rgba[k][3] + ')';
                    }
                    this.drawBox(this.currentPiece.x + i, this.currentPiece.y + j, {'color1': rgba[0], 'color2': rgba[1]});
                    this.ctx.restore();
                }
            }
        }
    }
    animation(frames_count, frame_duration, drawFrame, isFinishedAnimation = () => { return false; }) {
        return new Promise(resolve => {
            function frame(it, max_it, dur_it, func_cond) {
                return new Promise(resolve_frame => {
                    let condition;
                    if (max_it === -1) {
                        condition = func_cond();
                    } else {
                        condition = (it >= max_it);
                    }
                    if (condition) 
                        return resolve_frame(true);
                    drawFrame(it);
                    setTimeout(()=>{
                        it++;
                        return resolve_frame(frame(it, max_it, dur_it, isFinishedAnimation));
                    }, dur_it);
                });
            }
            frame(0, frames_count, frame_duration, isFinishedAnimation)
            .then(data => {
                resolve(true);
            });
        });
    }
}

function render() {
    let context1 = document.querySelector('#tetris').getContext('2d');
    context1.drawImage(canvas_buffer, 0, 0);
}

class Piece {
    constructor(x, y, tetr, type, state = 0) {
        this.x = x;
        this.y = y;
        this.tetromino = tetr;
        this.state = state;
        this.type = type;
    }
    init(matrix) {
        return this.place(matrix, 0, 5, 0);
    }
    move(matrix, direction) {
        return this.place(matrix, this.x + direction.dx, this.y + direction.dy, this.state);
    }
    place(matrix, x = this.x, y = this.y, state = this.state) {
        if (this.collide(matrix, x, y, state)) {
            this.clear(matrix);
            this.state = state;
            this.x = x;
            this.y = y;
            for (let i = 0; i < this.tetromino.states[this.state].length; i++) {
                for (let j = 0; j < this.tetromino.states[this.state][i].length; j++) {
                    if (this.tetromino.states[this.state][i][j] === 1) {
                        matrix[x + i][y + j] = this.type;
                    }
                }   
            }
            return true;
        }
        return false;
    }
    clear(matrix) {
        for (let i = 0; i < this.tetromino.states[this.state].length; i++) {
            for (let j = 0; j < this.tetromino.states[this.state][i].length; j++) {
                if (this.tetromino.states[this.state][i][j] === 1) {
                    matrix[this.x + i][this.y + j] =0;
                }
            }   
        }
    }
    positions() {
        let pos = [];
        for (let i = 0; i < this.tetromino.states[this.state].length; i++) {
            for (let j = 0; j < this.tetromino.states[this.state][i].length; j++) {
                if (this.tetromino.states[this.state][i][j] === 1) {
                    pos.push({x: this.x + i, y: this.y + j});
                }
            }   
        }
        return pos;
    }
    isExist(x, y) {
        let pos = this.positions();
        for (let i = 0; i < pos.length; i++) {
            if (x === pos[i].x && y === pos[i].y) 
                return true;
        }
        return false;
    }
    isBump(matrix, x, y) {
        for (let i = 0; i < this.tetromino.states[this.state].length; i++) {
            for (let j = 0; j < this.tetromino.states[this.state][i].length; j++) {
                if (this.tetromino.states[this.state][i][j] === 1) {
                    if (x + i >= matrix.length) {
                        return true;
                    }
                    if (matrix[x + i][y + j] !== 0 && !this.isExist(x + i, y + j)){
                        return true;
                    }
                }
            }   
        }
        return false;   
    }
    collide(matrix, x, y, state) {
        for (let i = 0; i < this.tetromino.states[state].length; i++) {
            for (let j = 0; j < this.tetromino.states[state][i].length; j++) {
                if (this.tetromino.states[state][i][j] === 1) {
                    if (x + i >= matrix.length || x + i < 0 || y + j >= matrix[0].length || y + j < 0) {
                        return false;
                    }
                    if (matrix[x + i][y + j] !== 0 && !this.isExist(x + i, y + j)){
                        return false;
                    }
                }
            }   
        }
        return true;
    }
}

let game = null;

document.addEventListener('DOMContentLoaded', () => {
    GUILocalization();
    document.querySelector('.record-num').textContent = Storage.getValue('record') ? Storage.getValue('record') : 0;

    if (Storage.getValue('runTime')) {
        if (game === null) {
            game = new GameBoard(document.querySelector('#tetris'), document.querySelector('#preview'), null, 20, 10, 1);
            game.loadFromStorage();
            game.show(game.currentPiece);
            document.querySelector('#tetris').focus();
            if (game.pause) {
                // paused then resume
                game.onPause(true)
                document.querySelector('.label-pause').textContent = getLocalsMessage('appControlPause');
            } else {
                // resumed then pause
                game.onPause(false)
                document.querySelector('.label-pause').textContent  = "";
            }
        }
    } else {
        document.querySelector('.content').className = "content show_overlay";
        document.querySelector('.overlay > img').src = "./files/img/new_game.png";
        document.querySelector('#tetris').focus();
        window.addEventListener('keydown', controlNewGame, false);
    }

    setTimeout(()=>{window.focus(); document.querySelector('#tetris').focus();}, 100);
    document.querySelector('#new_game').addEventListener('click', (event) => {
        if (EnterPressed) return;
        EnterPressed = true;
        if (game) {
            game.pause && game.onPause(false);
            clearInterval(game.timer);
            game.timer = null;
        }
        setTimeout(()=>{
            game = new GameBoard(document.querySelector('#tetris'), document.querySelector('#preview'), null, 20, 10, 1);
            game.init();
            game.show(game.currentPiece);
            EnterPressed = false;
        }, 1000);
    });
});