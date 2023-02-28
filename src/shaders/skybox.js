export const vSkybox = `
    attribute vec4 a_position;

    void main() {
        gl_Position = a_position;
        gl_Position.z = 1.0;
    }
`;

export const fSkybox = `
    precision mediump float;

    void main() {
        gl_FragColor = vec4(0.53, 0.81, 0.92, 1.0);
    }
`;
