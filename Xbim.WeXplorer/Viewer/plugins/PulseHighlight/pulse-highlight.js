"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pulse_highlight_shaders_1 = require("./pulse-highlight-shaders");
var mat4_1 = require("../../matrix/mat4");
var vec3_1 = require("../../matrix/vec3");
var lodash_1 = require("lodash");
var rgbToHex = function (color) { return "#" + color[0].toString(16) + color[1].toString(16) + color[2].toString(16); };
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
        this._highlightMaps = [];
        this._pulseEnabled = true;
        this._highlighted = [];
        this.updateMaps = function () {
            var _this = this;
            var idToColors = {};
            var prioritaryIdToColors = {};
            var newHighlights = [];
            var highlighted = lodash_1.reduce(this._highlighted, function (result, highlight) {
                var ids = highlight.ids;
                var prioritary = highlight.prioritary;
                var color = highlight.color;
                lodash_1.each(ids, function (id) {
                    var highlightsWithThisId = lodash_1.filter(_this._highlighted, function (h) { return h !== highlight && lodash_1.includes(h.ids, id); });
                    var othersArePrioritary = lodash_1.some(highlightsWithThisId, 'prioritary');
                    if (highlightsWithThisId.length > 0) {
                        lodash_1.each(highlightsWithThisId, function (h) {
                            if (!h.prioritary) {
                                lodash_1.pull(h.ids, id);
                            }
                        });
                        if (!prioritary || othersArePrioritary) {
                            lodash_1.pull(highlight.ids, id);
                        }
                        if (!prioritary && !othersArePrioritary) {
                            result.push({
                                colors: [color].concat(lodash_1.map(highlightsWithThisId, 'color')),
                                ids: [id],
                                prioritary: false,
                            });
                        }
                    }
                });
                if (ids.length) {
                    result.push({
                        ids: ids,
                        prioritary: prioritary,
                        color: color,
                    });
                }
                return result;
            }, []);
            this.viewer._handles.forEach(function (handle, handleIndex) {
                var vertices = handle.model.vertices;
                var highlightMaps = lodash_1.map(highlighted, function (highlight) {
                    var ids = highlight.ids;
                    var colors = highlight.colors || [highlight.color];
                    var maps = [];
                    ids.forEach(function (id) {
                        if (handle.model.productMaps[id]) {
                            var map_1 = handle.model.productMaps[id];
                            maps.push(map_1);
                        }
                    });
                    return ({
                        colors: colors,
                        maps: maps,
                    });
                });
                _this._highlightMaps[handleIndex] = highlightMaps;
            });
        };
        this.drawHandle = function (handle, handleIndex) {
            var _this = this;
            var gl = this.viewer.gl;
            if (handle.stopped)
                return;
            //set attributes and uniforms
            gl.bindBuffer(gl.ARRAY_BUFFER, handle._vertexBuffer);
            gl.vertexAttribPointer(this._positionAttrPointer, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, handle._normalBuffer);
            gl.vertexAttribPointer(this._normalAttrPointer, 2, gl.UNSIGNED_BYTE, false, 0, 0);
            var highlightMaps = this._highlightMaps[handleIndex];
            if (highlightMaps && highlightMaps.length) {
                highlightMaps.sort(this._zSortFunction.bind(this));
                highlightMaps.forEach(function (highlightMap, index) {
                    var maps = highlightMap.maps;
                    // const shapes = highlightMap.shapes
                    var colors = highlightMap.colors;
                    var color = colors[0];
                    var color2 = colors[1] || colors[0];
                    gl.uniform4fv(_this._highlightingColorUniformPointer, new Float32Array([
                        color[0] / 0xFF,
                        color[1] / 0xFF,
                        color[2] / 0xFF,
                        1.0
                    ]));
                    gl.uniform4fv(_this._highlightingColor2UniformPointer, new Float32Array([
                        color2[0] / 0xFF,
                        color2[1] / 0xFF,
                        color2[2] / 0xFF,
                        1.0
                    ]));
                    maps.forEach(function (map) {
                        var spans = map.spans;
                        spans.forEach(function (span) {
                            gl.drawArrays(gl.TRIANGLES, span[0], span[1] - span[0]);
                        });
                    }, handle);
                });
            }
        };
        this.getBboxScreenSpaceDistance = function (bboxes) {
            var worldPosition = vec3_1.vec3.create();
            bboxes.forEach(function (bbox) {
                worldPosition = vec3_1.vec3.add(vec3_1.vec3.create(), worldPosition, vec3_1.vec3.fromValues(bbox[0] + bbox[3] * 0.5, bbox[1] + bbox[4] * 0.5, bbox[2] + bbox[5] * 0.5));
            });
            worldPosition = vec3_1.vec3.scale(vec3_1.vec3.create(), worldPosition, 1 / bboxes.length);
            var viewProjection = mat4_1.mat4.multiply(mat4_1.mat4.create(), this.viewer._pMatrix, this.viewer.mvMatrix);
            var z = vec3_1.vec3.transformMat4(vec3_1.vec3.create(), worldPosition, this.viewer.mvMatrix)[2];
            return z;
        };
        this._zSortFunction = function (a, b) {
            var aBboxes = a.maps.map(function (v) { return v.bBox; });
            var bBboxes = b.maps.map(function (v) { return v.bBox; });
            return this.getBboxScreenSpaceDistance(aBboxes) - this.getBboxScreenSpaceDistance(bBboxes);
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
            compile(fragmentShader, pulse_highlight_shaders_1.PulseShaders.fragment);
            //vertex shader
            var vertexShader = gl.createShader(gl.VERTEX_SHADER);
            compile(vertexShader, pulse_highlight_shaders_1.PulseShaders.vertex);
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
    Object.defineProperty(PulseHighlight.prototype, "pulseEnabled", {
        /**
        * Enabled pulse or not
        * @member {Boolean} PulseHighlight#pulseEnabled
        */
        get: function () {
            return this._pulseEnabled;
        },
        set: function (value) {
            this._pulseEnabled = value;
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
    Object.defineProperty(PulseHighlight.prototype, "highlighted", {
        get: function () {
            return this._highlighted;
        },
        set: function (value) {
            this._highlighted = value;
            this._highlightMaps = [];
            this.updateMaps();
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
    };
    PulseHighlight.prototype.onBeforeDraw = function () { };
    PulseHighlight.prototype.onBeforePick = function (id) { return false; };
    PulseHighlight.prototype.onAfterDraw = function () {
        var gl = this.setActive();
        this.draw();
        this.setInactive();
        if (this._pulseEnabled) {
            this.viewer._userAction = true;
        }
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
        gl.disable(gl.CULL_FACE);
        gl.uniformMatrix4fv(this._pMatrixUniformPointer, false, this.viewer._pMatrix);
        gl.uniformMatrix4fv(this._mvMatrixUniformPointer, false, this.viewer.mvMatrix);
        gl.uniform1f(this._alphaMinUniformPointer, this._alphaMin);
        gl.uniform1f(this._alphaMaxUniformPointer, this._alphaMax);
        if (this._pulseEnabled) {
            gl.uniform1f(this._sinUniformPointer, Math.sin(Math.PI * ((Date.now() + this._periodOffset) % this._period) / this._period));
        }
        else {
            gl.uniform1f(this._sinUniformPointer, 1.0);
        }
        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        this.viewer._handles.forEach(this.drawHandle.bind(this));
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
    };
    PulseHighlight.prototype.lookupId = function (id) {
        var results = [];
        this._highlighted.forEach(function (highlight) {
            if (highlight.ids.includes(id)) {
                results.push(highlight);
            }
        });
        return results;
    };
    return PulseHighlight;
}());
exports.PulseHighlight = PulseHighlight;
//# sourceMappingURL=pulse-highlight.js.map