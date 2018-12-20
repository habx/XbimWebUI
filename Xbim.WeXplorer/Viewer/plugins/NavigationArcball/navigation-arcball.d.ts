import { IPlugin, Viewer } from "../../viewer";
export declare class NavigationArcball implements IPlugin {
    private _originalNavigate;
    private _viewer;
    init(viewer: Viewer): void;
    /**
     * Use this boolean switch to activate and deactivate the plugin. This will supposingly be bound to
     * some user interaction (like a button in the toolbar).
     * @member {boolean} NavigationXYPlane#isActive
     * */
    private _isActive;
    isActive: boolean;
    /**
     * Min distance from the target
     * @member {number} NavigationArcball#maxDistance
     * */
    private _minDistance;
    minDistance: number;
    /**
     * Max distance from the target
     * @member {number} NavigationArcball#maxDistance
     * */
    private _maxDistance;
    maxDistance: number;
    /**
     * Min pitch for the camera (in rad)
     * @member {number} NavigationArcball#minPitch
     * */
    private _minPitch;
    minPitch: number;
    /**
     * Max pitch for the camera (in rad)
     * @member {number} NavigationArcball#maxDistance
     * */
    private _maxPitch;
    maxPitch: number;
    private _pitch;
    private _setPitch;
    private _yaw;
    private _setYaw;
    private _origin;
    origin: number[];
    private _distance;
    distance: number;
    private _setDistance;
    private _rotating;
    rotating: boolean;
    private _rotationSpeed;
    rotationSpeed: number;
    private _interactionTimeout;
    interactionTimeout: number;
    private _lastFrameTime;
    private _lastInteraction;
    private _dirty;
    private _updateCamera;
    private navigate;
    private zoomTo;
    onBeforeDraw(): void;
    onAfterDraw(): void;
    onBeforeDrawId(): void;
    onAfterDrawId(): void;
    onBeforeGetId(id: number): boolean;
    onBeforePick(id: number): boolean;
}
