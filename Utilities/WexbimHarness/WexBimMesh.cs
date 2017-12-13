﻿using SharpDX;
using System;
using System.Collections.Generic;

namespace AimViewModels.Shared.Helpers
{
    public delegate int ReadIndex(byte[] array, int offset);
    
    public class WexBimMesh
    {
        private byte[] _array;
        const int VersionPos = 0;
        const int VertexCountPos = VersionPos + sizeof(byte);
        const int TriangleCountPos = VertexCountPos + sizeof(int);
        const int VertexPos = TriangleCountPos + sizeof(int);
        public WexBimMesh(byte[] meshData)
        {
            _array = meshData;
        }

        public byte Version => _array[VersionPos];
        public int VertexCount => BitConverter.ToInt32(_array, VertexCountPos);
        public int TriangleCount => BitConverter.ToInt32(_array, TriangleCountPos);
        public int FaceCount
        {
            get
            {
                var faceCountPos = VertexPos + (VertexCount * 3 * sizeof(float));
                return BitConverter.ToInt32(_array, faceCountPos);
            }
        }
        public int Length => _array.Length;
        public byte[] ToByteArray() => _array;
        public IEnumerable<Vector3> Vertices
        {
            get
            {
                const int offsetY = sizeof(float);
                const int offsetZ = 2*sizeof(float);
                for (int i = 0; i < VertexCount; i++)
                {
                    var p = VertexPos + (i * 3 * sizeof(float));
                    yield return new Vector3(BitConverter.ToSingle(_array,p), BitConverter.ToSingle(_array, p+offsetY), BitConverter.ToSingle(_array, p+offsetZ));
                } 
            }
        }

        public IEnumerable<WexBimMeshFace> Faces
        {
            get
            {
                var faceOffset =  VertexPos + (VertexCount * 3 * sizeof(float)) + sizeof(int);//start of vertices * space taken by vertices + the number of faces
                ReadIndex readIndex;
                int sizeofIndex;
                if (VertexCount <= 0xFF)
                {
                    readIndex = (array, offset) => array[offset];
                    sizeofIndex = sizeof(byte);
                }
                else if (VertexCount <= 0xFFFF)
                {
                    readIndex = (array, offset) => BitConverter.ToInt16(array, offset);
                    sizeofIndex = sizeof(short);
                }
                else
                {
                    readIndex = (array, offset) => BitConverter.ToInt32(array, offset);
                    sizeofIndex = sizeof(int);
                }
                for (int i = 0; i < FaceCount; i++)
                {
                    var face = new WexBimMeshFace(readIndex, sizeofIndex, _array, faceOffset);
                    faceOffset += face.ByteSize;
                    yield return face;
                }
            }
        }    
    }

    public class WexBimMeshFace
    {
        private byte[] _array;
        private int _offsetStart;
        private ReadIndex _readIndex;
        private int _sizeofIndex;

        internal WexBimMeshFace(ReadIndex readIndex, int sizeofIndex,  byte[] array, int faceOffset)
        {
            _readIndex = readIndex;
            _array = array;
            _offsetStart = faceOffset;
            _sizeofIndex = sizeofIndex;
        }
        public int ByteSize
        {
            get
            {
                if (IsPlanar)
                    return sizeof(int) + 2 + (TriangleCount * 3 * _sizeofIndex); // trianglecount+ normal in 2 bytes + triangulation with no normals
                else
                    return sizeof(int) + (TriangleCount * 3 * (_sizeofIndex + 2)); //trianglecount+ normal  + triangulation with normals in 2 bytes
            }
        }
        public int TriangleCount => Math.Abs(BitConverter.ToInt32(_array, _offsetStart));
        public bool IsPlanar => BitConverter.ToInt32(_array, _offsetStart)>0;
        public IEnumerable<int> Indices
        {
            get
            {
               
                if(IsPlanar)
                {
                    var indexOffset = _offsetStart + sizeof(int)+2; //offset + trianglecount + packed normal of plane in the 2 bytes
                    var indexSpan = 3 * _sizeofIndex;
                    for (int i = 0; i < TriangleCount; i++)
                    {
                        for (int j = 0; j < 3; j++)
                        {
                            yield return _readIndex(_array, indexOffset + (j*_sizeofIndex)); //skip the normal in the 2 bytes
                        }
                        indexOffset += indexSpan; 
                    }
                }
                else
                {
                    var indexOffset = _offsetStart + sizeof(int); //offset + trianglecount
                    var indexSpan = _sizeofIndex + 2; //index  + normal in 2 bytes
                    var triangleSpan = 3 * indexSpan; 
                    
                    for (int i = 0; i < TriangleCount; i++)
                    {                       
                        for (int j = 0; j < 3; j++)
                        {
                            yield return _readIndex(_array, indexOffset + (j * indexSpan));
                        }
                        indexOffset += triangleSpan;
                    }
                }
            }
        }

        /// <summary>
        /// returns the normal for a specific point at a specific index on the face
        /// </summary>
        /// <param name="index"></param>
        /// <returns></returns>
        public Vector3 NormalAt(int index)
        {
            var indexOffset = _offsetStart + sizeof(int); //offset + trianglecount
            if (IsPlanar) //no matter what you send in for the index you will get the same value because it is planar
            {
                var u = _array[indexOffset];
                var v = _array[indexOffset + 1];
                Vector3 normVec;
                SharpDxHelper.Vector3(u, v, out normVec);
                return normVec;
            }
            else
            {
                var indexSpan = _sizeofIndex + 2;
                int normalOffset = indexOffset +( index * indexSpan)+ _sizeofIndex;              
                var u = _array[normalOffset];
                var v = _array[normalOffset + 1];
                Vector3 normVec;
                SharpDxHelper.Vector3(u, v, out normVec);
               return normVec;
            }
        }
        public IEnumerable<Vector3> Normals
        {
            get
            {
                var indexOffset = _offsetStart + sizeof(int); //offset + trianglecount
                if (IsPlanar)
                {
                    var u = _array[indexOffset];
                    var v = _array[indexOffset + 1];
                    Vector3 normVec;
                    SharpDxHelper.Vector3(u, v, out normVec);
                    yield return normVec;
                }
                else
                {
                    var indexSpan = _sizeofIndex + 2;
                    var triangleSpan = 3 * indexSpan;
                    var normalOffset = indexOffset + _sizeofIndex;                           
                    for (int i = 0; i < TriangleCount; i++)
                    {                       
                        for (int j = 0; j < 3; j++)
                        {
                            var u = _array[normalOffset + (j * indexSpan)];
                            var v = _array[normalOffset + (j * indexSpan) + 1];
                            Vector3 normVec;
                            SharpDxHelper.Vector3(u, v, out normVec);
                            yield return normVec;
                        }
                        normalOffset += triangleSpan;
                    }
                }
            }
        }
    }
}