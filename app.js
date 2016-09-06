var express = require('express');
var app = express();
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var By = webdriver.By;
var browser = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("--incognito"))
    .build();

var FACEBOOK = "https://www.facebook.com/";
var SEE_MORE_BUTTON = "clearfix pam uiMorePager stat_elem morePager _52jv";

var finish, url, ids = [];

app.get('/page/:id', function (req, res) {
    ids = [];
    url = FACEBOOK + req.params.id + "/";
    browser.get(url);
    browser.findElement(By.css("meta[property='al:android:url']")).then(function (element) {
        element.getAttribute("content").then(function (text) {
            var id = text.split("/")[3];
            var url = FACEBOOK + "/search/" + id + "/likers/";
            browser.get(url);
            grabPage(res);
        });
    });
});

app.get('/group/:id', function (req, res) {
    finish = false;
    ids = [];
    url = FACEBOOK + "groups/" + req.params.id + "/members/";
    browser.get(url).then(function () {
        var group = grabGroup();
        return group;
    }).then(function (ids) {
        console.log(ids);
        res.send(ids);
    });
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

function login() {
    browser.get(FACEBOOK);
    browser.findElement(By.id('email')).sendKeys('EnverNosov@bk.ru');
    browser.findElement(By.id('pass')).sendKeys('gJVFfj5B');
    browser.findElement(By.id('loginbutton')).click();
    // browser.sleep(1000);
}

login();

function grabPage(res) {
    browser.isElementPresent(By.id("browse_end_of_results_footer")).then(function (present) {
        if (!present) {
            browser.executeScript("window.scrollTo(0, document.body.scrollHeight)");
            browser.sleep(1000);
            grabPage();
        } else {
            browser.sleep(2000); // wait for all data to load
            browser.findElements(By.className("_3u1 _gli _5und")).then(function (people) {
                people.forEach(function (person) {
                    person.getAttribute("data-bt").then(function (json) {
                        ids.push(JSON.parse(json).id);
                    });
                })
            }).then(function () {
                res.send(ids);
                // console.log(ids.length);
                // console.log(ids);
            });
        }
    });
}


var findPersons = function (people) {
    return Promise.all(people.map(function (person) {
        return person.getAttribute("data-hovercard");
    })).then(function (people) {
        return people.map(p => p.split("?id=")[1].split("&")[0]);
    });
};

function grabGroup() {
    return browser.isElementPresent(By.className(SEE_MORE_BUTTON))
        .then(function (present) {
            if (present) {
                browser.findElement(By.className(SEE_MORE_BUTTON)).click();
                browser.sleep(1000);
                return grabGroup();
            } else {
                browser.sleep(2000); // wait for all data to load
                return browser.findElements(By.css("div.fsl.fwb.fcb a"));
            }
        })
        .then(findPersons);
}
