function base64(text) {
  return btoa(Array.from(new TextEncoder().encode(text), byte => String.fromCharCode(byte)).join(""));
}

export function composeEmail(email) {
  const subjectWords = [];
  let word = "";
  for (const character of email.subject) {
    if (new TextEncoder().encode(word + character).length > 42) {
      subjectWords.push(`=?UTF-8?B?${base64(word)}?=`);
      word = "";
    }
    word += character;
  }
  if (word) subjectWords.push(`=?UTF-8?B?${base64(word)}?=`);
  return [
    `From: Belcarra Website <${email.from.email}>`,
    `To: ${email.to[0].email}`,
    `Reply-To: ${email.replyTo.email}`,
    `Subject: ${subjectWords.join("\r\n ")}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@forms.belcarra.com>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64(email.text).match(/.{1,76}/g).join("\r\n"),
    "",
  ].join("\r\n");
}
