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
        headers['Referer'] = "https://www.woyushu.com"
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

    let _setCookies = res.headers.get('set-cookie');
    // oooops node-fetch the header
    if (_setCookies) {
        const _d = x => x.replace(/^,/, '');
        _setCookies = _setCookies.replace(/;\shttponly/ig, '').split('path=/').filter(x => !!x.trim())
            .map((x, index, arr) => arr + 1 == arr.length ? _d(x) : _d(x) + 'path=/')
        if (_setCookies instanceof Array)
            cookies = _setCookies.map(Cookie.parse);
        else
            cookies = [Cookie.parse(_setCookies)];


        // console.log(cookies)
        cookies.forEach(cookie => cookiejar.setCookieSync(cookie, $url.protocol + '//' + $url.host))

        saveCookieFile(cookiejar)
    }
    return res;
}



const $ = require('cheerio');


async function checkLogin() {
    let res = await fetch('https://www.woyushu.com')
    if (res.redirected && res.url.match(/login/)) {
        log('检测到未登录')
        return false;
    } else {
        log('检测到已登录')
        return true
    }
}




async function getLoginParams() {
    let resp = await fetch('http://www.gezhongshu.com/member.php?mod=logging&action=login&referer=&infloat=yes&handlekey=login&inajax=1&ajaxtarget=fwin_content_login')
    let txt = await resp.text()

    if (loginHashMatch && formHashMatch) {
        return {
            loginhash: loginHashMatch[1],
            formhash: formHashMatch[1],
        }
    }
}



async function getFormHash() {
    let x = let
}


async function login() {
    const { username, password } = accounts.woyushu;
    var data = {
        email: username,
        password: password,
    }


    let dataString = Object.keys(data).map(key => key + '=' + encodeURIComponent(data[key])).join('&')

    let fetchOptions = {
        method: "post",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: "https://www.woyushu.com//hello/login",
            Origin: 'https://www.woyushu.com',
            "Upgrade-Insecure-Requests": 1,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
        },
        body: dataString,
    }
    let resp = await fetch(`https://www.woyushu.com/deal/login`, fetchOptions)
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
    let res = await fetch('https://www.woyushu.com/User/signin', {
        headers: {
            Origin:'https://www.woyushu.com',
            "X-Requested-With": "XMLHttpRequest"
        }
    });//获取新的页面
    let html = await res.text();
    log(html)
    //                               plugin.php?id=k_misign:sign&operation=qiandao&format=button&formhash=ed573f62
}



checkLogin().then(isLogin => {
    if (!isLogin) {
        return login()
    }
}).then(daylySign)
// .then(online => {
//     log('online? ', online)
//     if (online) {
//         return daylySign()
//     } else {
//         getLoginParams().then(login).then(daylySign)
//     }
// }).catch(e => {
//     if (e === '=_=') {
//         log('=——=c 签到成功')
//     }else{
//         log(e)
//     }
// })