export function create(this: Phaser.Scene) {
  const level = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 2, 3, 0, 0, 0, 1, 2, 3, 0],
    [0, 5, 6, 7, 0, 0, 0, 5, 6, 7, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 14, 13, 14, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 14, 14, 14, 14, 14, 0, 0, 0, 15],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15],
    [35, 36, 37, 0, 0, 0, 0, 0, 15, 15, 15],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
  ];

  // this.add.image(100, 100, 'body-female');
  const map = this.make.tilemap({ data: level, tileWidth: 43, tileHeight: 43 });
  const tiles = map.addTilesetImage('human/body-female.png')!;
  map.createLayer(0, tiles, 0, 0);
}
