# slots-protector
Take a DCS World mission **.miz** file and protect all human slots with random password.
Give back the mission modified file and list of slots and password in the **out** folder

# Requirements

To use this tool, you will need to have NodeJs correctly installed on your computer.

You can find it here :
https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi

# How to use
After downloading this repo, you will have to run the following commands :
```shell
npm ci
npm run start <<.miz_file_path>>
```
where **<<.miz_file_path>>** is you original .miz file

The program will then creat an **out** folder in the working path and put the **modified .miz file** with human slots password protected and also a list of text files per coalition indicating the passord for each slot
