import { useEffect, useRef, useState } from "react";
import { vWorld, fWorld } from "./shaders/world";
import { initShaderProgram } from "./webgl";

import './World.css';
import { resizeCanvasToDisplaySize } from "./util";
import { mat4, vec3 } from "gl-matrix";
import { perlinNoise } from "./shaders/perlin";
import { diamond_square } from './noise/diamond_square';
import { perlin } from './noise/perlin';
import { vSkybox, fSkybox } from "./shaders/skybox";

function World() {

    const initialized = useRef(false);
    const glRef = useRef();

    const skyboxData = useRef({});
    const worldData = useRef({});

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

        initSkybox(gl);
        initWorld(gl);

        glRef.current = gl;
        drawScene();
        window.addEventListener("resize", handleResize);

        initialized.current = true;
    }

    function initSkybox(gl) {
        const program = initShaderProgram(gl, vSkybox, fSkybox);
        skyboxData.current.program = program;

        var positions = new Float32Array(
            [
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1
            ]);


        skyboxData.current.positionAttribLoc = gl.getAttribLocation(program, "a_position");
        skyboxData.current.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, skyboxData.current.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    }

    function initWorld(gl) {
        const program = initShaderProgram(gl, vWorld, perlinNoise + fWorld);
        worldData.current.program = program;

        const data = diamond_square(4, 4, 9);
        //const data = perlin(4, 7);

        worldData.current.positionAttribLoc = gl.getAttribLocation(program, "a_position");
        worldData.current.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, worldData.current.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.points), gl.STATIC_DRAW);

        worldData.current.normalAttribLoc = gl.getAttribLocation(program, "a_normal");
        worldData.current.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, worldData.current.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);

        worldData.current.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, worldData.current.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data.faces), gl.STATIC_DRAW);

        worldData.current.indexCount = data.faces.length;

        worldData.current.minY = data.minY;
        worldData.current.maxY = data.maxY;
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

        drawSkybox(gl);
        drawMap(gl);
    }

    function drawSkybox(gl) {

        const program = skyboxData.current.program;
        gl.useProgram(program);

        gl.enableVertexAttribArray(skyboxData.current.positionAttribLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, skyboxData.current.positionBuffer);
        gl.vertexAttribPointer(skyboxData.current.positionAttribLoc, 2, gl.FLOAT, false, 0, 0);

        gl.depthFunc(gl.LEQUAL);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawMap(gl) {

        const program = worldData.current.program;
        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        gl.enableVertexAttribArray(worldData.current.positionAttribLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, worldData.current.positionBuffer);
        gl.vertexAttribPointer(worldData.current.positionAttribLoc, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(worldData.current.normalAttribLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, worldData.current.normalBuffer);
        gl.vertexAttribPointer(worldData.current.normalAttribLoc, 3, gl.FLOAT, false, 0, 0);

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

        const uProjection = gl.getUniformLocation(program, "u_projection");
        gl.uniformMatrix4fv(uProjection, false, projectionMatrix);

        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, 0]);

        const uModelViewMatrix = gl.getUniformLocation(program, "u_modelViewMatrix");
        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        const uNormalMatric = gl.getUniformLocation(program, "u_normalMatrix");
        gl.uniformMatrix4fv(uNormalMatric, false, normalMatrix);

        const uBounds = gl.getUniformLocation(program, "u_bounds");
        gl.uniform2f(uBounds, worldData.current.minY, worldData.current.maxY);

        // bind the buffer containing the indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, worldData.current.indexBuffer);
        gl.drawElements(gl.TRIANGLES, worldData.current.indexCount, gl.UNSIGNED_INT, 0);
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

export default World;
