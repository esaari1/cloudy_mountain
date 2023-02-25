export const vBasic = `
    attribute vec4 a_position;
    attribute vec3 a_normal;

    uniform mat4 u_projection;
    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_normalMatrix;
    uniform vec2 u_bounds;

    varying vec4 v_color;
    varying highp vec3 v_lighting;
    varying vec3 v_position;

    void main() {
        highp float color = (a_position.y - u_bounds.x) / (u_bounds.y - u_bounds.x);
        v_color = vec4(color, color, color, 1.0);
        gl_Position = u_projection * u_modelViewMatrix * a_position;

        highp vec3 directionalLightColor = vec3(1, 1, 1);
        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

        highp vec4 transformedNormal = u_normalMatrix * vec4(a_normal, 1.0);

        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        v_lighting = directionalLightColor * directional;
        v_position = a_position.xyz;
    }
`;

export const fBasic = `
    precision highp float;

    varying vec4 v_color;
    varying highp vec3 v_lighting;
    varying vec3 v_position;

    void main() {
        float c = pnoise(v_position, vec3(1.0, 0.0, 0.0));
        c = (c + 1.0) / 2.0;
        gl_FragColor = vec4(vec3(c, c, c) * v_lighting, 1.0);
    }
`;
