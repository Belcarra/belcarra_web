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

  function renderInline(text) {
    var safe = escapeHtml(text);
    return safe
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1<\/a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1<\/strong>")
      .replace(/`([^`]+)`/g, "<code>$1<\/code>");
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

  // Evaluation form handling
  var evalForm = document.getElementById("eval-form");
  var evalStatus = document.getElementById("eval-status");
  var evalSubmit = document.getElementById("eval-submit");
  var evalSubmitText = document.getElementById("eval-submit-text");

  if (evalForm && evalStatus && evalSubmit) {
    var vidChoiceOwn = document.getElementById("vid-choice-own");
    var vidChoiceTest = document.getElementById("vid-choice-test");
    var vidPidInputs = document.getElementById("vid-pid-inputs");

    var dhcpChoiceEnabled = document.getElementById("dhcp-choice-enabled");
    var dhcpChoiceDisabled = document.getElementById("dhcp-choice-disabled");
    var dhcpSubnetContainer = document.getElementById("dhcp-subnet-container");

    function updateEvalToggles() {
      if (vidPidInputs && vidChoiceTest) {
        vidPidInputs.style.display = vidChoiceTest.checked ? "none" : "block";
      }
      if (dhcpSubnetContainer && dhcpChoiceDisabled) {
        dhcpSubnetContainer.style.display = dhcpChoiceDisabled.checked ? "none" : "block";
      }
    }

    if (vidChoiceOwn) vidChoiceOwn.addEventListener("change", updateEvalToggles);
    if (vidChoiceTest) vidChoiceTest.addEventListener("change", updateEvalToggles);
    if (dhcpChoiceEnabled) dhcpChoiceEnabled.addEventListener("change", updateEvalToggles);
    if (dhcpChoiceDisabled) dhcpChoiceDisabled.addEventListener("change", updateEvalToggles);

    evalForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameInput = document.getElementById("eval-name");
      var emailInput = document.getElementById("eval-email");
      var companyInput = document.getElementById("eval-company");
      var subjectInput = document.getElementById("eval-subject");
      var messageInput = document.getElementById("eval-message");
      var vidInput = document.getElementById("eval-vid");
      var pidInput = document.getElementById("eval-pid");
      var subnetInput = document.getElementById("eval-dhcp-subnet");

      var osCheckboxes = evalForm.querySelectorAll('input[name="target_os"]:checked');
      var osList = [];
      for (var i = 0; i < osCheckboxes.length; i++) {
        osList.push(osCheckboxes[i].value);
      }

      var protoCheckboxes = evalForm.querySelectorAll('input[name="protocols"]:checked');
      var protoList = [];
      for (var j = 0; j < protoCheckboxes.length; j++) {
        protoList.push(protoCheckboxes[j].value);
      }

      var vidRadio = evalForm.querySelector('input[name="vid_choice"]:checked');
      var dhcpRadio = evalForm.querySelector('input[name="dhcp_choice"]:checked');

      var payload = {
        name: nameInput ? nameInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim() : "",
        company: companyInput ? companyInput.value.trim() : "",
        inquiry_type: "evaluation",
        subject: subjectInput ? subjectInput.value.trim() : "USBLAN Evaluation Kit Request",
        message: messageInput ? messageInput.value.trim() : "",
        target_os: osList.join(", "),
        protocols: protoList.join(", "),
        vid_choice: vidRadio ? vidRadio.value : "Own VID/PID",
        vid: vidInput ? vidInput.value.trim() : "",
        pid: pidInput ? pidInput.value.trim() : "",
        dhcp_choice: dhcpRadio ? dhcpRadio.value : "Enabled",
        dhcp_subnet: subnetInput ? subnetInput.value.trim() : "169.254.1.1",
        website: document.getElementById("eval-website") ? document.getElementById("eval-website").value : "",
      };

      if (!payload.name || !payload.email || !payload.company || !payload.message) {
        evalStatus.className = "form-status form-status-error";
        evalStatus.textContent = "Please fill in all required fields (name, email, company, and message).";
        evalStatus.style.display = "block";
        return;
      }

      evalSubmit.disabled = true;
      if (evalSubmitText) {
        evalSubmitText.textContent = "Submitting Request...";
      }
      evalStatus.style.display = "none";

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
          evalSubmit.disabled = false;
          if (evalSubmitText) {
            evalSubmitText.textContent = "Submit Evaluation Driver Request →";
          }

          if (result.ok && result.data && result.data.success) {
            evalStatus.className = "form-status form-status-success";
            evalStatus.textContent = result.data.message || "Thank you. Your evaluation request has been submitted successfully.";
            evalStatus.style.display = "block";
            evalForm.reset();
            updateEvalToggles();
          } else {
            evalStatus.className = "form-status form-status-error";
            evalStatus.textContent = (result.data && result.data.error) ?
              result.data.error :
              "Unable to deliver evaluation request at this time. Please email info@belcarra.com directly.";
            evalStatus.style.display = "block";
          }
        })
        .catch(function () {
          evalSubmit.disabled = false;
          if (evalSubmitText) {
            evalSubmitText.textContent = "Submit Evaluation Driver Request →";
          }
          evalStatus.className = "form-status form-status-error";
          evalStatus.textContent = "Network error submitting request. Please verify your connection or email info@belcarra.com.";
          evalStatus.style.display = "block";
        });
    });
  }

  // Belcarra Technical Assistant
  function initChatWidget() {
    if (document.getElementById("chat-widget")) return;

    var widget = document.createElement("div");
    widget.id = "chat-widget";
    widget.className = "chat-widget";
    widget.innerHTML = [
      '<button id="chat-toggle" class="chat-toggle-btn" aria-label="Open Belcarra AI Assistant">',
      '  <svg class="chat-toggle-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
      '  <span>Ask AI</span>',
      '</button>',
      '<div id="chat-panel" class="chat-panel" role="dialog" aria-label="Belcarra Technical Assistant">',
      '  <div class="chat-header">',
      '    <div class="chat-header-title">',
      '      <strong>Belcarra Technical Assistant</strong>',
      '      <span>Powered by Cloudflare Workers AI</span>',
      '    </div>',
      '    <button id="chat-close" class="chat-close-btn" aria-label="Close assistant">&times;</button>',
      '  </div>',
      '  <div id="chat-messages" class="chat-messages">',
      '    <div class="chat-msg chat-msg-bot">',
      '      <p>Hello! I can answer technical questions about Belcarra USBLAN drivers, Windows 11 AMD64/ARM64 support, USB networking protocols, and Linux gadget setup.</p>',
      '      <div class="chat-suggestions">',
      '        <button class="chat-chip" data-q="What platforms does Belcarra USBLAN support?">Platform support?</button>',
      '        <button class="chat-chip" data-q="What is the difference between CDC-NCM and RNDIS?">CDC-NCM vs RNDIS?</button>',
      '        <button class="chat-chip" data-q="How do I fix Device Manager error Code 10?">Fix Code 10 error?</button>',
      '        <button class="chat-chip" data-q="How do I completely uninstall USBLAN drivers?">Clean uninstall?</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="chat-footer">',
      '    <form id="chat-form" class="chat-form">',
      '      <input type="text" id="chat-input" class="chat-input" placeholder="Ask a technical question..." maxlength="800" autocomplete="off" aria-label="Technical question">',
      '      <button type="submit" id="chat-send" class="chat-send-btn">Send</button>',
      '    </form>',
      '    <div class="chat-disclaimer">AI guidance from site documents; check the listed sources. Do not include confidential information.</div>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(widget);

    var toggleBtn = document.getElementById("chat-toggle");
    var panel = document.getElementById("chat-panel");
    var closeBtn = document.getElementById("chat-close");
    var form = document.getElementById("chat-form");
    var input = document.getElementById("chat-input");
    var messagesEl = document.getElementById("chat-messages");
    var sendBtn = document.getElementById("chat-send");
    var history = [];
    var chatBusy = false;

    function toggleChat(open) {
      var isOpen = typeof open === "boolean" ? open : !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", isOpen);
      if (isOpen) {
        input.focus();
      }
    }

    toggleBtn.addEventListener("click", function () {
      toggleChat();
    });

    closeBtn.addEventListener("click", function () {
      toggleChat(false);
    });

    function appendMessage(role, text) {
      var msg = document.createElement("div");
      msg.className = "chat-msg " + (role === "user" ? "chat-msg-user" : "chat-msg-bot");
      if (role === "user") {
        msg.textContent = text;
      } else {
        var lines = text.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
        var html = lines.map(function (line) {
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return "<li>" + renderInline(line.substring(2)) + "</li>";
          }
          return "<p>" + renderInline(line) + "</p>";
        }).join("");
        if (html.includes("<li>")) {
          html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, "<ul>$&</ul>");
        }
        msg.innerHTML = html || "<p>" + escapeHtml(text) + "</p>";
      }
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return msg;
    }

    function showTypingIndicator() {
      var typing = document.createElement("div");
      typing.id = "chat-typing";
      typing.className = "chat-msg chat-msg-bot chat-typing";
      typing.innerHTML = '<span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>';
      messagesEl.appendChild(typing);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTypingIndicator() {
      var typing = document.getElementById("chat-typing");
      if (typing) typing.remove();
    }

    function handleSend(userText) {
      var text = (userText || input.value || "").trim();
      if (!text || chatBusy) return;
      if (text.length > 800) {
        appendMessage("assistant", "Please limit your question to 800 characters.");
        return;
      }
      chatBusy = true;
      messagesEl.querySelectorAll(".chat-chip").forEach(function (button) { button.disabled = true; });
      var controller = new AbortController();
      var deadline = setTimeout(function () { controller.abort(); }, 35000);

      appendMessage("user", text);
      input.value = "";
      input.disabled = true;
      sendBtn.disabled = true;
      showTypingIndicator();

      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history }),
        signal: controller.signal,
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {

          var reply = (result.data && result.data.reply) || (result.data && result.data.error) || "Sorry, I was unable to generate a response. Please try again.";
          var messageEl = appendMessage("assistant", reply);
          if (result.ok && result.data.success && Array.isArray(result.data.sources)) {
            var sourceList = document.createElement("p");
            sourceList.className = "chat-sources";
            sourceList.appendChild(document.createTextNode("Site references: "));
            result.data.sources.slice(0, 8).forEach(function (source, index) {
              // Only local reference URLs from the generated corpus are permitted.
              if (typeof source.url !== "string" || !/^\/(?!\/)[a-zA-Z0-9/#._-]*$/.test(source.url)) return;
              var link = document.createElement("a");
              link.href = source.url;
              link.textContent = "[" + (index + 1) + "] " + source.title + (source.date ? " (" + source.date + ")" : "");
              if (index) sourceList.appendChild(document.createTextNode("; "));
              sourceList.appendChild(link);
            });
            if (result.data.sources.length) messageEl.appendChild(sourceList);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }

          if (result.ok && result.data && result.data.success === true && result.data.reply) {
            history.push({ role: "user", content: text });
            history.push({ role: "assistant", content: result.data.reply.slice(0, 1000) });
            if (history.length > 6) history = history.slice(-6);
          }
        })
        .catch(function (error) {
          appendMessage("assistant", error.name === "AbortError"
            ? "The assistant took too long to respond. Please try again."
            : "Unable to reach the assistant. Please try again or use Contact Us.");
        })
        .finally(function () {
          clearTimeout(deadline);
          chatBusy = false;
          removeTypingIndicator();
          input.disabled = false;
          sendBtn.disabled = false;
          messagesEl.querySelectorAll(".chat-chip").forEach(function (button) { button.disabled = false; });
          if (panel.classList.contains("is-open")) input.focus();
        });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      handleSend();
    });

    messagesEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".chat-chip");
      if (chip && chip.dataset.q) {
        handleSend(chip.dataset.q);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatWidget);
  } else {
    initChatWidget();
  }

  var announcementsRoot = document.getElementById("announcements");
  if (!announcementsRoot) {
    return;
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
    article.id = "announcement-" + entry.file.replace(/\.(md|html)$/, "");

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
        if (window.location.hash.startsWith("#announcement-")) {
          var target = document.getElementById(window.location.hash.slice(1));
          if (target) target.scrollIntoView();
        }
      });
    })
    .catch(showLoadError);
})();
