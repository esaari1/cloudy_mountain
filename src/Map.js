import { useEffect, useRef, useState } from "react";
import { fBasic, vBasic } from "./shaders/basic";
import { initShaderProgram } from "./webgl";

import './Map.css';
import { resizeCanvasToDisplaySize } from "./util";
import { mat4, vec3 } from "gl-matrix";
import { diamond_square } from "./diamond_square";
import { perlinNoise } from "./shaders/perlin";

function Map() {

    const initialized = useRef(false);
    const glRef = useRef();
    const program = useRef();
    const positionAttributeLocation = useRef();
    const normalAttributeLocation = useRef();
    const positionBuffer = useRef();
    const normalBuffer = useRef();
    const indexBuffer = useRef();
    const indexCount = useRef();
    const pointCount = useRef(0);

    const minY = useRef(0);
    const maxY = useRef(0);

    const [doRotate, setDoRotate] = useState(false);
    const [cameraPhi, setCameraPhi] = useState(0);
    const [cameraTheta, setCameraTheta] = useState(0);
    const [prevMouseX, setPrevMouseX] = useState(0);
    const [prevMouseY, setPrevMouseY] = useState(0);

    function handleResize() {
        drawScene();
    }

    useEffect(() => {
        initialize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (initialized.current) {
            drawScene();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraPhi, cameraTheta])

    function initialize() {
        const canvas = document.querySelector("#map");

        const gl = canvas.getContext("webgl");
        if (gl === null) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return;
        }

        gl.getExtension('OES_element_index_uint');

        program.current = initShaderProgram(gl, vBasic, perlinNoise + fBasic);

        const data = diamond_square(4, 4, 9);

        positionAttributeLocation.current = gl.getAttribLocation(program.current, "a_position");
        positionBuffer.current = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer.current);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.points), gl.STATIC_DRAW);

        normalAttributeLocation.current = gl.getAttribLocation(program.current, "a_normal");
        normalBuffer.current = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer.current);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);

        indexBuffer.current = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.current);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data.faces), gl.STATIC_DRAW);

        indexCount.current = data.faces.length;
        pointCount.current = data.points.length / 3;

        minY.current = data.minY;
        maxY.current = data.maxY;

        glRef.current = gl;
        drawScene();
        window.addEventListener("resize", handleResize);

        initialized.current = true;
    }

    function drawScene() {

        const gl = glRef.current;

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program.current);

        gl.enableVertexAttribArray(positionAttributeLocation.current);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer.current);
        gl.vertexAttribPointer(positionAttributeLocation.current, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(normalAttributeLocation.current);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer.current);
        gl.vertexAttribPointer(normalAttributeLocation.current, 3, gl.FLOAT, false, 0, 0);

        const fieldOfView = (45 * Math.PI) / 180; // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.0001;
        const zFar = 1000.0;
        const projectionMatrix = mat4.create();

        // note: glmatrix.js always has the first argument
        // as the destination to receive the result.
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

        const camera = cameraMatrix();
        mat4.multiply(projectionMatrix, projectionMatrix, camera);

        const uProjection = gl.getUniformLocation(program.current, "u_projection");
        gl.uniformMatrix4fv(uProjection, false, projectionMatrix);

        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, 0]);

        const uModelViewMatrix = gl.getUniformLocation(program.current, "u_modelViewMatrix");
        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        const uNormalMatric = gl.getUniformLocation(program.current, "u_normalMatrix");
        gl.uniformMatrix4fv(uNormalMatric, false, normalMatrix);

        const uBounds = gl.getUniformLocation(program.current, "u_bounds");
        gl.uniform2f(uBounds, minY.current, maxY.current);

        //gl.drawArrays(gl.TRIANGLES, 0, pointCount.current);

        // bind the buffer containing the indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.current);
        gl.drawElements(gl.TRIANGLES, indexCount.current, gl.UNSIGNED_INT, 0);

        glRef.current = gl;
    }

    function cameraMatrix() {
        const eye = vec3.fromValues(0, 0, 5);
        vec3.rotateX(eye, eye, [0, 0, 0], cameraTheta);
        vec3.rotateY(eye, eye, [0, 0, 0], cameraPhi);

        const eyeN = vec3.create();
        vec3.normalize(eyeN, eye);

        const x = vec3.create();
        vec3.cross(x, [0, 1, 0], eyeN);

        const up = vec3.create();
        vec3.cross(up, eyeN, x);
        vec3.normalize(up, up);

        const m = mat4.create();
        mat4.lookAt(m, eye, [0, 0, 0], up);
        //mat4.invert(m, m);
        return m;
    }

    const handleStartRotate = (evt) => {
        setPrevMouseX(evt.clientX);
        setPrevMouseY(evt.clientY);
        setDoRotate(true);
    }

    const handleStopRotate = () => {
        setDoRotate(false);
    }

    const handleRotate = (evt) => {
        if (doRotate) {
            const deltaX = evt.clientX - prevMouseX;
            setCameraPhi(prev => prev - deltaX * 0.01);
            setPrevMouseX(evt.clientX);

            const deltaY = evt.clientY - prevMouseY;
            setCameraTheta(prev => prev - deltaY * 0.01);
            setPrevMouseY(evt.clientY);
        }
    }

    return (
        <canvas id="map" width="800" height="600"
            onMouseDown={handleStartRotate}
            onMouseUp={handleStopRotate}
            onMouseMove={handleRotate}></canvas>
    )
}

export default Map;
