var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(80);

var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var By = webdriver.By;

var FACEBOOK = "https://www.facebook.com/";
var MORE_BUTTON = "pam uiBoxLightblue uiMorePagerPrimary";

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('group', function (name) {
        console.log('group: ' + name);
        var time = Date.now();
        var url = FACEBOOK + name + "/";
        var browser = getBrowser();
        login(browser)
            .then(browser.get(url))
            .then(() => browser.findElement(By.css("meta[property='al:android:url']")))
            .then(e => e.getAttribute("content"))
            .then(s => isGroup(s, browser))

            .then(() => isMoreButton(browser))
            .then(p => loadAllPeople(p, browser))
            .then(findPeople)

            .then(ids => sendResponse('group', name, ids, time))
            .catch(function (error) {
                sendResponse('page', name, error.message, time);
            });
        browser.quit();
    });
    socket.on('page', function (name) {
        console.log('page: ' + name);
        var time = Date.now();
        var url = FACEBOOK + name + "/";
        var browser = getBrowser();
        login(browser)
            .then(browser.get(url))
            .then(() => browser.findElement(By.css("meta[property='al:android:url']")))
            .then(e => e.getAttribute("content"))
            .then(s => isPage(s, browser))

            .then(() => isAllPeople(browser))
            .then(p => scrollAllPeople(p, browser))
            .then(parsePeople)

            .then(ids => sendResponse('page', name, ids, time))
            .catch(function (error) {
                sendResponse('page', name, error.message, time);
            });
        browser.quit();
    });
});

app.get('/', function (req, res) {
    res.sendfile('index.html');
});

function getBrowser() {
    return new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().addArguments("--incognito"))
        .build();
}
function login(browser) {
    return browser.get(FACEBOOK)
        .then(() => browser.findElement(By.id('email')).sendKeys('EnverNosov@bk.ru'))
        .then(() => browser.findElement(By.id('pass')).sendKeys('gJVFfj5B'))
        .then(() => browser.findElement(By.id('loginbutton')).click());
}
function sendResponse(type, name, ids, time) {
    var date = new Date(Date.now() - time);
    var seconds = date.getUTCSeconds();
    time = date.getUTCMinutes() + ':' + (seconds >= 10 ? seconds : "0" + seconds);
    io.emit('result', {
        type: type,
        name: name,
        total: (typeof ids == "string") ? "error !!" : ids.length,
        time: time,
        ids: ids
    });
}

function isPage(s, browser) {
    var type = s.split("/")[2];
    var name = s.split("/")[3];
    if (type != "page") {
        throw new Error("That is not a PAGE. " + name + " is " + type + " !!");
    }
    var url = FACEBOOK + "/search/" + name + "/likers/";
    return browser.get(url);
}
function isAllPeople(browser) {
    return browser.isElementPresent(By.id("browse_end_of_results_footer"));
}
function scrollAllPeople(present, browser) {
    if (!present) {
        return browser.executeScript("window.scrollTo(0, document.body.scrollHeight)")
            .then(() => isAllPeople(browser))
            .then(p => scrollAllPeople(p, browser));
    } else {
        return browser.sleep(2000).then(()=> browser.findElements(By.className("_3u1 _gli _5und")))
    }
}
function parsePeople(people) {
    return Promise.all(people.map(function (person) {
        return person.getAttribute("data-bt");
    })).then(function (people) {
        return people.map(p => JSON.parse(p).id);
    });
};

function isGroup(s, browser) {
    var type = s.split("/")[2];
    var name = s.split("/")[3];
    if (type != "group") {
        throw new Error("That is not a GROUP. " + name + " is " + type + " !!");
    }
    var url = FACEBOOK + "groups/" + name + "/members/";
    return browser.get(url);
}
function isMoreButton(browser) {
    return browser.isElementPresent(By.className(MORE_BUTTON));
}
function loadAllPeople(present, browser) {
    if (present) {
        var button = browser.findElement(By.className(MORE_BUTTON));
        return browser.actions().mouseMove(button).click().perform()
            .then(browser.sleep(2000))
            .then(() => isMoreButton(browser))
            .then(p => loadAllPeople(p, browser));
    } else {
        return browser.sleep(2000).then(() => browser.findElements(By.css("div.fsl.fwb.fcb a")));
    }
};
function findPeople(people) {
    return Promise.all(people.map(function (person) {
        return person.getAttribute("data-hovercard");
    })).then(function (people) {
        return people.map(p => p.split("?id=")[1].split("&")[0]);
    });
};