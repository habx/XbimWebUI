import { IPlugin, Viewer } from "../../viewer";
export declare class PulseHighlight implements IPlugin {
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
    constructor();
    private _initialized;
    private viewer;
    private _shader;
    private _highlightingColor;
    private _alphaMinUniformPointer;
    private _alphaMaxUniformPointer;
    private _sinUniformPointer;
    private _pMatrixUniformPointer;
    private _mvMatrixUniformPointer;
    private _clippingPlaneAUniformPointer;
    private _clippingAUniformPointer;
    private _clippingPlaneBUniformPointer;
    private _clippingBUniformPointer;
    private _highlightingColourUniformPointer;
    private _stateStyleSamplerUniform;
    private _positionAttrPointer;
    private _stateAttrPointer;
    private _period;
    private _periodOffset;
    private _alphaMin;
    private _alphaMax;
    /**
    * Min alpha of the pulse effect
    * @member {Number} PulseHighlight#alphaMin
    */
    alphaMin: number;
    /**
    * Max alpha of the pulse effect
    * @member {Number} PulseHighlight#alphaMax
    */
    alphaMax: number;
    /**
    * Period of the pulse (in seconds)
    * @member {Number} PulseHighlight#period
    */
    period: number;
    init(viewer: Viewer): void;
    onBeforeDraw(): void;
    onBeforePick(id: number): boolean;
    onAfterDraw(): void;
    onBeforeDrawId(): void;
    onAfterDrawId(): void;
    onBeforeGetId(id: number): boolean;
    private setActive;
    private setInactive;
    private draw;
    private drawHandle;
    private _initShader;
}
