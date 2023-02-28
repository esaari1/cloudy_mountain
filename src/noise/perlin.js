import { vec3 } from "gl-matrix";

function mod289(x) {
    return subtractV(x, multiply(floor(multiply(x, 1.0 / 289.0)), 289.0));
}

function permute(x) {
    return mod289(multiplyV(add(multiply(x, 34.0), 10.0), x));
}

function taylorInvSqrt(r) {
    const v = new Array(r.length).fill(1.79284291400159);
    return subtractV(v, multiply(r, 0.85373472095314));
}

function fade(t) {
    return multiplyV(t, multiplyV(t, multiplyV(t, add(multiplyV(t, add(multiply(t, 6.0), -15.0)), 10.0))));
}

function step(edge, x) {
    const res = [];
    for (let i = 0; i < edge.length; i++) {
        if (x[i] < edge[i]) {
            res.push(0.0);
        } else {
            res.push(1.0);
        }
    }
    return res;
}

function mix(v1, v2, val) {
    const res = [];
    for (let i = 0; i < v1.length; i++) {
        res.push(v1[i] + (v2[i] - v1[i]) * val);
    }
    return res;
}

function dot(v1, v2) {
    let res = 0;
    for (let i = 0; i < v1.length; i++) {
        res += v1[i] * v2[i];
    }
    return res;
}

function floor(v) {
    return v.map(i => Math.floor(i));
}

function add(v1, val) {
    return v1.map(i => i + val);
}

function abs(v) {
    return v.map(i => Math.abs(i));
}

function multiply(v1, val) {
    return v1.map(i => i * val);
}

function fract(v) {
    return v.map(i => i - Math.floor(i));
}

function addV(v1, v2) {
    const res = [];
    for (let i = 0; i < v1.length; i++) {
        res.push(v1[i] + v2[i]);
    }
    return res;
}

function subtractV(v1, v2) {
    const res = [];
    for (let i = 0; i < v1.length; i++) {
        res.push(v1[i] - v2[i]);
    }
    return res;
}

function multiplyV(v1, v2) {
    const res = [];
    for (let i = 0; i < v1.length; i++) {
        res.push(v1[i] * v2[i]);
    }
    return res;
}

function cnoise(P) {
    let Pi0 = floor(P);
    let Pi1 = add(Pi0, 1);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    const Pf0 = fract(P); // Fractional part for interpolation
    const Pf1 = add(Pf0, -1); // Fractional part - 1.0
    const ix = [Pi0[0], Pi1[0], Pi0[0], Pi1[0]];
    const iy = [Pi0[1], Pi0[1], Pi1[1], Pi1[1]]
    const iz0 = [Pi0[2], Pi0[2], Pi0[2], Pi0[2]];
    const iz1 = [Pi1[2], Pi1[2], Pi1[2], Pi1[2]];

    const ixy = permute(addV(permute(ix), iy));
    const ixy0 = permute(addV(ixy, iz0));
    const ixy1 = permute(addV(ixy, iz1));

    let gx0 = multiply(ixy0, (1.0 / 7.0));
    let gy0 = add(fract(multiply(floor(gx0), (1.0 / 7.0))), -0.5);
    gx0 = fract(gx0);
    let gz0 = subtractV([0.5, 0.5, 0.5, 0.5], abs(gx0));
    gz0 = subtractV(gz0, abs(gy0));
    const sz0 = step(gz0, [0, 0, 0, 0]);
    gx0 = subtractV(gx0, add(multiplyV(sz0, step([0, 0, 0, 0], gx0)), -0.5));
    gy0 = subtractV(gy0, add(multiplyV(sz0, step([0, 0, 0, 0], gy0)), -0.5));

    let gx1 = multiply(ixy1, 1.0 / 7.0);
    let gy1 = add(fract(multiply(floor(gx1), 1.0 / 7.0)), -0.5);
    gx1 = fract(gx1);
    let gz1 = subtractV([0.5, 0.5, 0.5, 0.5], abs(gx1));
    gz1 = subtractV(gz1, abs(gy1));
    const sz1 = step(gz1, [0, 0, 0, 0]);
    gx1 = subtractV(gx1, add(multiplyV(sz1, step([0, 0, 0, 0], gx1)), -0.5));
    gy1 = subtractV(gy1, add(multiplyV(sz1, step([0, 0, 0, 0], gy1)), -0.5));

    let g000 = [gx0[0], gy0[0], gz0[0]];
    let g100 = [gx0[1], gy0[1], gz0[1]];
    let g010 = [gx0[2], gy0[2], gz0[2]];
    let g110 = [gx0[3], gy0[3], gz0[3]];
    let g001 = [gx1[0], gy1[0], gz1[0]];
    let g101 = [gx1[1], gy1[1], gz1[1]];
    let g011 = [gx1[2], gy1[2], gz1[2]];
    let g111 = [gx1[3], gy1[3], gz1[3]];

    const norm0 = taylorInvSqrt([dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)]);
    g000 = multiply(g000, norm0[0]);
    g010 = multiply(g010, norm0[1]);
    g100 = multiply(g100, norm0[2]);
    g110 = multiply(g110, norm0[3]);

    const norm1 = taylorInvSqrt([dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)]);
    g001 = multiply(g001, norm1[0]);
    g011 = multiply(g011, norm1[1]);
    g101 = multiply(g101, norm1[2]);
    g111 = multiply(g111, norm1[3]);

    const n000 = dot(g000, Pf0);
    const n100 = dot(g100, [Pf1[0], Pf0[1], Pf0[2]]);
    const n010 = dot(g010, [Pf0[0], Pf1[1], Pf0[2]]);
    const n110 = dot(g110, [Pf1[0], Pf1[1], Pf0[2]]);
    const n001 = dot(g001, [Pf0[0], Pf0[1], Pf1[2]]);
    const n101 = dot(g101, [Pf1[0], Pf0[1], Pf1[2]]);
    const n011 = dot(g011, [Pf0[0], Pf1[1], Pf1[2]]);
    const n111 = dot(g111, Pf1);

    const fade_xyz = fade(Pf0);
    const n_z = mix([n000, n100, n010, n110], [n001, n101, n011, n111], fade_xyz[2]);
    const n_yz = mix([n_z[0], n_z[1]], [n_z[2], n_z[3]], fade_xyz[1]);
    const n_xyz = mix([n_yz[0]], [n_yz[1]], fade_xyz[0])[0];

    return 2.2 * n_xyz;
}

export function perlin(size, detail) {
    const step = Math.pow(2, detail) + 1;

    const heights = new Array(step);
    for (let i = 0; i < step; i++) {
        heights[i] = new Array(step).fill(0);
    }

    const startX = -size / 2;
    const endX = startX + size;
    const startY = -size / 2;
    const endY = startY + size;
    const points = [];

    let minY = 1000;
    let maxY = -1000;

    const oct = 10;
    const lac = 2;
    const pers = 0.35;
    const scale = 2;
    const offset = new Date().getMilliseconds();

    for (let y = 0; y < step; y++) {
        const posY = startY + (endY - startY) * (y / (step - 1));

        for (let x = 0; x < step; x++) {
            const posX = startX + (endX - startX) * (x / (step - 1));
            //const h = cnoise([posX * scale, posY * scale, offset]);
            const h = fractalNoise(posX, posY, oct,lac, pers, scale, offset);

            points.push(posX, h, posY);
            if (minY > h) {
                minY = h;
            }
            if (maxY < h) {
                maxY = h;
            }
        }
    }

    const faces = [];
    const normals = new Array(points.length);

    for (let y = 0; y < step - 1; y++) {
        for (let x = 0; x < step - 1; x++) {
            const baseX = x + (step * y);
            faces.push(baseX, baseX + step, baseX + step + 1, baseX, baseX + step + 1, baseX + 1);
            calculateNormal(points, normals, baseX, baseX + step, baseX + step + 1);
        }
    }

    return { points, faces, normals, minY, maxY };
}

function calculateNormal(points, normals, i1, i2, i3) {
    const p1 = vec3.fromValues(points[i1 * 3], points[i1 * 3 + 1], points[i1 * 3 + 2]);
    const p2 = vec3.fromValues(points[i2 * 3], points[i2 * 3 + 1], points[i2 * 3 + 2]);
    const p3 = vec3.fromValues(points[i3 * 3], points[i3 * 3 + 1], points[i3 * 3 + 2]);

    const p2p1 = vec3.create();
    vec3.subtract(p2p1, p2, p1);
    vec3.normalize(p2p1, p2p1);

    const p3p1 = vec3.create();
    vec3.subtract(p3p1, p3, p1);
    vec3.normalize(p3p1, p3p1);

    const normal = vec3.create();
    vec3.cross(normal, p2p1, p3p1);
    vec3.normalize(normal, normal);

    for (let i = 0; i < 3; i++) {
        normals[i1 * 3 + i] = normals[i2 * 3 + i] = normals[i3 * 3 + i] = normal[i];
    }
}

export function fractalNoise(x, y, octaves, lacunarity, persistence, scale, seed) {
    let value = 0;

    let x1 = x;
    let y1 = y;

	let amplitude = 1;

    for (let i = 0; i < octaves; i++) {
        value += cnoise([x1 / scale, y1 / scale, seed]) * amplitude;

        y1 *= lacunarity;
        x1 *= lacunarity;

        amplitude *= persistence;
    }

    value = Math.max(-1, value);
    value = Math.min(1, value);
    return value;
}
