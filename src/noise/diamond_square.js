import { vec3 } from "gl-matrix";

export function diamond_square(sizeX, sizeY, detail = 9) {
    const step = Math.pow(2, detail) + 1;
    const max = step - 1;

    const heights = new Array(step);
    for (let i = 0; i < step; i++) {
        heights[i] = new Array(step).fill(0);
    }

    // heights[0][0] = 1;
    // heights[max][0] = 1;
    // heights[max][max] = 1;
    // heights[0][max] = 1;

    divide(heights, max, max);

    const startX = -sizeX / 2;
    const endX = startX + sizeX;
    const startY = -sizeY / 2;
    const endY = startY + sizeY;
    const points = [];

    let minY = 1000;
    let maxY = -1000;

    for (let y = 0; y < step; y++) {
        const posY = startY + (endY - startY) * (y / (step - 1));

        for (let x = 0; x < step; x++) {
            const posX = startX + (endX - startX) * (x / (step - 1));

            points.push(posX, heights[x][y], posY);
            if (minY > heights[x][y]) {
                minY = heights[x][y];
            }
            if (maxY < heights[x][y]) {
                maxY = heights[x][y];
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

function divide(heights, size, max) {
    const roughness = 0.001;
    var x, y, half = size / 2;
    var scale = roughness * size;
    if (half < 1) return;

    for (y = half; y < max; y += size) {
        for (x = half; x < max; x += size) {
            square(heights, x, y, half, Math.random() * scale * 2 - scale, max);
        }
    }
    for (y = 0; y <= max; y += half) {
        for (x = (y + half) % size; x <= max; x += size) {
            diamond(heights, x, y, half, Math.random() * scale * 2 - scale, max);
        }
    }
    divide(heights, size / 2, max);
}

function getHeight(heights, x, y, max) {
    if (x < 0 || x > max || y < 0 || y > max) return -1;
    return heights[x][y];
}

function square(heights, x, y, size, offset, max) {
    var ave = average([
        getHeight(heights, x - size, y - size, max),   // upper left
        getHeight(heights, x + size, y - size, max),   // upper right
        getHeight(heights, x + size, y + size, max),   // lower right
        getHeight(heights, x - size, y + size, max)    // lower left
    ]);

    heights[x][y] = ave + offset;
}

function diamond(heights, x, y, size, offset, max) {
    var ave = average([
        getHeight(heights, x, y - size, max),
        getHeight(heights, x + size, y, max),
        getHeight(heights, x, y + size, max),
        getHeight(heights, x - size, y, max)
    ]);

    heights[x][y] = ave + offset;
}

function average(values) {
    var valid = values.filter(function (val) { return val !== -1; });
    var total = valid.reduce(function (sum, val) { return sum + val; }, 0);
    return total / valid.length;
}
