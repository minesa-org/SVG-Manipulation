const assert = require('assert');

function normalizeColor(color) {
  if (!color) return '';
  color = color.trim();
  if (color.startsWith('#')) {
    if (color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color.toLowerCase();
  }
  if (color.startsWith('rgb')) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) {
      const r = parseInt(m[1]);
      const g = parseInt(m[2]);
      const b = parseInt(m[3]);
      return ('#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)).toLowerCase();
    }
  }
  const named = {
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    white: '#ffffff',
    black: '#000000'
  };
  const lower = color.toLowerCase();
  if (named[lower]) return named[lower];
  return lower;
}

function updateSpriteColor(svgContent, oldColor, newColor) {
  const oldNorm = normalizeColor(oldColor);
  const newNorm = normalizeColor(newColor);
  return svgContent
    .replace(new RegExp(`fill=["']${oldNorm}["']`, 'gi'), `fill="${newNorm}"`)
    .replace(new RegExp(`stroke=["']${oldNorm}["']`, 'gi'), `stroke="${newNorm}"`)
    .replace(new RegExp(`fill:\s*${oldNorm}`, 'gi'), `fill: ${newNorm}`)
    .replace(new RegExp(`stroke:\s*${oldNorm}`, 'gi'), `stroke: ${newNorm}`);
}

function testNormalizeColor() {
  assert.strictEqual(normalizeColor('#fff'), '#ffffff');
  assert.strictEqual(normalizeColor('#FF0000'), '#ff0000');
  assert.strictEqual(normalizeColor('rgb(255,0,0)'), '#ff0000');
  assert.strictEqual(normalizeColor('red'), '#ff0000');
}

function testUpdateSpriteColor() {
  const original = '<svg><g id="sprite1"><path id="p1" fill="#ff0000" stroke="#00ff00" style="fill:#ff0000;stroke:#00ff00"></path></g></svg>';
  const updated = updateSpriteColor(original, '#ff0000', '#00ffff');
  assert.ok(updated.includes('fill="#00ffff"'));
  assert.ok(updated.includes('stroke="#00ff00"'));
  assert.ok(updated.includes('fill: #00ffff'));
}

function runTests() {
  testNormalizeColor();
  testUpdateSpriteColor();
  console.log('All tests passed');
}

runTests();
