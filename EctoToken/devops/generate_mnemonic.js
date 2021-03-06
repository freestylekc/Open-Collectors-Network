var bip39 = require('bip39');
var CryptoJS = require("crypto-js");
var fs = require('fs');
var readlineSync = require('readline-sync');


// read password from stdin
var p = readlineSync.question('Enter password? ', {
    hideEchoBack: true // The typed text on screen is hidden by `*` (default).
});

var p2 = readlineSync.question('Enter again? ', {
    hideEchoBack: true // The typed text on screen is hidden by `*` (default).
});

if (p != p2)
    return;
    
// generate encryption key from password, in hex form, to be used as the password for crypto-js
var salt = "some not important salt"; // not important, we only encrypt once
var iterations = 20000;
var key = CryptoJS.PBKDF2(p, salt, { keySize: 8, iterations: iterations }).toString().toUpperCase();
console.log("Generated key length", key.length);
console.log("Key", key.substr(0, 2) + "..." + key.substr(key.length - 2));

// generate a random mnemonic
var mnemonic = bip39.generateMnemonic()
console.log("Mnemonic word count=" + mnemonic.split(' ').length)

// re-derive the encryption key from the pbkdf2 derived hex password
var encrypted = CryptoJS.AES.encrypt(mnemonic, key);
console.log("Encrypted=" + encrypted.toString());



