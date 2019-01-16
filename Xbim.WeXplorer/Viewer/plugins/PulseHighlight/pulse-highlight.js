"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var state_1 = require("../../state");
var pulse_highlight_shaders_1 = require("./pulse-highlight-shaders");
var PulseHighlight = /** @class */ (function () {
    /**
     * This is constructor of the Pulse Highlight plugin for {@link xViewer xBIM Viewer}.
     * @name PulseHighlight
     * @constructor
     * @classdesc This is a plugin for xViewer which renders the highlighted parts in a pulsating effect. It is customizable in terms of alpha
     * behaviour and pulse period. Use of plugin:
     *
     *     var pulseHighlight = new xPulseHighlight();
     *     viewer.addPlugin(pulseHighlight);
     *
    */
    function PulseHighlight() {
        this._initialized = false;
        this._period = 1500;
        this._periodOffset = 0;
        this._alphaMin = 0.3;
        this._alphaMax = 0.6;
        this._spans = [];
        this.setState = function (state, target, modelId) {
            this._originalSetState(state, target, modelId);
            this.updateSpans();
        };
        this.resetStates = function (hideSpaces, modelId) {
            this._originalResetStates(hideSpaces, modelId);
            this.updateSpans();
        };
        this.updateSpans = function () {
            var _this = this;
            this.viewer._handles.forEach(function (handle, handleIndex) {
                var spans = [];
                var currentSpan = [];
                for (var i = 0; i < handle.model.states.length; i += 2) {
                    if (handle.model.states[i] === state_1.State.HIGHLIGHTED) {
                        var index = i / 2;
                        if (!currentSpan.length) {
                            currentSpan[0] = index;
                            currentSpan[1] = index;
                        }
                        else if (currentSpan[1] === index - 1) {
                            currentSpan[1] = index;
                        }
                        else {
                            currentSpan[1] += 1;
                            spans.push(currentSpan);
                            currentSpan = [index, index];
                        }
                    }
                }
                if (currentSpan.length) {
                    currentSpan[1] += 1;
                    spans.push(currentSpan);
                }
                _this._spans[handleIndex] = spans;
            });
        };
        this.drawHandle = function (handle, handleIndex) {
            var gl = this.viewer.gl;
            if (handle.stopped)
                return;
            //set attributes and uniforms
            gl.bindBuffer(gl.ARRAY_BUFFER, handle._vertexBuffer);
            gl.vertexAttribPointer(this._positionAttrPointer, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, handle._stateBuffer);
            gl.vertexAttribPointer(this._stateAttrPointer, 2, gl.UNSIGNED_BYTE, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, handle._normalBuffer);
            gl.vertexAttribPointer(this._normalAttrPointer, 2, gl.UNSIGNED_BYTE, false, 0, 0);
            var spans = this._spans[handleIndex];
            if (spans && spans.length) {
                spans.forEach(function (span) {
                    gl.drawArrays(gl.TRIANGLES, span[0], span[1] - span[0]);
                }, handle);
            }
        };
        this._initShader = function () {
            var gl = this.viewer.gl;
            var viewer = this.viewer;
            var compile = function (shader, code) {
                gl.shaderSource(shader, code);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    viewer.error(gl.getShaderInfoLog(shader));
                    return null;
                }
            };
            //fragment shader
            var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            compile(fragmentShader, pulse_highlight_shaders_1.PulseShaders.pulse_fshader);
            //vertex shader
            var vertexShader = gl.createShader(gl.VERTEX_SHADER);
            compile(vertexShader, pulse_highlight_shaders_1.PulseShaders.pulse_vshader);
            //link program
            this._shader = gl.createProgram();
            gl.attachShader(this._shader, vertexShader);
            gl.attachShader(this._shader, fragmentShader);
            gl.linkProgram(this._shader);
            if (!gl.getProgramParameter(this._shader, gl.LINK_STATUS)) {
                viewer.error('Could not initialise shaders for pulse highlight plugin');
            }
        };
    }
    Object.defineProperty(PulseHighlight.prototype, "alphaMin", {
        /**
        * Min alpha of the pulse effect
        * @member {Number} PulseHighlight#alphaMin
        */
        get: function () {
            return this._alphaMin;
        },
        set: function (value) {
            this._alphaMin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PulseHighlight.prototype, "alphaMax", {
        /**
        * Max alpha of the pulse effect
        * @member {Number} PulseHighlight#alphaMax
        */
        get: function () {
            return this._alphaMax;
        },
        set: function (value) {
            this._alphaMax = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PulseHighlight.prototype, "period", {
        /**
        * Period of the pulse (in seconds)
        * @member {Number} PulseHighlight#period
        */
        get: function () {
            return this._period / 1000;
        },
        set: function (value) {
            var newPeriod = value * 1000;
            this._periodOffset = ((((Date.now() + this._periodOffset) % this._period) /
                this._period) -
                ((Date.now() % newPeriod) /
                    newPeriod)) * newPeriod;
            this._period = newPeriod;
        },
        enumerable: true,
        configurable: true
    });
    PulseHighlight.prototype.init = function (viewer) {
        var self = this;
        this.viewer = viewer;
        var gl = this.viewer.gl;
        //create own shader
        this._shader = null;
        this._initShader();
        this._highlightingColor = this.viewer.highlightingColour;
        this.viewer.highlightingColour = [0.0, 0.0, 0.0, 0.0];
        //set own shader for init
        gl.useProgram(this._shader);
        //create uniform and attribute pointers
        this._alphaMinUniformPointer = gl.getUniformLocation(this._shader, "uHighlightAlphaMin");
        this._alphaMaxUniformPointer = gl.getUniformLocation(this._shader, "uHighlightAlphaMax");
        this._sinUniformPointer = gl.getUniformLocation(this._shader, "uSin");
        // Base uniforms
        this._pMatrixUniformPointer = gl.getUniformLocation(this._shader, "uPMatrix");
        this._mvMatrixUniformPointer = gl.getUniformLocation(this._shader, "uMVMatrix");
        this._clippingPlaneAUniformPointer = gl.getUniformLocation(this._shader, 'uClippingPlaneA');
        this._clippingAUniformPointer = gl.getUniformLocation(this._shader, 'uClippingA');
        this._clippingPlaneBUniformPointer = gl.getUniformLocation(this._shader, 'uClippingPlaneB');
        this._clippingBUniformPointer = gl.getUniformLocation(this._shader, 'uClippingB');
        this._highlightingColourUniformPointer = gl.getUniformLocation(this._shader, "uHighlightColour");
        this._stateStyleSamplerUniform = gl.getUniformLocation(this._shader, 'uStateStyleSampler');
        // Base attributes
        this._positionAttrPointer = gl.getAttribLocation(this._shader, "aPosition");
        this._stateAttrPointer = gl.getAttribLocation(this._shader, "aState");
        this._normalAttrPointer = gl.getAttribLocation(this._shader, "aNormal");
        //enable vertex attributes arrays
        gl.enableVertexAttribArray(this._positionAttrPointer);
        gl.enableVertexAttribArray(this._stateAttrPointer);
        gl.enableVertexAttribArray(this._normalAttrPointer);
        //reset original shader program
        gl.useProgram(this.viewer._shaderProgram);
        this._initialized = true;
        this._originalSetState = viewer['setState'].bind(viewer);
        viewer['setState'] = this.setState.bind(this);
        this._originalResetStates = viewer['resetStates'].bind(viewer);
        viewer['resetStates'] = this.resetStates.bind(this);
        this.updateSpans();
    };
    PulseHighlight.prototype.onBeforeDraw = function () { };
    PulseHighlight.prototype.onBeforePick = function (id) { return false; };
    PulseHighlight.prototype.onAfterDraw = function () {
        var gl = this.setActive();
        this.draw();
        this.setInactive();
        this.viewer._userAction = true;
    };
    PulseHighlight.prototype.onBeforeDrawId = function () { };
    PulseHighlight.prototype.onAfterDrawId = function () { };
    PulseHighlight.prototype.onBeforeGetId = function (id) { return false; };
    PulseHighlight.prototype.setActive = function () {
        var gl = this.viewer.gl;
        //set own shader
        gl.useProgram(this._shader);
        return gl;
    };
    PulseHighlight.prototype.setInactive = function () {
        var gl = this.viewer.gl;
        //set viewer shader
        gl.useProgram(this.viewer._shaderProgram);
    };
    PulseHighlight.prototype.draw = function () {
        if (!this._initialized)
            return;
        var gl = this.viewer.gl;
        gl.enable(gl.BLEND);
        gl.uniformMatrix4fv(this._pMatrixUniformPointer, false, this.viewer._pMatrix);
        gl.uniformMatrix4fv(this._mvMatrixUniformPointer, false, this.viewer.mvMatrix);
        gl.uniform4fv(this._clippingPlaneAUniformPointer, new Float32Array(this.viewer._clippingPlaneA));
        gl.uniform4fv(this._clippingPlaneBUniformPointer, new Float32Array(this.viewer._clippingPlaneB));
        gl.uniform1i(this._clippingAUniformPointer, this.viewer._clippingA ? 1 : 0);
        gl.uniform1i(this._clippingBUniformPointer, this.viewer._clippingB ? 1 : 0);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.viewer._stateStyleTexture);
        gl.uniform1i(this._stateStyleSamplerUniform, 4);
        gl.uniform4fv(this._highlightingColourUniformPointer, new Float32Array([
            this._highlightingColor[0] / 255.0,
            this._highlightingColor[1] / 255.0,
            this._highlightingColor[2] / 255.0,
            this._highlightingColor[3]
        ]));
        gl.uniform1f(this._alphaMinUniformPointer, this._alphaMin);
        gl.uniform1f(this._alphaMaxUniformPointer, this._alphaMax);
        gl.uniform1f(this._sinUniformPointer, Math.sin(Math.PI * ((Date.now() + this._periodOffset) % this._period) / this._period));
        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        this.viewer._handles.forEach(this.drawHandle.bind(this));
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
    };
    return PulseHighlight;
}());
exports.PulseHighlight = PulseHighlight;
//# sourceMappingURL=pulse-highlight.js.map