const tough = require('tough-cookie')
const fs = require('fs');
const { Cookie, CookieJar } = tough;
const fetchNoCookie = require('node-fetch');
const URL = require('url')

const accounts = require('./account');

/**@type {import('tough-cookie').CookieJar} */
var cookiejar = getCookieJar()

/**
 * 
 * @param {import('tough-cookie').CookieJar} cookiejar 
 */
function getCookieJar() {
    if (fs.existsSync('cookiejar')) {
        return tough.CookieJar.fromJSON(fs.readFileSync('cookiejar').toString())
    } else {
        return new tough.CookieJar();
    }
}
function saveCookieFile(cookiejar) {
    fs.writeFileSync('cookiejar', JSON.stringify(cookiejar.toJSON(), null, 2))
}


const log = (...d) => console.log(new Date().toString(), ...d);

async function fetch(url, options = {}) {
    let $url = URL.parse(url);
    let { headers = {} } = options;
    if (!headers["User-Agent"]) {
        headers["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36"
    }

    if (!headers['Upgrade-Insecure-Requests']) {
        headers['Upgrade-Insecure-Requests'] = 1
    }
    if (!headers['Referers']) {
        headers['Referer'] = "http://www.gezhongshu.com/forum.php"
    }

    // prepare config cookie
    let cookieString = cookiejar.getCookieStringSync($url.protocol + '//' + $url.host, { allPoints: true })
    // console.log(cookieString);
    headers['Cookie'] = cookieString;
    options = {
        ...options,
        headers
    }
    let res = await fetchNoCookie(url, options);
    // after config cookie

    let cookies;
    let _setCookies1 = res.headers.raw()
    let _setCookies = res.headers.get('set-cookie');
    // oooops node-fetch the header
    const _d = x => x.replace(/^,/, '');
    _setCookies = _setCookies.replace('; httponly', '').split('path=/').filter(x => !!x.trim())
        .map((x, index, arr) => arr + 1 == arr.length ? _d(x) : _d(x) + 'path=/')
    if (_setCookies instanceof Array)
        cookies = _setCookies.map(Cookie.parse);
    else
        cookies = [Cookie.parse(_setCookies)];


    // console.log(cookies)
    cookies.forEach(cookie => cookiejar.setCookieSync(cookie, $url.protocol + '//' + $url.host))

    saveCookieFile(cookiejar)

    return res;
}



const $ = require('cheerio');


async function checkLogin() {
    let res = await fetch('http://www.gezhongshu.com/forum.php')

    let text = await res.text();
    // console.log(text)
    let testReg = /"访问我的空间"><\/a>/gm
    if (testReg.test(text)) {
        return false;
    } else {

        let urlReg = /href=\"([^"]*)" onclick="ajaxget\(this\.href,/im;
        let match = urlReg.exec(text);
        if (match) {
            let url = match[1];
            let res = await fetch('http://www.gezhongshu.com/' + url);
            let html = await res.json()
            // console.log(html)
            log('签到成功')
        }
        return Promise.reject('=_=')
    }
}




async function getLoginParams() {
    let resp = await fetch('http://www.gezhongshu.com/member.php?mod=logging&action=login&referer=&infloat=yes&handlekey=login&inajax=1&ajaxtarget=fwin_content_login')
    let txt = await resp.text()
    let loginHashReg = /loginhash=(\w*)"/m;
    let formHashReg = /name="formhash" value="(\w*)"/

    let loginHashMatch = loginHashReg.exec(txt);
    let formHashMatch = formHashReg.exec(txt);
    if (loginHashMatch && formHashMatch) {
        return {
            loginhash: loginHashMatch[1],
            formhash: formHashMatch[1],
        }
    }
}

checkLogin().then(online => {
    log('online? ', online)
    if (online) {
        return daylySign()
    } else {
        getLoginParams().then(login).then(daylySign)
    }
}).catch(e => {
    if (e === '=_=') {
        log('=——=c 签到成功')
    }else{
        log(e)
    }
})

async function getFormHash() {
    let x = let
}


async function login({ formhash = '', loginhash }) {
    const { username, password } = accounts.gezhongshu;
    var data = {
        formhash: formhash,
        referer: "http://www.gezhongshu.com/plugin.php?id=k_misign:sign",
        loginfield: "username",
        username: username,
        password: password,
        questionid: 0,
        answer: ""
    }


    let dataString = Object.keys(data).map(key => key + '=' + data[key]).join('&')
    let fetchOptions = {
        method: "post",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: "http://www.gezhongshu.com/plugin.php?id=k_misign:sign",
            "Upgrade-Insecure-Requests": 1,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36"
        },
        body: dataString,
    }
    let resp = await fetch(`http://www.gezhongshu.com/member.php?mod=logging&action=login&loginsubmit=yes&handlekey=login&loginhash=${loginhash}&inajax=1`, fetchOptions)
    let text = await resp.text();
    log('登录成功')
    // console.log(text)
    // let content = $(text)
    // console.log(content)
}


async function logout() {

    fetch('http://www.gezhongshu.com/member.php?mod=logging&action=logout&formhash=566220dd')
}

async function daylySign() {
    let res = await fetch('http://www.gezhongshu.com/forum.php');//获取新的页面
    let html = await res.text();

    let urlReg = /href=\"([^"]*)" onclick="ajaxget\(this\.href,/im;
    let match = urlReg.exec(html);
    if (match) {
        let url = match[1];
        let res = await fetch('http://www.gezhongshu.com/' + url);
        let html = await res.json()
        log('签到成功')
    } else {
        log('已经签到了')
    }
    //                               plugin.php?id=k_misign:sign&operation=qiandao&format=button&formhash=ed573f62
}