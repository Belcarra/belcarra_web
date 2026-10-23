(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Mobile navigation toggle
  var navToggle = document.getElementById("nav-toggle");
  var primaryNav = document.getElementById("primary-nav");
  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      var isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isExpanded));
      primaryNav.classList.toggle("is-open", !isExpanded);
      navToggle.classList.toggle("is-active", !isExpanded);
    });

    document.addEventListener("click", function (e) {
      if (!primaryNav.contains(e.target) && !navToggle.contains(e.target) && primaryNav.classList.contains("is-open")) {
        navToggle.setAttribute("aria-expanded", "false");
        primaryNav.classList.remove("is-open");
        navToggle.classList.remove("is-active");
      }
    });
  }

  function escapeHtml(input) {
    return String(input)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // Contact form: the server chooses between two fixed recipient addresses.
  var contactForm = document.getElementById("contact-form");
  var contactStatus = document.getElementById("contact-status");
  var contactSubmit = document.getElementById("contact-submit");
  var contactSubmitText = document.getElementById("contact-submit-text");

  if (contactForm && contactStatus && contactSubmit) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameInput = document.getElementById("contact-name");
      var emailInput = document.getElementById("contact-email");
      var companyInput = document.getElementById("contact-company");
      var typeInput = document.getElementById("contact-type");
      var subjectInput = document.getElementById("contact-subject");
      var messageInput = document.getElementById("contact-message");

      var payload = {
        name: nameInput ? nameInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim() : "",
        company: companyInput ? companyInput.value.trim() : "",
        inquiry_type: typeInput ? typeInput.value : "info",
        subject: subjectInput ? subjectInput.value.trim() : "",
        message: messageInput ? messageInput.value.trim() : "",
        website: document.getElementById("contact-website").value,
      };

      if (!payload.email || !payload.message) {
        contactStatus.className = "form-status form-status-error";
        contactStatus.textContent = "Please fill in all required fields (email and message).";
        contactStatus.style.display = "block";
        return;
      }

      contactSubmit.disabled = true;
      if (contactSubmitText) {
        contactSubmitText.textContent = "Sending...";
      }
      contactStatus.style.display = "none";

      fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          contactSubmit.disabled = false;
          if (contactSubmitText) {
            contactSubmitText.textContent = "Send Message";
          }

          if (result.ok && result.data && result.data.success) {
            contactStatus.className = "form-status form-status-success";
            contactStatus.textContent = result.data.message || "Thank you. Your message has been sent successfully.";
            contactStatus.style.display = "block";
            contactForm.reset();
          } else {
            contactStatus.className = "form-status form-status-error";
            contactStatus.textContent = (result.data && result.data.error) ?
              result.data.error :
              "Unable to deliver message at this time. Please try again later.";
            contactStatus.style.display = "block";
          }
        })
        .catch(function () {
          contactSubmit.disabled = false;
          if (contactSubmitText) {
            contactSubmitText.textContent = "Send Message";
          }
          contactStatus.className = "form-status form-status-error";
          contactStatus.textContent = "Network error submitting form. Please verify your connection or try again.";
          contactStatus.style.display = "block";
        });
    });
  }

  var announcementsRoot = document.getElementById("announcements");
  if (!announcementsRoot) {
    return;
  }

  function renderInline(text) {
    var safe = escapeHtml(text);
    return safe
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1<\/a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1<\/strong>")
      .replace(/`([^`]+)`/g, "<code>$1<\/code>");
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
