import assert from "node:assert/strict";

function viewportPointToPdf(transform, x, y) {
  const [a, b, c, d, e, f] = transform;
  const determinant = a * d - b * c;
  const dx = x - e;
  const dy = y - f;
  return {
    x: (d * dx - c * dy) / determinant,
    y: (-b * dx + a * dy) / determinant,
  };
}

function pdfPointToViewport(transform, x, y) {
  const [a, b, c, d, e, f] = transform;
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function rotateVector(x, y, degrees) {
  const r = degrees * Math.PI / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}
function rotatePoint(p, c, degrees) {
  const q = rotateVector(p.x - c.x, p.y - c.y, degrees);
  return { x: c.x + q.x, y: c.y + q.y };
}

function testLogo(transform, rotation) {
  const viewport = { width: 640, height: 920, transform };
  const placement = { x: .21, y: .31, width: .27 };
  const aspect = 2.4;
  const w = placement.width * viewport.width;
  const h = w / aspect;
  const left = placement.x * viewport.width;
  const top = placement.y * viewport.height;
  const center = { x: left + w / 2, y: top + h / 2 };
  const desiredBL = rotatePoint({ x: left, y: top + h }, center, rotation);
  const desiredBR = rotatePoint({ x: left + w, y: top + h }, center, rotation);
  const desiredTL = rotatePoint({ x: left, y: top }, center, rotation);

  const bl = viewportPointToPdf(transform, desiredBL.x, desiredBL.y);
  const br = viewportPointToPdf(transform, desiredBR.x, desiredBR.y);
  const tl = viewportPointToPdf(transform, desiredTL.x, desiredTL.y);
  const width = distance(bl, br);
  const height = distance(bl, tl);
  const angle = Math.atan2(br.y - bl.y, br.x - bl.x);
  const reconstructedBR = { x: bl.x + width * Math.cos(angle), y: bl.y + width * Math.sin(angle) };
  const reconstructedTL = { x: bl.x - height * Math.sin(angle), y: bl.y + height * Math.cos(angle) };
  const visibleBR = pdfPointToViewport(transform, reconstructedBR.x, reconstructedBR.y);
  const visibleTL = pdfPointToViewport(transform, reconstructedTL.x, reconstructedTL.y);

  assert.ok(distance(visibleBR, desiredBR) < 1e-8);
  assert.ok(distance(visibleTL, desiredTL) < 1e-8);
}

// Orthogonal PDF.js-like transforms: 0/90/180/270, translated crop origins and scaled UserUnit.
const transforms = [
  [1, 0, 0, -1, -30, 780],
  [0, 1, 1, 0, -40, -25],
  [-1, 0, 0, 1, 710, -50],
  [0, -2, -2, 0, 1600, 1300],
];
for (const transform of transforms) {
  for (const rotation of [-180, -90, -33, 0, 45, 90, 179]) testLogo(transform, rotation);
}

console.log("Geometry tests passed: CropBox/translation, page rotation, UserUnit scaling and element rotation.");
