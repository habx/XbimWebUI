import { IPlugin, Viewer } from "../../viewer";
import { State } from "../../state";
import { PulseShaders } from "./pulse-highlight-shaders";
import { mat4 } from "../../matrix/mat4";
import { mat3 } from "../../matrix/mat3";
import { vec3 } from "../../matrix/vec3";


export class PulseHighlight implements IPlugin {
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
    constructor() {
    }

    private _initialized: boolean = false;

    /**
    * Min alpha of the pulse effect
    * @member {Number} xPulseHighlight#pulseAlphaMin
    */
    public pulseAlphaMin = 0.3;

    /**
    * Max alpha of the pulse effect
    * @member {Number} xPulseHighlight#pulseAlphaMin
    */
    public pulseAlphaMax = 0.6;

    /**
    * Period of the pulse (in seconds)
    * @member {Number} xPulseHighlight#highlighting
    */
    public period = 1.5;

    private viewer: Viewer;
    private _shader: WebGLProgram;
    private _alphaMin: number;
    private _alphaMax: number;
    private _period: number;
    private _highlightingColor: number[];

    private _alphaMinUniformPointer: WebGLUniformLocation;
    private _alphaMaxUniformPointer: WebGLUniformLocation;
    private _sinUniformPointer: WebGLUniformLocation;

    private _pMatrixUniformPointer: WebGLUniformLocation;
    private _mvMatrixUniformPointer: WebGLUniformLocation;
    private _clippingPlaneAUniformPointer: WebGLUniformLocation;
    private _clippingAUniformPointer: WebGLUniformLocation;
    private _clippingPlaneBUniformPointer: WebGLUniformLocation;
    private _clippingBUniformPointer: WebGLUniformLocation;
    private _highlightingColourUniformPointer: WebGLUniformLocation;
    private _stateStyleSamplerUniform: WebGLUniformLocation;

    private _positionAttrPointer: number;
    private _stateAttrPointer: number;

    public init(viewer: Viewer) {
        var self = this;
        this.viewer = viewer;
        var gl = this.viewer.gl;

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
        this._positionAttrPointer = gl.getAttribLocation(this._shader, "aPosition"),
            this._stateAttrPointer = gl.getAttribLocation(this._shader, "aState"),

            //enable vertex attributes arrays
            gl.enableVertexAttribArray(this._positionAttrPointer);
        gl.enableVertexAttribArray(this._stateAttrPointer);

        //reset original shader program
        gl.useProgram(this.viewer._shaderProgram);

        this._initialized = true;
    }

    public onBeforeDraw() { }
    public onBeforePick(id: number) { return false; }

    public onAfterDraw() {
        var gl = this.setActive();

        this.draw();

        this.setInactive();

        this.viewer._userAction = true;
    }

    public onBeforeDrawId() { }

    public onAfterDrawId() { }

    public onBeforeGetId(id: number) { return false; }

    private setActive() {
        var gl = this.viewer.gl;
        //set own shader
        gl.useProgram(this._shader);

        return gl;
    }

    private setInactive() {
        var gl = this.viewer.gl;
        //set viewer shader
        gl.useProgram(this.viewer._shaderProgram);
    }


    private draw() {
        if (!this._initialized) return;
        var gl = this.viewer.gl;

        gl.uniformMatrix4fv(this._pMatrixUniformPointer, false, this.viewer._pMatrix);
        gl.uniformMatrix4fv(this._mvMatrixUniformPointer, false, this.viewer.mvMatrix);
        gl.uniform4fv(this._clippingPlaneAUniformPointer, new Float32Array(this.viewer._clippingPlaneA));
        gl.uniform4fv(this._clippingPlaneBUniformPointer, new Float32Array(this.viewer._clippingPlaneB));
        gl.uniform1i(this._clippingAUniformPointer, this.viewer._clippingA ? 1 : 0);
        gl.uniform1i(this._clippingBUniformPointer, this.viewer._clippingB ? 1 : 0);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.viewer._stateStyleTexture);
        gl.uniform1i(this._stateStyleSamplerUniform, 4);

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

    private drawHandle = function (handle) {
        var gl = this.viewer.gl;

        if (handle.stopped) return;

        //set attributes and uniforms
        gl.bindBuffer(gl.ARRAY_BUFFER, handle._vertexBuffer);
        gl.vertexAttribPointer(this._positionAttrPointer, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, handle._stateBuffer);
        gl.vertexAttribPointer(this._stateAttrPointer, 2, gl.UNSIGNED_BYTE, false, 0, 0);

        const spans = []

        let currentSpan = []

        for (var i = 0; i < handle.model.states.length; i += 2) {
            if (handle.model.states[i] === State.HIGHLIGHTED) {
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
    }

    private _initShader = function () {
        var gl = this.viewer.gl;
        var viewer = this.viewer;
        var compile = function (shader, code) {
            gl.shaderSource(shader, code);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                viewer.error(gl.getShaderInfoLog(shader));
                return null;
            }
        }

        //fragment shader
        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        compile(fragmentShader, PulseShaders.pulse_fshader);

        //vertex shader
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        compile(vertexShader, PulseShaders.pulse_vshader);

        //link program
        this._shader = gl.createProgram();
        gl.attachShader(this._shader, vertexShader);
        gl.attachShader(this._shader, fragmentShader);
        gl.linkProgram(this._shader);

        if (!gl.getProgramParameter(this._shader, gl.LINK_STATUS)) {
            viewer.error('Could not initialise shaders for pulse highlight plugin');
        }
    }
}