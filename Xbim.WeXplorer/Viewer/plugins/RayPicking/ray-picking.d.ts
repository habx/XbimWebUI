import { IPlugin, Viewer } from "../../viewer";
export declare class RayPicking implements IPlugin {
    /**
     * This is constructor of the Pulse Highlight plugin for {@link xViewer xBIM Viewer}.
     * @name RayPicking
     * @constructor
     * @classdesc This is a plugin for xViewer which renders the highlighted parts in a pulsating effect. It is customizable in terms of alpha
     * behaviour and pulse period. Use of plugin:
     *
     *     var pulseHighlight = new xRayPicking();
     *     viewer.addPlugin(pulseHighlight);
     *
    */
    constructor();
    private _initialized;
    private viewer;
    init(viewer: Viewer): void;
    private getID;
    private _rayHitsTriangle;
    private _screenToWorldRay;
    private _unproject;
    private _vec4TransformMat4;
    onBeforeDraw(): void;
    onBeforePick(id: number): boolean;
    onAfterDraw(): void;
    onBeforeDrawId(): void;
    onAfterDrawId(): void;
    onBeforeGetId(id: number): boolean;
}
