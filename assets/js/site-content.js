(function () {
  "use strict";

  var CONTENT_URL = "data/profile.json";

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function safeUrl(value, allowedProtocols) {
    try {
      var url = new URL(value, window.location.href);
      return allowedProtocols.indexOf(url.protocol) !== -1 ? url.href : "#";
    } catch (error) {
      return "#";
    }
  }

  function setLink(link, text, href) {
    if (!link) return;
    link.textContent = text;
    link.href = href;
  }

  function renderHeader(data) {
    var profile = data.profile || {};
    var contact = data.contact || {};
    var name = document.querySelector(".header__base-info h4");
    var status = document.querySelector(".header__base-info .status");
    var avatar = document.querySelector(".header__photo-img");

    if (name) name.textContent = profile.displayName || "";
    if (status) status.textContent = profile.tagline || "";
    if (avatar) {
      avatar.src = safeUrl(profile.avatar || "", ["http:", "https:"]);
      avatar.alt = profile.displayName || "个人头像";
    }

    var social = document.querySelector(".header__social");
    if (social) {
      social.replaceChildren();
      [
        { label: "GitHub", url: contact.githubUrl },
        { label: "LinkedIn", url: contact.linkedinUrl }
      ].forEach(function (item) {
        if (!item.url) return;
        var li = element("li");
        var link = element("a", "", item.label);
        link.href = safeUrl(item.url, ["http:", "https:"]);
        link.setAttribute("aria-label", item.label + "个人主页");
        li.appendChild(link);
        social.appendChild(li);
      });
    }

    var contactGroups = document.querySelectorAll(".header__contact");
    if (contactGroups[0]) {
      var primaryItems = contactGroups[0].querySelectorAll("li");
      setLink(primaryItems[0] && primaryItems[0].querySelector("a"), contact.email || "", "mailto:" + (contact.email || ""));
      setLink(primaryItems[1] && primaryItems[1].querySelector("a"), contact.phoneWechat || "", "tel:" + (contact.phoneDial || ""));
    }
    if (contactGroups[1]) {
      var details = contactGroups[1].querySelectorAll("li");
      if (details[0]) {
        details[0].replaceChildren(element("span", "overhead", "出生年月"), document.createTextNode(profile.birth || ""));
      }
      if (details[1]) {
        var githubLabel = contact.githubLabel || "GitHub";
        var github = element("a", "", githubLabel);
        github.href = safeUrl(contact.githubUrl || "", ["http:", "https:"]);
        details[1].replaceChildren(element("span", "overhead", "GitHub"), github);
      }
      if (details[2]) {
        details[2].replaceChildren(element("span", "overhead", "居住地址"), document.createTextNode(profile.location || ""));
      }
    }
  }

  function renderTimeline(container, items) {
    if (!container || !Array.isArray(items)) return;
    container.replaceChildren();
    items.forEach(function (item) {
      var article = element("article", "timeline__item");
      article.appendChild(element("h5", "title title--h5 timeline__title", item.title || ""));
      article.appendChild(element("span", "timeline__period", item.period || ""));
      article.appendChild(element("p", "timeline__description", item.description || ""));
      container.appendChild(article);
    });
  }

  function renderHome(data) {
    renderTimeline(document.querySelector("[data-cms-education]"), data.education);
    var summary = document.querySelector("[data-cms-summary]");
    if (summary && data.profile && Array.isArray(data.profile.summary)) {
      summary.replaceChildren();
      data.profile.summary.forEach(function (paragraph) {
        summary.appendChild(element("p", "", paragraph));
      });
    }
  }

  function renderContact(data) {
    var frame = document.querySelector(".map iframe");
    var mapUrl = data.contact && data.contact.mapEmbedUrl;
    if (frame && mapUrl) frame.src = safeUrl(mapUrl, ["https:"]);
  }

  function renderResume(data) {
    renderTimeline(document.querySelector("[data-cms-experience]"), data.experience);
    var skills = document.querySelector("[data-cms-skills]");
    if (!skills || !Array.isArray(data.skills)) return;
    skills.replaceChildren();
    data.skills.forEach(function (skill) {
      var item = element("div", "mb-3");
      item.appendChild(element("h3", "title title--h4", skill.title || ""));
      item.appendChild(element("p", "", skill.description || ""));
      skills.appendChild(item);
    });
    if (data.skillFocus) skills.appendChild(element("p", "", data.skillFocus));
  }

  function loadContent() {
    fetch(CONTENT_URL, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("内容文件加载失败：" + response.status);
        return response.json();
      })
      .then(function (data) {
        renderHeader(data);
        renderHome(data);
        renderResume(data);
        renderContact(data);
        document.documentElement.setAttribute("data-cms-content", "loaded");
      })
      .catch(function (error) {
        document.documentElement.setAttribute("data-cms-content", "fallback");
        console.warn("已使用页面内置备用内容。", error);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadContent);
  } else {
    loadContent();
  }
})();
