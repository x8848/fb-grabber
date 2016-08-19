var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var By = webdriver.By;
var browser = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("--incognito"))
    .build();

var url, likers = [], members = [];

var FACEBOOK = "https://www.facebook.com/";
var SEE_MORE_BUTTON = "clearfix pam uiMorePager stat_elem morePager _52jv";
// var USER_LIKED_PAGES = "https://www.facebook.com/search/100001170237500/pages-liked";

var grabGroup = function () {
    browser.isElementPresent(By.className(SEE_MORE_BUTTON)).then(function (present) {
        if (present) {
            browser.findElement(By.className(SEE_MORE_BUTTON)).click();
            browser.sleep(1000);
            grabGroup();
        } else {
            browser.sleep(2000); // wait for all data to load
            browser.findElements(By.css("div.fsl.fwb.fcb a")).then(function (people) {
                people.forEach(function (person) {
                    person.getAttribute("data-hovercard").then(function (text) {
                        var id = text.split("?id=")[1].split("&")[0];
                        members.push(id);
                    });
                })
            }).then(function () {
                console.log(members.length);
                // console.log(members);
                // browser.quit();
            });
        }
    });

};
function grabPage() {
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
                        likers.push(JSON.parse(json).id);
                    });
                })
            }).then(function () {
                console.log(likers.length);
                // console.log(likers);
                // browser.quit();
            });
        }
    });
}

browser.get(FACEBOOK);
browser.findElement(By.id('email')).sendKeys('EnverNosov@bk.ru');
browser.findElement(By.id('pass')).sendKeys('gJVFfj5B');
browser.findElement(By.id('loginbutton')).click();
browser.sleep(1000);

var group = "1396906110636993";
url = FACEBOOK + "groups/" + group + "/members/";
browser.get(url);
grabGroup();

var page = "RiderGarageBangkok";
url = FACEBOOK + page + "/";
browser.get(url);
browser.findElement(By.css("meta[property='al:android:url']")).then(function (element) {
    element.getAttribute("content").then(function (text) {
        var id = text.split("/")[3];
        var url = FACEBOOK + "/search/" + id + "/likers/";
        browser.get(url);
        grabPage();
    });
});

browser.quit();
