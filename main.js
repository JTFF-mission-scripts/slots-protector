const fs = require('fs');

console.log("slots-protector v" + require('./package.json').version);

if (process.argv.length <= 2) {
    console.error("missing file argument !!!");
    process.exit(1);
}

const inputMizPath = process.argv[2];

if (not(fs.existsSync(inputMizPath))) {
    console.error("file " + process.argv[2] + " not found !!\nExiting.");
    process.exit(2);
}

