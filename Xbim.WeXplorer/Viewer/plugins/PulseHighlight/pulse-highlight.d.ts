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
    private _highlightingColorUniformPointer;
    private _highlightingColor2UniformPointer;
    private _sinUniformPointer;
    private _zOffsetUniformPointer;
    private _pMatrixUniformPointer;
    private _mvMatrixUniformPointer;
    private _positionAttrPointer;
    private _normalAttrPointer;
    private _period;
    private _periodOffset;
    private _alphaMin;
    private _alphaMax;
    private _highlightMaps;
    private _pulseEnabled;
    private _highlighted;
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
    * Enabled pulse or not
    * @member {Boolean} PulseHighlight#pulseEnabled
    */
    pulseEnabled: boolean;
    /**
    * Period of the pulse (in seconds)
    * @member {Number} PulseHighlight#period
    */
    period: number;
    highlighted: any[];
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
    private lookupId;
    private updateMaps;
    private drawHandle;
    private getBboxScreenSpaceDistance;
    private _zSortFunction;
    private _initShader;
}
