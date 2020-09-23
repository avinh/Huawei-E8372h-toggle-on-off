const superagent = require('superagent');
const crypto = require('crypto');
const readlineSync = require('readline-sync');

let option = 1;
let user = 'admin';
let password = 'admin';

async function getIDSession() {
    try {
        var url = `http://192.168.8.1/html/home.html`
        var res = await superagent.get(url)
            .timeout({
                response: 5000,  // Wait 5 seconds for the server to start sending,
                deadline: 10000, // but allow 10 seconds for the file to finish loading.
            })
            .retry(2);
        let SesInfo = res.header['set-cookie'][0].split(';')[0];
        let TokInfo = res.text.match(/<meta name="csrf_token" content="(.*?)"\/>/)[1];
        return { SesInfo, TokInfo };
    } catch (e) {
        console.log(e)
        return null;
    }
};

async function login(password, sessionID, token) {
    try {
        var url = `http://192.168.8.1/api/user/login`
        var res = await superagent.post(url)
            .set({
                '__RequestVerificationToken': token,
                'Cookie': sessionID,
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Encoding': 'gzip, deflate',
                'Pragma': 'no-cache',
                'Accept-Language': 'en-us'
            })
            .send(`<?xml version "1.0" encoding="UTF-8"?><request><Username>admin</Username><Password>${password}</Password><password_type>4</password_type></request>`)

        sessionID = res.res.headers['set-cookie'][0];
        token = res.res.headers.__requestverificationtokenone;

        // var json = parser.toJson(res.text);
        var json = {};
        json['sessionID'] = sessionID;
        json['token'] = token;

        return json;
    } catch (e) {
        console.log(e)
        return null;
    }
};

//base64encode(SHA256(user + base64encode(SHA256(pass)) + token));
async function login_data(username, password, sessiontoken) {
    password = crypto.createHash('sha256')
        .update(password)
        .digest('hex');
    password = Buffer.from(password).toString('base64');

    let authstring = username + password + sessiontoken
    let authcred = crypto.createHash('sha256')
        .update(authstring)
        .digest('hex');
    authcred = Buffer.from(authcred).toString('base64');
    return authcred;
}

async function on_off(sessionID, token) {
    try {
        var url = `http://192.168.8.1/api/dialup/mobile-dataswitch`
        var res = await superagent.post(url)
            .set({
                'Cookie': sessionID,
                '__RequestVerificationToken': token,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(`<?xml version='1.0' encoding='UTF-8'?><request><dataswitch>${option}</dataswitch></request>`)
            .timeout({
                response: 5000,  // Wait 5 seconds for the server to start sending,
                deadline: 10000, // but allow 10 seconds for the file to finish loading.
            })
            .retry(2);
        return res.text;
    } catch (e) {
        console.log(e)
        return null;
    }
};

!async function main() {
    option = readlineSync.question('Turn on or off? \n 1. on \n 2. off \n press: ');
    if (option === "1") {
        option = 1;
    }else if(option === "2"){
        option = 0;
    }else{
        return console.log("Invalid command");
    }
    
    let jsonToken = await getIDSession();
    let sessionID = jsonToken.SesInfo;
    let token = jsonToken.TokInfo;
    password = await login_data(user, password, token);
    let reslogin = await login(password, sessionID, token);
    let resOnOff = await on_off(reslogin.sessionID, reslogin.token);
    console.log(resOnOff);
}()