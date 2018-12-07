/**
 * This is constructor of the Pulse Highlight plugin for {@link xViewer xBIM Viewer}.
 * @name xPulseHighlight
 * @constructor
 * @classdesc This is a plugin for xViewer which renders the highlighted parts in a pulsating effect. It is customizable in terms of alpha
 * behaviour and pulse period. Use of plugin:
 *
 *     var pulseHighlight = new xPulseHighlight();
 *     viewer.addPlugin(pulseHighlight);
 *
*/
function xPulseHighlight() {
    this._initialized = false;

    /**
    * Min alpha of the pulse effect
    * @member {Number} xPulseHighlight#pulseAlphaMin
    */
    this.pulseAlphaMin = 0.3;

    /**
    * Max alpha of the pulse effect
    * @member {Number} xPulseHighlight#pulseAlphaMin
    */
    this.pulseAlphaMax = 0.6;

    /**
    * Period of the pulse (in seconds)
    * @member {Number} xPulseHighlight#highlighting
    */
    this.period = 1.5;
}

xPulseHighlight.prototype.init = function (xviewer) {
    var self = this;
    this.viewer = xviewer;
    var gl = this.viewer._gl;

    //create own shader
    this._shader = null;
    this._initShader();

    this._alphaMin = this.pulseAlphaMin;
    this._alphaMax = this.pulseAlphaMax;
    this._period = this.period * 1000;

    this._highlightingColor = this.viewer.highlightingColour;

    this.viewer.highlightingColour = [0.0, 0.0, 0.0, 0.0];

    //set own shader for init
    gl.useProgram(this._shader);

    this._pointers = { }

    //create uniform and attribute pointers
    this._alphaMinUniformPointer = gl.getUniformLocation(this._shader, "uHighlightAlphaMin");
    this._alphaMaxUniformPointer = gl.getUniformLocation(this._shader, "uHighlightAlphaMax");
    this._sinUniformPointer = gl.getUniformLocation(this._shader, "uSin");

    // Base uniforms
    this._pMatrixUniformPointer = gl.getUniformLocation(this._shader, "uPMatrix");
    this._mvMatrixUniformPointer = gl.getUniformLocation(this._shader, "uMVMatrix");
    this._clippingPlaneUniformPointer = gl.getUniformLocation(this._shader, "uClippingPlane");
    this._highlightingColourUniformPointer = gl.getUniformLocation(this._shader, "uHighlightColour");

    // Base attributes
    this._positionAttrPointer = gl.getAttribLocation(this._shader, "aPosition"),
    this._stateAttrPointer = gl.getAttribLocation(this._shader, "aState"),

    //enable vertex attributes arrays
    gl.enableVertexAttribArray(this._positionAttrPointer);
    gl.enableVertexAttribArray(this._stateAttrPointer);

    //reset original shader program
    gl.useProgram(this.viewer._shaderProgram);

    this._initialized = true;
}

xPulseHighlight.prototype.onBeforeDraw = function () { };

xPulseHighlight.prototype.onBeforePick = function () { };

xPulseHighlight.prototype.onAfterDraw = function() {
    var gl = this.setActive();
    
    this.draw();

    this.setInactive();
};

xPulseHighlight.prototype.onBeforeDrawId = function () { };

xPulseHighlight.prototype.onAfterDrawId = function () { };

xPulseHighlight.prototype.onBeforeGetId = function() { }

xPulseHighlight.prototype.setActive = function() {
    var gl = this.viewer._gl;
    //set own shader
    gl.useProgram(this._shader);

    return gl;
};

xPulseHighlight.prototype.setInactive = function () {
    var gl = this.viewer._gl;
    //set viewer shader
    gl.useProgram(this.viewer._shaderProgram);
};


xPulseHighlight.prototype.draw = function () {
    if (!this._initialized) return;
    var gl = this.viewer._gl;

    gl.uniformMatrix4fv(this._pMatrixUniformPointer, false, this.viewer._pMatrix);
    gl.uniformMatrix4fv(this._mvMatrixUniformPointer, false, this.viewer._mvMatrix);
    gl.uniform4fv(this._clippingPlaneUniformPointer, new Float32Array(this.viewer.clippingPlane));

    gl.uniform4fv(
        this._highlightingColourUniformPointer,
        new Float32Array(
            [
                this._highlightingColor[0] / 255.0,
                this._highlightingColor[1] / 255.0,
                this._highlightingColor[2] / 255.0,
                this._highlightingColor[3]
            ]
        )
    );

    gl.uniform1f(this._alphaMinUniformPointer, this._alphaMin);
    gl.uniform1f(this._alphaMaxUniformPointer, this._alphaMax);
    gl.uniform1f(this._sinUniformPointer, Math.sin(Math.PI * (Date.now() % this._period) / this._period));

    gl.disable(gl.DEPTH_TEST);
    this.viewer._handles.forEach(this.drawHandle.bind(this))
    gl.enable(gl.DEPTH_TEST);
}

xPulseHighlight.prototype.drawHandle = function (handle) {
    var gl = this.viewer._gl;

    if (handle.stopped) return;

    //set attributes and uniforms
    gl.bindBuffer(gl.ARRAY_BUFFER, handle.vertexBuffer);
    gl.vertexAttribPointer(this._positionAttrPointer, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, handle.stateBuffer);
    gl.vertexAttribPointer(this._stateAttrPointer, 2, gl.UNSIGNED_BYTE, false, 0, 0);
    
    const spans = []

    const currentSpan = []

    for (var i = 0; i < handle._model.states.length; i += 2) {
        if (handle._model.states[i] === xState.HIGHLIGHTED) {
            var index = i / 2;
            if (!currentSpan.length) {
                currentSpan[0] = index
                currentSpan[1] = index
            } else if (currentSpan[1] === index - 1) {
                currentSpan[1] = index
            } else {
                currentSpan[1] += 1
                spans.push(currentSpan)
                currentSpan = [index, index]
            }
        }
    }

    if (currentSpan.length) {
        currentSpan[1] += 1
        spans.push(currentSpan)
    }

    if (spans.length) {
        spans.forEach(function (span) {
            gl.drawArrays(gl.TRIANGLES, span[0], span[1] - span[0]);
        }, handle);
    }
};

xPulseHighlight.prototype._initShader = function () {

    var gl = this.viewer._gl;
    var viewer = this.viewer;
    var compile = function (shader, code) {
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            viewer._error(gl.getShaderInfoLog(shader));
            return null;
        }
    }

    //fragment shader
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    compile(fragmentShader, xShaders.pulse_fshader);

    //vertex shader
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    compile(vertexShader, xShaders.pulse_vshader);

    //link program
    this._shader = gl.createProgram();
    gl.attachShader(this._shader, vertexShader);
    gl.attachShader(this._shader, fragmentShader);
    gl.linkProgram(this._shader);

    if (!gl.getProgramParameter(this._shader, gl.LINK_STATUS)) {
        viewer._error('Could not initialise shaders for pulse highlight plugin');
    }
};
