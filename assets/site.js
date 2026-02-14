(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var announcementsRoot = document.getElementById("announcements");
  if (!announcementsRoot) {
    return;
  }

  function escapeHtml(input) {
    return input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderInline(text) {
    var safe = escapeHtml(text);
    return safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1<\/a>');
  }

  function markdownToHtml(md) {
    var lines = md.split(/\r?\n/);
    var html = [];
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (!line) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        continue;
      }

      if (line.startsWith("# ")) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push("<h4>" + renderInline(line.slice(2)) + "</h4>");
        continue;
      }

      if (line.startsWith("- ")) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push("<li>" + renderInline(line.slice(2)) + "</li>");
        continue;
      }

      if (inList) {
        html.push("</ul>");
        inList = false;
      }

      html.push("<p>" + renderInline(line) + "</p>");
    }

    if (inList) {
      html.push("</ul>");
    }

    return html.join("");
  }

  function compareNewestFirst(a, b) {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }

  function renderAnnouncement(entry, rawContent) {
    var article = document.createElement("article");
    article.className = "announcement";

    var heading = document.createElement("h3");
    heading.textContent = entry.title;

    var time = document.createElement("time");
    time.dateTime = entry.date;
    time.textContent = entry.date;

    var content = document.createElement("div");
    content.className = "content";
    if (entry.file && entry.file.toLowerCase().endsWith(".html")) {
      content.innerHTML = rawContent;
    } else {
      content.innerHTML = markdownToHtml(rawContent);
    }

    article.appendChild(heading);
    article.appendChild(time);
    article.appendChild(content);
    return article;
  }

  function showLoadError() {
    announcementsRoot.innerHTML = "<p>Announcements are temporarily unavailable. Please check back soon.<\/p>";
  }

  fetch("announcements/manifest.json")
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Failed to load announcements manifest");
      }
      return res.json();
    })
    .then(function (manifest) {
      if (!Array.isArray(manifest) || manifest.length === 0) {
        announcementsRoot.innerHTML = "<p>No announcements published yet.<\/p>";
        return;
      }

      manifest.sort(compareNewestFirst);

      return Promise.all(
        manifest.map(function (entry) {
          return fetch("announcements/" + entry.file)
            .then(function (res) {
              if (!res.ok) {
                throw new Error("Failed to load announcement markdown");
              }
              return res.text();
            })
            .then(function (markdown) {
              return { entry: entry, markdown: markdown };
            });
        })
      ).then(function (items) {
        announcementsRoot.innerHTML = "";
        items.forEach(function (item) {
          announcementsRoot.appendChild(renderAnnouncement(item.entry, item.markdown));
        });
      });
    })
    .catch(showLoadError);
})();
