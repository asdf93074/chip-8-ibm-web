const memory = new Uint8Array(4096);
const display = [];
let pc;
let ir;
const stack = new Uint8Array(16);
let delayTimer = 0;
let soundTimer = 0;
const registers = new Uint8Array(16);
const hz = 1000/60;

const fontDataStart = 0x50;
const fontDataEnd = 0xA0;
const programStart = 0x200;
let programLength = 0;

// initialize display
for (let i = 0; i < 32; i++) {
  display[i] = [];
  for (let j = 0; j < 64; j++) {
    display[i][j] = 0;
  }
}

// set font data in memory
const fontData = [
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80  // F
];

// set font data in memory
fontData.forEach((data, index) => {
  memory[index + fontDataStart] = data;
});

// decrement timer at 60Hz
setInterval(() => {
  if (delayTimer > 0) {
    delayTimer--;
  }
  if (soundTimer > 0) {
    soundTimer--;
  }
}, hz);

// load program into memory
function loadProgram(program) {
  programLength = program.length;
  program.forEach((data, index) => {
    memory[index + 0x200] = data;
  });
  pc = programStart;
}

// draw sprite
function drawSprite(X, Y, N) {
  console.log('drawing');
  
  let yCoord = registers[Y] % 32;

  for (let i = 0; i < N; i++) {
    const sprite = memory[ir + i];
    let xCoord = registers[X] % 64;

    for (let j = 0; j < 8; j++) {
      if (xCoord > 63) {
        break;
      }

      const pixel = sprite & (0x80 >> j);

      if (pixel) {
        display[yCoord][xCoord] ^= 1;
      }
      xCoord++;
    }
    yCoord++;
  }
}

// fetch/decode/execute loop
function cycle(drawcb, speed = 50) {
  if (pc >= (programStart + programLength)) return;

  const instruction = memory[pc] << 8 | memory[pc + 1];

  pc += 2;

  const opcode = instruction & 0xF000;
  const X = (instruction & 0x0F00) >> 8;
  const Y = (instruction & 0x00F0) >> 4;
  const N = instruction & 0x000F;
  const NN = instruction & 0x00FF;
  const NNN = instruction & 0x0FFF;

  setTimeout(() => {
    switch (opcode) {
      case 0x0000:
        // clear display
        for (let i = 0; i < 32; i++) {
          for (let j = 0; j < 64; j++) {
            display[i][j] = 0;
          }
        }
        break;
      case 0x1000:
        // jump to address
        pc = NNN;
        break;
      case 0x6000:
        // set register X to NN
        registers[X] = NN;
        break;
      case 0x7000:
        // add NN to register X
        registers[X] += NN;
        break;
      case 0xA000:
        // set index register to NNN
        ir = NNN;
        break;
      case 0xD000:
        // draw sprite
        drawSprite(X, Y, N);
        drawcb();
        break;
      default:
        break;
    }
    
    cycle(drawcb, speed);
  }, speed);
}
