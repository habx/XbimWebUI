import { IPlugin, Viewer } from "../../viewer";
import { mat4 } from "../../matrix/mat4";
import { vec3 } from "../../matrix/vec3";


const getBboxTriangles = bbox => {
  const points = [
    [
      bbox[0],
      bbox[1],
      bbox[2],
    ],
    [
      bbox[0] + bbox[3],
      bbox[1],
      bbox[2],
    ],
    [
      bbox[0] + bbox[3],
      bbox[1] + bbox[4],
      bbox[2],
    ],
    [
      bbox[0],
      bbox[1] + bbox[4],
      bbox[2],
    ],

    [
      bbox[0],
      bbox[1],
      bbox[2] + bbox[5],
    ],
    [
      bbox[0] + bbox[3],
      bbox[1],
      bbox[2] + bbox[5],
    ],
    [
      bbox[0] + bbox[3],
      bbox[1] + bbox[4],
      bbox[2] + bbox[5],
    ],
    [
      bbox[0],
      bbox[1] + bbox[4],
      bbox[2] + bbox[5],
    ],
  ]

  const triangles = [
    // Left
    [points[0], points[1], points[2]],
    [points[0], points[2], points[3]],

    // Back
    [points[0], points[7], points[4]],
    [points[0], points[3], points[7]],

    // Right
    [points[4], points[6], points[5]],
    [points[4], points[7], points[6]],

    // Front
    [points[5], points[2], points[1]],
    [points[5], points[6], points[2]],

    // Top
    [points[2], points[6], points[7]],
    [points[2], points[7], points[3]],

    // Bottom
    [points[1], points[4], points[5]],
    [points[1], points[0], points[4]],
  ]

  return triangles
}

export class RayPicking implements IPlugin {
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
  constructor() {
  }

  private _initialized: boolean = false;

  public accurate: boolean = true;

  private viewer: Viewer;

  public init(viewer: Viewer) {
    var self = this;
    this.viewer = viewer;
    var gl = this.viewer.gl;

    this._initialized = true;
    this._frameNb = 0;
    this._hitFrameNb = null;
    this._hitProduct = null;
    this._hitHandle = null;

    this._originalGetID = viewer['getID'].bind(viewer);
    viewer['getID'] = this.getID.bind(this);
  }

  private getID(x, y, modelId: boolean = false) {
    // Do picking only if it wasn't already done this frame
    if (this._hitFrameNb !== this._frameNb) {
      this._hitFrameNb = this._frameNb;
      this._hitProduct = null;
      this._hitHandle = null;

      const viewer = this.viewer;
      const pickableProducts = viewer._pickableProducts;

      const picked = [];

      const ray = this._screenToWorldRay(x, y);

      if (!ray) {
        return null;
      }

      let distance = Infinity;

      viewer._handles.forEach((handle) => {
        if (!handle.stopped && handle.pickable) {
          if (!pickableProducts || !pickableProducts.length) {
            // TODO (but probably not worth it, iterating on thousands of products, performance would probably be awful?)
          } else {
            pickableProducts.forEach(productId => {
              const product = handle.getProductMap(productId);

              const bbox = product.bBox;
              const triangles = getBboxTriangles(bbox);

              let hit = false;

              // first see if the rays intersect with the bbox of the element (only 12 triangle)
              triangles.forEach(triangle => {
                const triangleHit = this._rayHitsTriangle(ray, triangle);

                if (triangleHit !== false) {
                  hit = true;

                  if (!this.accurate && triangleHit < distance) {
                    distance = triangleHit;
                    this._hitProduct = product;
                    this._hitHandle = handle;
                  }
                }
              })

              // if bbox was hit there is a chance the geometry of the element will intersect with the
              // ray. Let's try each triangle of the geometry
              if (this.accurate && hit) {
                const spans = product.spans;

                hit = false;

                spans.forEach(([begin, end]) => {
                  for(var i = begin; i < end; i += 3) {
                    const triangle = [
                      [
                        handle.model.vertices[3 * i],
                        handle.model.vertices[3 * i + 1],
                        handle.model.vertices[3 * i + 2],
                      ],
                      [
                        handle.model.vertices[3 * i + 3],
                        handle.model.vertices[3 * i + 4],
                        handle.model.vertices[3 * i + 5],
                      ],
                      [
                        handle.model.vertices[3 * i + 6],
                        handle.model.vertices[3 * i + 7],
                        handle.model.vertices[3 * i + 8],
                      ],
                    ];

                    const triangleHit = this._rayHitsTriangle(ray, triangle);

                    // If we found a hit, see its distance to the camera. We keep the shortest distance
                    // in order to find the first hit object
                    if (triangleHit !== false) {
                      hit = true;

                      if (triangleHit < distance) {
                        distance = triangleHit;
                        this._hitProduct = product;
                        this._hitHandle = handle;
                      }
                    }
                  }
                })
              }
            })
          }
        }
      });
    }

    if (!modelId && this._hitProduct) {
      return this._hitProduct.renderId;
    } else if (modelId) {
      return (this._hitHandle && this._hitHandle.id) || undefined;
    }

    return null;
  }

  private _rayHitsTriangle(ray, triangle) {
    const EPSILON = 0.00001;

    const v0 = triangle[0];
    const v1 = triangle[1];
    const v2 = triangle[2];

    const edge1 = vec3.sub(vec3.create(), v1, v0);
    const edge2 = vec3.sub(vec3.create(), v2, v0);

    const pvec = vec3.cross(vec3.create(), ray.direction, edge2);
    const dot = vec3.dot(edge1, pvec);


    if (dot > -EPSILON && dot < EPSILON)
      return false;

    const invDot = 1.0 / dot;

    const tvec = vec3.sub(vec3.create(), ray.origin, v0);
    const u = vec3.dot(tvec, pvec) * invDot;

    if (u < 0.0 || u > 1.0)
      return false;

    const qvec = vec3.cross(vec3.create(), tvec, edge1);
    const v = vec3.dot(ray.direction, qvec) * invDot;

    if (v < 0.0 || u + v > 1.0)
      return false;

    const t = vec3.dot(edge2, qvec) * invDot;

    if (t > 0) {
      return t;
    }

    return false;
  }

  private _screenToWorldRay(x, y) {
    const viewer = this.viewer;

    const width = viewer._width;
    const height = viewer._height;

    const unprojectedPosition = this._unproject(
      (2 * x / width) - 1,
      (2 * y / height) - 1,
      viewer.mvMatrix,
      viewer._pMatrix,
      [-1.0, -1.0, 2.0, 2.0]
    );

    if (!unprojectedPosition) {
      return null;
    }

    const rayOriginPosition = viewer.getCameraPosition()

    const rayDirection = vec3.normalize(
      vec3.create(),
      vec3.sub(
        vec3.create(),
        unprojectedPosition,
        rayOriginPosition,
      )
    );

    return {
      origin: rayOriginPosition,
      direction: rayDirection,
    }
  }

  private _unproject(x, y, view, proj, viewport) {
    const inverse = mat4.invert(mat4.create(), mat4.mul(mat4.create(), proj, view));

    if (!inverse) {
      return null;
    }
           
    const tmp = [x, y, 1.0, 1.0];
    tmp[0] = (tmp[0] - viewport[0]) / viewport[2];
    tmp[1] = (tmp[1] - viewport[1]) / viewport[3];

    tmp[0] = (tmp[0] * 2) - 1;
    tmp[1] = (tmp[1] * 2) - 1;
    tmp[2] = (tmp[2] * 2) - 1;
    tmp[3] = (tmp[3] * 2) - 1;

    const obj = this._vec4TransformMat4([], tmp, inverse)

    obj[0] = obj[0] / obj[3]
    obj[1] = obj[1] / obj[3]
    obj[2] = obj[2] / obj[3]
    obj[3] = obj[3] / obj[3]

    return vec3.copy(vec3.create(), obj)
  }

  private _vec4TransformMat4(out, a, m) {
    let x = a[0], y = a[1], z = a[2], w = a[3];

    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;

    return out;
  }

  public onBeforeDraw() {
    this._frameNb++;
  }
  public onBeforePick(id: number) { return false; }

  public onAfterDraw() { }

  public onBeforeDrawId() { }

  public onAfterDrawId() { }

  public onBeforeGetId(id: number) { return false; }
}
