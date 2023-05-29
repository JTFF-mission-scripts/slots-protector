const fs = require("fs");
const jszip = require("jszip");
const path = require("path");
const { format, parse } = require("lua-json");


async function mizOpen(mizPath) {
    var MizFile = new jszip();
    const mizData = fs.readFileSync(mizPath);
    return MizFile.loadAsync(mizData);
}

async function getMissionObjectFromZip(zip) {
    let luaTable = 'return { \n' + await zip.file("mission").async("string") + ' }';
    return parse(luaTable).mission;
}


console.log("slots-protector v" + require('./package.json').version);

if (process.argv.length <= 2) {
    console.error("missing file argument !!!");
    process.exit(1);
}

const inputMizPath = process.argv[2];

if (!(fs.existsSync(inputMizPath))) {
    console.error("file " + process.argv[2] + " not found !!\nExiting.");
    process.exit(2);
}


mizOpen(inputMizPath).then(mizData => {
    console.log("mission loaded");
    getMissionObjectFromZip(mizData).then(missionObject => {
        Object.keys(missionObject.coalition).forEach(function(coalitionKey, coalitionIndex, coalitionArray) {
            console.debug("coalitions : name = " + missionObject.coalition[coalitionKey].name);
            Object.keys(missionObject.coalition[coalitionKey].country).forEach(function(contryKey, countryIndex, countryArray) {
                Object.keys(missionObject.coalition[coalitionKey].country[contryKey].plane.group).forEach(function(groupKey, index, array) {
                    Object.keys(missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].units).forEach(function(unitKey, unitIndex, unitArray) {
                        const unitObject = missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].units[unitKey];
                        if (unitObject.skill === "Client") {
                            console.log(unitObject);
                        }
                    });
                });
            });
        });
    });
});
