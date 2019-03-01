import { IPlugin, Viewer } from "../../viewer";
import { mat4 } from '../../matrix/mat4';
import { vec3 } from '../../matrix/vec3';

import { ModelHandle } from '../../model-handle';

const PI_2 = Math.PI * 2

const clamp = (value, min, max) => Math.max(Math.min(0.9999 * max, value), 1.0001 * min);
const degToRad = deg => deg * (Math.PI / 180.0);

const interpolateAngle = (a, b, t) => {
    const diff = (b - a) % PI_2;
    const shortestAngle = ((2 * diff) % PI_2) - diff;

    return a + (shortestAngle * t);
}

const mergeBboxes = bboxes => {
    const bbox = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]

    bboxes.forEach(b => {
        if (!b) {
            return;
        }

        const bboxTop = [
            bbox[0] + bbox[3],
            bbox[1] + bbox[4],
            bbox[2] + bbox[5],
        ];

        if (isNaN(bboxTop[0])) {
            bboxTop[0] = -Infinity;
        }
        if (isNaN(bboxTop[1])) {
            bboxTop[1] = -Infinity;
        }
        if (isNaN(bboxTop[2])) {
            bboxTop[2] = -Infinity;
        }

        const bTop = [
            b[0] + b[3],
            b[1] + b[4],
            b[2] + b[5],
        ];

        const top = [
            Math.max(bboxTop[0], bTop[0]),
            Math.max(bboxTop[1], bTop[1]),
            Math.max(bboxTop[2], bTop[2]),
        ];

        bbox[0] = Math.min(bbox[0], b[0]);
        bbox[1] = Math.min(bbox[1], b[1]);
        bbox[2] = Math.min(bbox[2], b[2]);

        bbox[3] = top[0] - bbox[0];
        bbox[4] = top[1] - bbox[1];
        bbox[5] = top[2] - bbox[2];
    })

    return bbox;
}

export class NavigationArcball implements IPlugin
{
    // original navigation function
    private _originalNavigate: (type: string, deltaX: number, deltaY: number) => void;
    private _viewer: Viewer;


    // called by the viewer when plugin is added
    init(viewer: Viewer): void {

        // patch the internal implementation (keep binding to the original object)
        this._originalNavigate = viewer['navigate'].bind(viewer);
        viewer['navigate'] = this.navigate.bind(this);

        // keep the reference for the navigation
        this._viewer = viewer;
    }

    /**
     * Use this boolean switch to activate and deactivate the plugin. This will supposingly be bound to
     * some user interaction (like a button in the toolbar).
     * @member {boolean} NavigationXYPlane#isActive
     * */
    private _isActive = false;
    public get isActive(): boolean { return this._isActive; }
    public set isActive(value: boolean) {
        this._isActive = value;
    }

    /**
     * Min distance from the target
     * @member {number} NavigationArcball#maxDistance
     * */
    private _minDistance = 10;
    public get minDistance(): number { return this._minDistance; }
    public set minDistance(value: number) {
        this._minDistance = value;
        this._setDistance(this._distance);

        this._dirty = true;
    }


    /**
     * Max distance from the target
     * @member {number} NavigationArcball#maxDistance
     * */
    private _maxDistance = 150;
    public get maxDistance(): number { return this._maxDistance; }
    public set maxDistance(value: number) {
        this._maxDistance = value;
        this._setDistance(this._distance);

        this._dirty = true;
    }

    /**
     * Min pitch for the camera (in rad)
     * @member {number} NavigationArcball#minPitch
     * */
    private _minPitch = 0;
    public get minPitch(): number { return this._minPitch; }
    public set minPitch(value: number) {
        this._minPitch = value;
        this._setPitch(this._pitch);

        this._dirty = true;
    }


    /**
     * Max pitch for the camera (in rad)
     * @member {number} NavigationArcball#maxDistance
     * */
    private _maxPitch = Math.PI / 2;
    public get maxPitch(): number { return this._maxPitch; }
    public set maxPitch(value: number) {
        this._maxPitch = value;
        this._setPitch(this._pitch);

        this._dirty = true;
    }

    private _targetPitch: number = 0;
    private _pitch: number = 0;
    private _setPitch(value: number) {
        this._pitch = clamp(value % PI_2, this._minPitch, this._maxPitch);
        this._setTargetPitch(value);
        this._dirty = true;
    };
    private _setTargetPitch(value: number) {
        this._targetPitch = clamp(value % PI_2, this._minPitch, this._maxPitch);

        if (this._targetPitch - this._pitch > Math.PI) {
            this._targetPitch = - PI_2 - this._targetPitch;
        }

        this._dirty = true;
    };

    private _targetYaw: number = 0;
    private _yaw: number = 0;
    private _setYaw(value: number) {
        this._yaw = value % PI_2;
        this._setTargetYaw(value);
        this._dirty = true;
    };
    private _setTargetYaw(value: number) {
        this._targetYaw = value % PI_2;
        this._dirty = true;
    };

    private _targetOrigin: number[];
    private _origin: number[];
    public set origin(value: number[]) {
        this._origin = value;
        this._targetOrigin = value;
        this._viewer._origin = value;

        this._dirty = true;
    }
    public set targetOrigin(value: number[]) {
        this._targetOrigin = value;

        this._dirty = true;
    }

    private _targetDistance: number;
    private _distance: number;
    public set distance(value: number) {
        const viewer = this._viewer
        let meter = 1;

        viewer._handles.forEach(function (handle) {
            meter = handle.model.meter
        }, viewer);

        this._setDistance(meter * value)
    }
    public get distance() {
        const viewer = this._viewer
        let meter = 1;

        viewer._handles.forEach(function (handle) {
            meter = handle.model.meter
        }, viewer);

        return this._distance / meter;
    }

    private _setDistance(value: number) {
        const viewer = this._viewer
        let meter = 1;

        viewer._handles.forEach(function (handle) {
            meter = handle.model.meter
        }, viewer);

        this._distance = clamp(value, this._minDistance * meter, this._maxDistance * meter);
        this._setTargetDistance(value);
        this._viewer._distance = this._distance;

        this._dirty = true;
    }

    private _setTargetDistance(value: number) {
        const viewer = this._viewer
        let meter = 1;

        viewer._handles.forEach(function (handle) {
            meter = handle.model.meter
        }, viewer);

        this._targetDistance = clamp(value, this._minDistance * meter, this._maxDistance * meter);

        this._dirty = true;
    }

    private _rotating: boolean = false;
    public set rotating(value: boolean) {
        this._rotating = value;
    }
    public get rotating() {
        return this._rotating;
    }

    private _rotationSpeed: number = Math.PI / 20;
    public set rotationSpeed(value: number) {
        this._rotationSpeed = value;
    }
    public get rotationSpeed() {
        return this._rotationSpeed;
    }

    private _interactionTimeout = 4000;
    public set interactionTimeout(value: number) {
        this._interactionTimeout = value;
    }
    public get interactionTimeout() {
        return this._interactionTimeout;
    }

    private _setInterpolating() {
        this._lastInteraction = Date.now();
        this._interpolating = true;
        this._interpolationStarted = Date.now();
    }


    private _lastFrameTime = Date.now();

    private _lastInteraction = 0;

    private _dirty = true;

    private _interpolationStarted = 0;
    private _interpolating = false;
    private _interpolationTime = 1000;

    public set interpolationTime(value: number) {
        this._interpolationTime = value * 1000;
    }
    public get interpolationTime() {
        return this._interpolationTime / 1000;
    }

    private _animateCamera() {
        if (!this._interpolating) {
            return;
        }
    }

    private _updateCamera() {
        const dT = Date.now() - this._lastFrameTime;
        this._lastFrameTime += dT;

        const timeSinceLastInteraction = this._lastFrameTime - this._lastInteraction;

        // In case either property was updated on the viewer setCameraTarget or zoomTo
        // Called before the check on _isDirty in order to set _isDirty if the properties changed
        if (this._viewer._distance !== this._distance) {
            this._setDistance(this._viewer._distance)
        }

        if (this._viewer._origin !== this._origin) {
            this.origin = this._viewer._origin;
        }

        if (this._rotating && timeSinceLastInteraction > 4000) {
            this._setYaw(this._yaw += (dT / 1000) * this._rotationSpeed);
        }

        if (!this._dirty && !this._interpolating) return;

        const t = Math.min((this._lastFrameTime - this._interpolationStarted) / this._interpolationTime, 1.0);

        var origin = !this._interpolating
            ? this._origin
            : vec3.lerp(
                vec3.create(),
                vec3.clone(this._origin),
                vec3.clone(this._targetOrigin),
                t,
            );
        var yaw = !this._interpolating
            ? this._yaw
            : interpolateAngle(this._yaw, this._targetYaw, t);
        var pitch = !this._interpolating
            ? this._pitch
            : interpolateAngle(this._pitch, this._targetPitch, t);
        pitch = -pitch + (Math.PI / 2);

        var distance = !this._interpolating
            ? this._distance
            : this._distance + (this._targetDistance - this._distance) * t;

        const interpolating = t < 1.0

        if (!interpolating && this._interpolating) {
            this._setDistance(this._targetDistance);
            this._setYaw(this._targetYaw);
            this._setPitch(this._targetPitch);
            this.origin = this._targetOrigin;
            this._interpolating = false;
        }

        const eye = vec3.create()

        eye[0] = origin[0] + distance * Math.cos(yaw) * Math.sin(pitch);
        eye[1] = origin[1] + distance * Math.sin(yaw) * Math.sin(pitch);
        eye[2] = origin[2] + distance * Math.cos(pitch);
        
        mat4.lookAt(this._viewer.mvMatrix, eye, origin, [0, 0, 1]);

        this._viewer.fire('cameraupdate', {
            position: eye,
            target: origin,
            pitch,
            yaw,
        })
        
        this._dirty = false;
        this._viewer._userAction = true;
    }

    private navigate(type, deltaX, deltaY) {
        const viewer = this._viewer

        if (!viewer._handles || !viewer._handles[0] || this._interpolating) return;

        this._lastInteraction = Date.now();

        switch (type) {
            case 'free-orbit':
            case 'fixed-orbit':
            case 'orbit':
                this._setYaw(this._yaw - degToRad(deltaX / 4));
                this._setPitch(this._pitch + degToRad(deltaY / 4));
                break;
            case 'pan':
                break;

            case 'zoom':
                this._setDistance(this._distance - (deltaY * this._distance / 20))
                break;

            default:
                break;
        }
    }

    private zoomTo(
        ids: number[],
        {
            interpolate = false,
            autoYaw = true,
            yaw = this._yaw,
            pitch = this._pitch,
        }
    ) {
        if (!ids) {
            return;
        }

        const bboxes = ids.map(id => (
            this._viewer.forHandleOrAll((handle: ModelHandle) => {
                let map = handle.getProductMap(id);
                if (map) {
                    return map.bBox;
                }
            })
        ), undefined)

        const bbox = mergeBboxes(bboxes);

        const newOrigin = [
            bbox[0] + bbox[3] * 0.5,
            bbox[1] + bbox[4] * 0.5,
            bbox[2] + bbox[5] * 0.5,
        ]

        const distance = vec3.distance(
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(bbox[3], bbox[4], bbox[5]),
        );

        if (autoYaw) {
            const dir = vec3.sub(vec3.create(), newOrigin, this._origin);

            const angle = Math.atan2(dir[1], dir[0]);

            yaw = angle
        }

        if (interpolate) {
            this._setTargetYaw(yaw);
            this._setTargetPitch(pitch);

            this._setTargetDistance(distance);

            this.targetOrigin = newOrigin;

            this._setInterpolating();
        } else {
            this._setYaw(yaw);
            this._setPitch(pitch);

            this._setDistance(distance);

            this.origin = newOrigin;
        }
    }

    public onBeforeDraw(): void {
        if (this._isActive) {
            // Update camera matrix before drawing
            this._updateCamera()
        }
    }

    public onAfterDraw(): void {
    }

    public onBeforeDrawId(): void {
    }

    public onAfterDrawId(): void {
    }

    public onBeforeGetId(id: number): boolean {
        return false;
    }

    public onBeforePick(id: number): boolean {
        return false;
    }
}
