/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
// testing map-types.ts isometric coordinate math
const mapTypes = require('$:/plugins/linonetwo/digital-garden/types/map-types.js');

describe('isometric coordinate math', function() {
  const tileWidth = 64; // Example tile width, so halfW = 32, halfH = 16

  it('tileToScreen converts (0,0) to origin', function() {
    const res = mapTypes.tileToScreen(0, 0, tileWidth);
    expect(res).toEqual({ x: 0, y: 0 });
  });

  it('tileToScreen converts (1,0) to correct isometric offset', function() {
    const res = mapTypes.tileToScreen(1, 0, tileWidth);
    expect(res).toEqual({ x: 32, y: 16 });
  });

  it('tileToScreen converts (0,1) to correct isometric offset', function() {
    const res = mapTypes.tileToScreen(0, 1, tileWidth);
    expect(res).toEqual({ x: -32, y: 16 });
  });

  it('tileToScreen converts (1,1) downward', function() {
    const res = mapTypes.tileToScreen(1, 1, tileWidth);
    expect(res).toEqual({ x: 0, y: 32 });
  });

  it('screenToTile converts origin to (0,0)', function() {
    const res = mapTypes.screenToTile(0, 0, tileWidth);
    expect(res).toEqual({ tileX: 0, tileY: 0 });
  });

  it('screenToTile converts screen point back to (1,0)', function() {
    const res = mapTypes.screenToTile(32, 16, tileWidth);
    expect(res).toEqual({ tileX: 1, tileY: 0 });
  });

  it('screenToTile rounds to nearest tile', function() {
    const res = mapTypes.screenToTile(30, 15, tileWidth); // almost 32, 16
    expect(res).toEqual({ tileX: 1, tileY: 0 });
  });

  it('is consistent in round-tripping', function() {
    const tx = 5;
    const ty = -3;
    const screen = mapTypes.tileToScreen(tx, ty, tileWidth);
    const tile = mapTypes.screenToTile(screen.x, screen.y, tileWidth);
    expect(tile).toEqual({ tileX: tx, tileY: ty });
  });
});
