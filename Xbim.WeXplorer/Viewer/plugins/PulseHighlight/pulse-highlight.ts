import { IPlugin, Viewer } from "../../viewer";
import { State } from "../../state";
import { ProductMap } from "../../model-geometry";
import { PulseShaders } from "./pulse-highlight-shaders";
import { mat4 } from "../../matrix/mat4";
import { mat3 } from "../../matrix/mat3";
import { vec3 } from "../../matrix/vec3";

import { some, map, filter, each, includes, reduce, pull } from 'lodash'

const rgbToHex = color => `#${color[0].toString(16)}${color[1].toString(16)}${color[2].toString(16)}`

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

    private viewer: Viewer;
    private _shader: WebGLProgram;
    private _highlightingColor: number[];

    private _alphaMinUniformPointer: WebGLUniformLocation;
    private _alphaMaxUniformPointer: WebGLUniformLocation;
    private _highlightingColorUniformPointer: WebGLUniformLocation;
    private _highlightingColor2UniformPointer: WebGLUniformLocation;
    private _sinUniformPointer: WebGLUniformLocation;
    private _zOffsetUniformPointer: WebGLUniformLocation;

    private _pMatrixUniformPointer: WebGLUniformLocation;
    private _mvMatrixUniformPointer: WebGLUniformLocation;

    private _positionAttrPointer: number;
    private _normalAttrPointer: number;

    private _period: number = 1500;
    private _periodOffset: number = 0;
    private _alphaMin: number = 0.3;
    private _alphaMax: number = 0.6;

    private _highlightMaps = [];
    
    private _pulseEnabled: boolean = true;

    private _highlighted = [];

    /**
    * Min alpha of the pulse effect
    * @member {Number} PulseHighlight#alphaMin
    */
    public get alphaMin() {
        return this._alphaMin;
    }
    public set alphaMin(value: number) {
        this._alphaMin = value;
    }

    /**
    * Max alpha of the pulse effect
    * @member {Number} PulseHighlight#alphaMax
    */
    public get alphaMax() {
        return this._alphaMax;
    }
    public set alphaMax(value: number) {
        this._alphaMax = value;
    }

    /**
    * Enabled pulse or not
    * @member {Boolean} PulseHighlight#pulseEnabled
    */
    public get pulseEnabled() {
        return this._pulseEnabled;
    }
    public set pulseEnabled(value: boolean) {
        this._pulseEnabled = value;
    }

    /**
    * Period of the pulse (in seconds)
    * @member {Number} PulseHighlight#period
    */
    public get period() {
        return this._period / 1000;
    }
    public set period(value: number) {
        const newPeriod = value * 1000;
        this._periodOffset = (
            (
                ((Date.now() + this._periodOffset) % this._period) /
                this._period
            ) -
            (
                (Date.now() % newPeriod) /
                newPeriod
            )
        ) * newPeriod;

        this._period = newPeriod;
    }

    public get highlighted() {
        return this._highlighted;
    }

    public set highlighted(value) {
        this._highlighted = value;

        this._highlightMaps = []

        this.updateMaps();
    }

    public init(viewer: Viewer) {
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
        this._highlightingColorUniformPointer = gl.getUniformLocation(this._shader, "uHighlightColor");
        this._highlightingColor2UniformPointer = gl.getUniformLocation(this._shader, "uHighlightColor2");
        this._sinUniformPointer = gl.getUniformLocation(this._shader, "uSin");
        this._zOffsetUniformPointer = gl.getUniformLocation(this._shader, "uZOffset");

        // Base uniforms
        this._pMatrixUniformPointer = gl.getUniformLocation(this._shader, "uPMatrix");
        this._mvMatrixUniformPointer = gl.getUniformLocation(this._shader, "uMVMatrix");

        // Base attributes
        this._positionAttrPointer = gl.getAttribLocation(this._shader, "aPosition");
        this._normalAttrPointer = gl.getAttribLocation(this._shader, "aNormal");

        //enable vertex attributes arrays
        gl.enableVertexAttribArray(this._positionAttrPointer);
        gl.enableVertexAttribArray(this._normalAttrPointer);

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

        if (this._pulseEnabled) {
            this.viewer._userAction = true;
        }
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

        gl.enable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.uniformMatrix4fv(this._pMatrixUniformPointer, false, this.viewer._pMatrix);
        gl.uniformMatrix4fv(this._mvMatrixUniformPointer, false, this.viewer.mvMatrix);

        gl.uniform1f(this._alphaMinUniformPointer, this._alphaMin);
        gl.uniform1f(this._alphaMaxUniformPointer, this._alphaMax);
        
        if (this._pulseEnabled) {
            const date = (Date.now() + this._periodOffset) % this._period
            const d = date / this._period
            gl.uniform1f(this._sinUniformPointer, Math.sin((1.0 + (Math.PI * 2) * d) / 2.0));
        } else {
            gl.uniform1f(this._sinUniformPointer, 1.0);
        }

        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        this.viewer._handles.forEach(this.drawHandle.bind(this))
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
    }

    private lookupId(id) {
        let results = []
        this._highlighted.forEach(highlight => {
            if (highlight.ids.includes(id)) {
                results.push(highlight)
            }
        })

        return results
    }

    private updateMaps = function () {
        const idToColors = {}
        const prioritaryIdToColors = {}

        const newHighlights = []

        const highlighted = reduce(this._highlighted, (result, highlight) => {
            const ids = highlight.ids
            const prioritary = highlight.prioritary
            const color = highlight.color

            each(ids, id => {
                const highlightsWithThisId = filter(this._highlighted, h => h !== highlight && includes(h.ids, id))
                const othersArePrioritary = some(highlightsWithThisId, 'prioritary')

                if (highlightsWithThisId.length > 0) {
                    each(highlightsWithThisId, h => {
                        if (!h.prioritary) {
                            pull(h.ids, id)
                        }
                    })

                    if (!prioritary || othersArePrioritary) {
                        pull(highlight.ids, id)
                    }

                    if (!prioritary && !othersArePrioritary) {
                        result.push({
                            colors: [color, ...map(highlightsWithThisId, 'color')],
                            ids: [id],
                            prioritary: false,
                        })
                    }
                }
            })

            if (ids.length) {
                result.push({
                    ids,
                    prioritary,
                    color,
                })
            }

            return result
        }, [])

        this.viewer._handles.forEach((handle, handleIndex) => {
            const vertices = handle.model.vertices

            const highlightMaps = map(highlighted, highlight => {
                const ids = highlight.ids
                const colors = highlight.colors || [highlight.color]
                
                const maps = []

                ids.forEach(id => {
                    if (handle.model.productMaps[id]) {
                        const map = handle.model.productMaps[id]
                        maps.push(map)
                    }
                })
                return ({
                    colors,
                    maps,
                })
            })
            
            this._highlightMaps[handleIndex] = highlightMaps
        })
    }

    private drawHandle = function (handle, handleIndex) {
        var gl = this.viewer.gl;

        if (handle.stopped) return;

        //set attributes and uniforms
        gl.bindBuffer(gl.ARRAY_BUFFER, handle._vertexBuffer);
        gl.vertexAttribPointer(this._positionAttrPointer, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, handle._normalBuffer);
        gl.vertexAttribPointer(this._normalAttrPointer, 2, gl.UNSIGNED_BYTE, false, 0, 0);

        const highlightMaps = this._highlightMaps[handleIndex];

        if (highlightMaps && highlightMaps.length) {
            highlightMaps.sort(this._zSortFunction.bind(this));
            highlightMaps.forEach((highlightMap, index) => {
                const maps = highlightMap.maps
                // const shapes = highlightMap.shapes
                const colors = highlightMap.colors

                const color = colors[0]
                const color2 = colors[1] || colors[0]
                
                gl.uniform4fv(
                    this._highlightingColorUniformPointer,
                    new Float32Array(
                        [
                            color[0] / 0xFF,
                            color[1] / 0xFF,
                            color[2] / 0xFF,
                            1.0
                        ]
                    )
                );

                gl.uniform4fv(
                    this._highlightingColor2UniformPointer,
                    new Float32Array(
                        [
                            color2[0] / 0xFF,
                            color2[1] / 0xFF,
                            color2[2] / 0xFF,
                            1.0
                        ]
                    )
                );
                
                maps.forEach(function (map) {
                    const spans = map.spans;
                    spans.forEach(function (span) {
                        gl.drawArrays(gl.TRIANGLES, span[0], span[1] - span[0]);
                    })
                }, handle);
            })
        }
    }

    private getBboxScreenSpaceDistance = function (bboxes) {
        let worldPosition = vec3.create();
        bboxes.forEach(bbox => {
            worldPosition = vec3.add(
                vec3.create(),
                worldPosition,
                vec3.fromValues(
                    bbox[0] + bbox[3] * 0.5,
                    bbox[1] + bbox[4] * 0.5,
                    bbox[2] + bbox[5] * 0.5,
                )
            )
        });

        worldPosition = vec3.scale(vec3.create(), worldPosition, 1 / bboxes.length)

        const viewProjection = mat4.multiply(mat4.create(), this.viewer._pMatrix, this.viewer.mvMatrix)

        const z = vec3.transformMat4(vec3.create(), worldPosition, this.viewer.mvMatrix)[2]

        return z
    }

    private _zSortFunction = function (a, b) {
        if (a.prioritary && !b.prioritary) {
            return -1;
        }
        if (b.prioritary && !a.prioritary) {
            return 1;
        }

        const aBboxes = a.maps.map(v => v.bBox)
        const bBboxes = b.maps.map(v => v.bBox)

        return this.getBboxScreenSpaceDistance(aBboxes) - this.getBboxScreenSpaceDistance(bBboxes)
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
        compile(fragmentShader, PulseShaders.fragment);

        //vertex shader
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        compile(vertexShader, PulseShaders.vertex);

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
