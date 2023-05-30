"use strict";

const fs = require("fs");
const jszip = require("jszip");
const path = require("path");
const { format, parse } = require("lua-json");
const blake2 = require("blake2");
const base64url = require('base64url');
const _ = require('lodash');
const JSZip = require("jszip");
const slugify = require('slugify');

if (process.env.NODE_ENV === "production") {
    console.debug = () => { };
}

async function mizOpen(mizPath) {
    let MizFile = new jszip();
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

function generateGroupInfo(groupObject, credentialObject) {
    return {
        groupName: groupObject.name,
        groupId: groupObject.groupId,
        force: Object.keys(groupObject.units).length,
        unitIds: Object.values(groupObject.units).map(x => x.unitId),
        model: groupObject.units["1"].type,
        password: credentialObject.clear
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

const outputMizPath = "./out/passwd_" + path.basename(inputMizPath);
fs.rmSync("./out", {recursive: true, force: true});
fs.mkdirSync("./out/coalitions", {recursive: true});
fs.copyFileSync(inputMizPath,outputMizPath);
mizOpen(outputMizPath).then(mizData => {
    console.debug("mission loaded");
    getMissionObjectFromZip(mizData).then(missionObject => {
        mizData.remove("mission");
        Object.keys(missionObject.coalition).forEach(function(coalitionKey, coalitionIndex, coalitionArray) {
            fs.mkdirSync("./out/coalitions/" + missionObject.coalition[coalitionKey].name);
            console.debug("coalitions : name = " + missionObject.coalition[coalitionKey].name);
            Object.keys(missionObject.coalition[coalitionKey].country).forEach(function(contryKey, countryIndex, countryArray) {
                console.debug("country : name = " + missionObject.coalition[coalitionKey].country[contryKey].name);
                if (Object.hasOwn(missionObject.coalition[coalitionKey].country[contryKey], 'plane')) {
                    Object.keys(missionObject.coalition[coalitionKey].country[contryKey].plane.group).forEach(function(groupKey, index, array) {
                        const groupObject = missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey];
                        console.debug("Plane group : name = " + missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].name);
                        const listSkills = Object.values(missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].units).map(x => x.skill).find(element => element === "Client");
                        if (typeof listSkills !== 'undefined' && listSkills) {
                            if (!(Object.hasOwn(groupObject, 'password'))) {
                                const passwordObject = generatePassword(20);
                                fs.writeFileSync("./out/coalitions/" + missionObject.coalition[coalitionKey].name + "/" + slugify(groupObject.name) + "-info.json", JSON.stringify(generateGroupInfo(groupObject, passwordObject), null, "  "));
                                console.debug("group: " + groupObject.name);
                                console.debug("generate Password = " + passwordObject.clear);
                                console.debug("generate hash = " + passwordObject.hash);
                                missionObject.coalition[coalitionKey].country[contryKey].plane.group[groupKey].password=passwordObject.hash;
                            }
                        } else {
                            console.debug("not Human slot");
                        }
                    });
                }
            });
        });
        let missionLuaT = format(missionObject, { singleQuote: false })
        missionLuaT = missionLuaT
            .split('\n')
            .slice(1, -1)
            .join('\n')
            .slice(0, -1)
            .replace(/\[\"(\d+)\"\] = /g, "[$1] = ");
        mizData.file("mission", missionLuaT);
        mizData.generateAsync({
            type: 'nodebuffer',
            streamFiles: true,
            compression: "DEFLATE",
            compressionOptions: {
                level: 9
            }
        }).then(inputZip => {
            fs.writeFileSync(outputMizPath, inputZip);
        });
    });
})

