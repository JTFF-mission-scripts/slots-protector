const fs = require("fs");
const jszip = require("jszip");
const path = require("path");
const { format, parse } = require("lua-json");
const blake2 = require("blake2");
const base64url = require('base64url');

if (process.env.NODE_ENV === "production") {
    console.debug = () => { };
}

async function mizOpen(mizPath) {
    var MizFile = new jszip();
    const mizData = fs.readFileSync(mizPath);
    return MizFile.loadAsync(mizData);
}

async function getMissionObjectFromZip(zip) {
    let luaTable = 'return { \n' + await zip.file("mission").async("string") + ' }';
    return parse(luaTable).mission;
}

function generatePassword(length) {
    let saltKey = new Array(11).join().replace(/(.|$)/g, function(){return ((Math.random()*36)|0).toString(36)[Math.random()<.5?"toString":"toUpperCase"]();});
    let clearPassword = new Array(length).join().replace(/(.|$)/g, function(){return ((Math.random()*36)|0).toString(36)[Math.random()<.5?"toString":"toUpperCase"]();});
    let hash = blake2.createKeyedHash('blake2b', Buffer.from(saltKey), {digestLength: 32}).update(Buffer.from(clearPassword)).digest();
    return {
        clear: clearPassword,
        hash: saltKey + ":" + base64url(hash)
    };
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
    console.debug("mission loaded");
    getMissionObjectFromZip(mizData).then(missionObject => {
        Object.keys(missionObject.coalition).forEach(function(coalitionKey, coalitionIndex, coalitionArray) {
            console.debug("coalitions : name = " + missionObject.coalition[coalitionKey].name);
            Object.keys(missionObject.coalition[coalitionKey].country).forEach(function(contryKey, countryIndex, countryArray) {
                console.debug("country : name = " + missionObject.coalition[coalitionKey].country[contryKey].name);
                if (Object.hasOwn(missionObject.coalition[coalitionKey].country[contryKey], 'plane')) {
                    Object.keys(missionObject.coalition[coalitionKey].country[contryKey].plane.group).forEach(function(groupKey, index, array) {
                        console.debug("Plane group : name = " + missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].name);
                        const groupObject = missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey];
                        if (!(Object.hasOwn(groupObject, 'password'))) {
                            const passwordObject = generatePassword(20);
                            console.log("group: " + groupObject.name);
                            console.log("generate Password = " + passwordObject.clear);
                            console.log("generate hash = " + passwordObject.hash);
                            Object.keys(missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].units).forEach(function(unitKey, unitIndex, unitArray) {
                                const unitObject = missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].units[unitKey];
                                if (unitObject.skill === "Client") {
                                    console.debug(groupObject);
                                }
                            });
                        }
                    });
                }
            });
        });
    });
});
