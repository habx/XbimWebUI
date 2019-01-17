import { IPlugin, Viewer } from "../../viewer";
export declare class RayPicking implements IPlugin {
    /**
     * This is constructor of the Pulse Highlight plugin for {@link xViewer xBIM Viewer}.
     * @name RayPicking
     * @constructor
     * @classdesc This is a plugin for Viewer which does picking by casting a ray to see which elements are
     * under the mouse. Best performance when a only subset of elements are pickable
     *
     *     var rayPicking = new RayPicking();
     *     viewer.addPlugin(rayPicking);
     *
    */
    constructor();
    private _initialized;
    accurate: boolean;
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
