/** Notification configuration, recipient groups, schedules, templates and delivery control. */
var NotificationConfigService = (function() {
  var groups = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.NOTIFICATION_GROUPS, ["group_id","project_id","group_name","email_to","email_cc","email_bcc","whatsapp_numbers","recipient_roles","is_active","created_at","updated_at"], "group_id");
  var rules = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.NOTIFICATION_RULES, ["rule_id","project_id","group_id","template_id","event_type","frequency","days_of_week","send_time","timezone","threshold_value","is_active","dedupe_minutes","max_retries","created_at","updated_at"], "rule_id");
  var templates = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.NOTIFICATION_TEMPLATES, ["template_id","template_name","channel","subject","body","template_version","version_history","is_active","created_at","updated_at"], "template_id");
  var deliveries = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.NOTIFICATION_DELIVERIES, ["delivery_id","dedupe_key","project_id","rule_id","channel","recipient","status","attempts","last_error","provider_id","payload","sent_at","created_at"], "delivery_id");
  var holidays = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.NOTIFICATION_HOLIDAYS, ["holiday_id","holiday_date","holiday_name","is_active","created_at"], "holiday_id");
  var adminItems = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.NOTIFICATION_ADMIN_ITEMS, ["item_id","title","description","category","status","due_date","threshold_days","owner","rule_id","last_notified_at","is_active","created_at","updated_at"], "item_id");
  var now = function() { return new Date().toISOString(); };
  var id = function(prefix) { return prefix + "_" + Utilities.getUuid(); };
  var split = function(value) { return String(value || "").split(/[;,\n]/).map(function(v) { return v.trim(); }).filter(Boolean); };
  function contentFingerprint(payload) {
    var raw = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    if (typeof Utilities !== "undefined" && Utilities.computeDigest) return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw));
    var hash = 0; for (var i = 0; i < raw.length; i++) hash = ((hash << 5) - hash) + raw.charCodeAt(i) | 0;
    return String(hash);
  }
  function buildDedupeKey(key, payload) { return String(key || "") + "|CONTENT:" + contentFingerprint(payload); }

  function saveGroup(payload) {
    validateRequired(payload.group_name, "Nama group");
    validateMaxLength_(payload.group_name, "Nama group", 120);
    validateMaxLength_(payload.email_to, "Recipient To", 2000); validateMaxLength_(payload.email_cc, "Recipient CC", 2000); validateMaxLength_(payload.email_bcc, "Recipient BCC", 2000); validateMaxLength_(payload.whatsapp_numbers, "Recipient WhatsApp", 3000);
    var emailTo = split(payload.email_to), emailCc = split(payload.email_cc), emailBcc = split(payload.email_bcc), phones = split(payload.whatsapp_numbers);
    var allEmails = emailTo.concat(emailCc, emailBcc);
    if (allEmails.length + phones.length > 50) throw ErrorFactory.validation("Jumlah penerima maksimal 50.");
    if (!emailTo.length && !phones.length) throw ErrorFactory.validation("Group harus memiliki minimal satu email To atau nomor WhatsApp.");
    for (var i = 0; i < allEmails.length; i++) if (!isValidEmail(allEmails[i])) throw ErrorFactory.validation("Alamat email tidak valid: " + allEmails[i]);
    var normalizedEmails = allEmails.map(function(e) { return e.toLowerCase(); });
    if (normalizedEmails.some(function(e, i) { return normalizedEmails.indexOf(e) !== i; })) throw ErrorFactory.validation("Alamat email duplikat pada group.");
    for (var j = 0; j < phones.length; j++) if (!FonnteHelper.isValidPhoneNumber(phones[j])) throw ErrorFactory.validation("Nomor WhatsApp tidak valid: " + phones[j]);
    var normalizedPhones = phones.map(function(p) { return FonnteHelper.sanitizePhoneNumber(p); });
    if (normalizedPhones.some(function(p, i) { return normalizedPhones.indexOf(p) !== i; })) throw ErrorFactory.validation("Nomor WhatsApp duplikat pada group.");
    var entity = { group_id: payload.group_id || id("grp"), project_id: payload.project_id || "", group_name: sanitizeString(payload.group_name), email_to: emailTo.join(","), email_cc: emailCc.join(","), email_bcc: emailBcc.join(","), whatsapp_numbers: normalizedPhones.join(","), recipient_roles: split(payload.recipient_roles).map(function(r) { return sanitizeString(r).toUpperCase(); }).filter(Boolean).filter(function(r, i, a) { return a.indexOf(r) === i; }).join(","), is_active: payload.is_active !== false, created_at: payload.created_at || now(), updated_at: now() };
    if (payload.group_id && groups.findById(payload.group_id)) groups.updateById(payload.group_id, entity); else groups.insert(entity);
    return formatSuccessResponse(entity, "Group penerima berhasil disimpan.");
  }
  function deleteGroup(groupId) {
    validateRequired(groupId, "Group ID");
    if (!groups.findById(groupId)) throw ErrorFactory.notFound("Group penerima", groupId);
    return formatSuccessResponse({ deleted: groups.deleteById(groupId), groupId: groupId }, "Group penerima berhasil dihapus.");
  }
  function saveRule(payload) {
    if (!payload.project_id && String(payload.event_type || "").indexOf("ADMIN") !== 0 && ["DOCUMENT_EXPIRING","APPROVAL_PENDING","PAYMENT_DUE","COMPLIANCE_DEADLINE"].indexOf(String(payload.event_type || "")) < 0) validateRequired(payload.project_id, "Project ID");
    var frequency = payload.frequency || "DAILY";
    if (["EVENT","DAILY","WEEKLY","CUSTOM"].indexOf(frequency) < 0) throw ErrorFactory.validation("Frequency tidak valid.");
    var sendTime = String(payload.send_time || "08:00");
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(sendTime)) throw ErrorFactory.validation("Jam pengiriman harus berformat HH:mm.");
    var days = split(payload.days_of_week).map(Number).filter(function(day) { return day >= 1 && day <= 7; });
    if ((frequency === "WEEKLY" || frequency === "CUSTOM") && !days.length) throw ErrorFactory.validation("WEEKLY/CUSTOM wajib memiliki minimal satu hari.");
    var eventType = payload.event_type || "DELAYED", timezone = payload.timezone || CONFIG.APP.DEFAULT_TIMEZONE;
    var thresholdMaximum = ["DEVIATION_ESCALATION"].indexOf(String(eventType).toUpperCase()) >= 0 ? 100 : 365;
    var thresholdValue = validateFiniteRange_(payload.threshold_value === "" || payload.threshold_value === undefined ? 0 : payload.threshold_value, "Threshold", 0, thresholdMaximum);
    if (rules.findAll(function(r) { return String(r.rule_id) !== String(payload.rule_id || "") && String(r.project_id) === String(payload.project_id) && String(r.is_active) !== "false" && String(r.event_type) === String(eventType) && String(r.frequency) === frequency && String(r.days_of_week || "") === days.join(",") && String(r.send_time || "08:00") === sendTime && String(r.timezone || CONFIG.APP.DEFAULT_TIMEZONE) === String(timezone); }).length) throw ErrorFactory.validation("Konflik: rule dengan event dan jadwal yang sama sudah ada.");
    var entity = { rule_id: payload.rule_id || id("rule"), project_id: payload.project_id || "", group_id: payload.group_id || "", template_id: payload.template_id || "", event_type: payload.event_type || "DELAYED", frequency: frequency, days_of_week: days.join(","), send_time: sendTime, timezone: payload.timezone || CONFIG.APP.DEFAULT_TIMEZONE, threshold_value: thresholdValue, is_active: payload.is_active !== false, dedupe_minutes: Math.max(1, validateFiniteRange_(payload.dedupe_minutes === "" || payload.dedupe_minutes === undefined ? 1440 : payload.dedupe_minutes, "Dedupe", 1, 43200)), max_retries: Math.min(5, Math.max(1, validateFiniteRange_(payload.max_retries === "" || payload.max_retries === undefined ? 3 : payload.max_retries, "Max retry", 1, 5))), created_at: payload.created_at || now(), updated_at: now() };
    if (payload.rule_id && rules.findById(payload.rule_id)) rules.updateById(payload.rule_id, entity); else rules.insert(entity);
    return formatSuccessResponse(entity, "Aturan notifikasi berhasil disimpan.");
  }
  function deleteRule(ruleId) {
    validateRequired(ruleId, "Rule ID");
    if (!rules.findById(ruleId)) throw ErrorFactory.notFound("Rule notifikasi", ruleId);
    return formatSuccessResponse({ deleted: rules.deleteById(ruleId), ruleId: ruleId }, "Rule notifikasi berhasil dihapus.");
  }
  function saveTemplate(payload) {
    validateRequired(payload.template_name, "Nama template");
    validateRequired(payload.channel, "Channel template");
    var channel = String(payload.channel).toUpperCase();
    if (["EMAIL", "WHATSAPP"].indexOf(channel) < 0) throw ErrorFactory.validation("Channel template tidak valid.");
    var body = String(payload.body || "");
    validateMaxLength_(payload.subject, "Subject template", 300); validateMaxLength_(body, "Body template", 10000); validateMaxLength_(payload.template_name, "Nama template", 120);
    var allowed = ["project_name", "actual_progress", "planned_progress", "deviation", "pic_name", "days_remaining"];
    var placeholders = body.match(/\{[a-z_]+\}/g) || [];
    for (var i = 0; i < placeholders.length; i++) if (allowed.indexOf(placeholders[i].slice(1, -1)) < 0) throw ErrorFactory.validation("Placeholder tidak dikenal: " + placeholders[i]);
    body = body.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/\son[a-z]+\s*=\s*(['\"]).*?\1/gi, "");
    var existing = payload.template_id && templates.findById(payload.template_id), history = [];
    if (existing) { try { history = JSON.parse(existing.version_history || "[]"); } catch (ignore) {} history.push({ version: Number(existing.template_version || 1), subject: existing.subject || "", body: existing.body || "", channel: existing.channel || channel, saved_at: existing.updated_at || now() }); }
    var entity = { template_id: payload.template_id || id("tpl"), template_name: sanitizeString(payload.template_name), channel: channel, subject: sanitizeString(payload.subject || "[System Reminder 2] Peringatan Proyek"), body: body, template_version: existing ? Number(existing.template_version || 1) + 1 : 1, version_history: JSON.stringify(history), is_active: payload.is_active !== false, created_at: existing ? existing.created_at : (payload.created_at || now()), updated_at: now() };
    if (existing) templates.updateById(payload.template_id, entity); else templates.insert(entity);
    return formatSuccessResponse(entity, "Template notifikasi berhasil disimpan.");
  }
  function rollbackTemplate(templateId, version) {
    var current = templates.findById(templateId); if (!current) throw ErrorFactory.notFound("Template notifikasi", templateId);
    var history = []; try { history = JSON.parse(current.version_history || "[]"); } catch (ignore) {}
    var target = history.filter(function(v) { return Number(v.version) === Number(version); })[0];
    if (!target) throw ErrorFactory.notFound("Versi template", version);
    return saveTemplate({ template_id: templateId, template_name: current.template_name, channel: target.channel, subject: target.subject, body: target.body, is_active: current.is_active });
  }
  function deleteTemplate(templateId) {
    validateRequired(templateId, "Template ID");
    if (!templates.findById(templateId)) throw ErrorFactory.notFound("Template notifikasi", templateId);
    return formatSuccessResponse({ deleted: templates.deleteById(templateId), templateId: templateId }, "Template notifikasi berhasil dihapus.");
  }
  function previewTemplate(payload) {
    var template = templates.findById(payload.template_id);
    if (!template) throw ErrorFactory.notFound("Template notifikasi", payload.template_id);
    return formatSuccessResponse({ subject: template.subject, body: template.body }, "Preview template berhasil dibuat.");
  }
  function getConfig() { return formatSuccessResponse({ groups: groups.findAll(), rules: rules.findAll(), templates: templates.findAll() }); }
  function getRulesForProject(projectId) { var project = ProjectRepository.findById(projectId); if (project && ["COMPLETED","CANCELLED","ARCHIVED"].indexOf(String(project.status).toUpperCase()) >= 0) return []; return rules.findAll(function(r) { return String(r.project_id) === String(projectId) && String(r.is_active) !== "false"; }); }
  function getRulesForEvent(eventType) { var types = String(eventType).toUpperCase() === "ADMINISTRATIVE_REMINDER" ? ["ADMINISTRATIVE_REMINDER","DOCUMENT_EXPIRING","APPROVAL_PENDING","PAYMENT_DUE","COMPLIANCE_DEADLINE"] : [String(eventType).toUpperCase()]; return rules.findAll(function(r) { return types.indexOf(String(r.event_type).toUpperCase()) >= 0 && !r.project_id && String(r.is_active) !== "false"; }); }
  function saveAdminItem(payload) { validateRequired(payload.title, "Judul administrasi"); validateMaxLength_(payload.description, "Deskripsi administrasi", 5000); var status = sanitizeString(payload.status || "OPEN").toUpperCase(); if (["OPEN","IN_PROGRESS","COMPLETED","CANCELLED"].indexOf(status) < 0) throw ErrorFactory.validation("Status administrasi tidak valid."); var entity = { item_id: payload.item_id || id("adm"), title: sanitizeString(payload.title), description: sanitizeString(payload.description || ""), category: sanitizeString(payload.category || "GENERAL"), status: status, due_date: payload.due_date || "", threshold_days: validateFiniteRange_(payload.threshold_days === "" || payload.threshold_days === undefined ? 0 : payload.threshold_days, "Threshold administrasi", 0, 365), owner: sanitizeString(payload.owner || ""), rule_id: payload.rule_id || "", last_notified_at: payload.last_notified_at || "", is_active: payload.is_active !== false && ["COMPLETED","CANCELLED"].indexOf(status) < 0, created_at: payload.created_at || now(), updated_at: now() }; if (payload.item_id && adminItems.findById(payload.item_id)) adminItems.updateById(payload.item_id, entity); else adminItems.insert(entity); return formatSuccessResponse(entity, "Item administrasi berhasil disimpan."); }
  function deleteAdminItem(itemId) { if (!adminItems.findById(itemId)) throw ErrorFactory.notFound("Item administrasi", itemId); return formatSuccessResponse({ deleted: adminItems.deleteById(itemId), itemId: itemId }, "Item administrasi berhasil dihapus."); }
  function getAdminItems() { return formatSuccessResponse({ items: adminItems.findAll() }); }
  function updateAdminItem(itemId, updates) { if (!adminItems.findById(itemId)) throw ErrorFactory.notFound("Item administrasi", itemId); adminItems.updateById(itemId, updates); return adminItems.findById(itemId); }
  function isHoliday(date, timezone) { var key = Utilities.formatDate(date, timezone || CONFIG.APP.DEFAULT_TIMEZONE, "yyyy-MM-dd"); return holidays.findAll(function(h) { return String(h.holiday_date).substring(0, 10) === key && String(h.is_active) !== "false"; }).length > 0; }
  function isRuleDue(rule, date) {
    if (!rule || String(rule.frequency).toUpperCase() === "EVENT") return false;
    var d = date || new Date();
    var timezone = rule.timezone || CONFIG.APP.DEFAULT_TIMEZONE;
    var localDate = Utilities.formatDate(d, timezone, "yyyy-MM-dd");
    var localTime = Utilities.formatDate(d, timezone, "HH:mm");
    var localDay = Number(Utilities.formatDate(d, timezone, "u"));
    if (isHoliday(d, timezone)) return false;
    var days = split(rule.days_of_week).map(Number);
    var frequency = String(rule.frequency).toUpperCase();
    if ((frequency === "WEEKLY" || frequency === "CUSTOM") && days.length && days.indexOf(localDay) < 0) return false;
    if (frequency === "DAILY" && rule.days_of_week && days.length && days.indexOf(localDay) < 0) return false;
    return localTime === String(rule.send_time || "08:00") || (localTime.substring(0, 2) === String(rule.send_time || "08:00").substring(0, 2) && localTime < String(rule.send_time || "08:00"));
  }
  function getRecipients(projectId, groupId) { var g = groupId ? groups.findById(groupId) : groups.findOneByField("project_id", projectId); return g && String(g.is_active) !== "false" ? g : null; }
  function getTemplate(templateId) { return templateId ? templates.findById(templateId) : null; }
  function shouldSend(dedupeKey, recipient, minutes) {
    var content = arguments.length > 3 ? arguments[3] : null, effectiveKey = buildDedupeKey(dedupeKey, content);
    if (minutes === undefined) { minutes = recipient; recipient = ""; }
    var cutoff = Date.now() - Number(minutes || 1440) * 60000;
    return deliveries.findAll(function(d) {
      return d.dedupe_key === effectiveKey && (!recipient || d.recipient === recipient) && d.status === "SENT";
    }).length === 0;
  }
  function recordDelivery(data) {
    var status = ["QUEUED", "SENT", "FAILED", "SKIPPED"].indexOf(data.status) >= 0 ? data.status : "FAILED";
    var entity = { delivery_id: id("dlv"), dedupe_key: buildDedupeKey(data.dedupe_key, data.payload), project_id: data.project_id || "", rule_id: data.rule_id || "", channel: data.channel, recipient: data.recipient, status: status, attempts: data.attempts || 0, last_error: data.last_error || data.reason || "", provider_id: data.provider_id || "", payload: data.payload ? JSON.stringify(data.payload) : "", sent_at: status === "SENT" ? now() : "", created_at: now() };
    deliveries.insert(entity); return entity;
  }
  function updateDelivery(deliveryId, updates) { if (!deliveries.findById(deliveryId)) throw ErrorFactory.notFound("Delivery", deliveryId); deliveries.updateById(deliveryId, updates); return deliveries.findById(deliveryId); }
  function getDeliveries(filters) {
    var opts = filters || {}, list = deliveries.findAll();
    if (opts.status) list = list.filter(function(d) { return d.status === opts.status; });
    if (opts.project_id) list = list.filter(function(d) { return String(d.project_id) === String(opts.project_id); });
    list.sort(function(a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
    return formatSuccessResponse({ total: list.length, deliveries: list.slice(0, Number(opts.limit || 100)).map(function(d) { var copy = {}; Object.keys(d).forEach(function(k) { if (k !== "payload") copy[k] = d[k]; }); return copy; }) });
  }
  function retryDelivery(deliveryId) {
    var failed = deliveries.findById(deliveryId);
    if (!failed || failed.status !== "FAILED") throw ErrorFactory.validation("Delivery gagal tidak ditemukan atau sudah diproses.");
    var rule = rules.findById(failed.rule_id), max = Number(rule && rule.max_retries || 3);
    if (Number(failed.attempts || 0) >= max) throw ErrorFactory.validation("Batas retry delivery sudah tercapai.");
    var payload = {}; try { payload = JSON.parse(failed.payload || "{}"); } catch (ignore) {}
    var queued = recordDelivery({ dedupe_key: failed.dedupe_key, project_id: failed.project_id, rule_id: failed.rule_id, channel: failed.channel, recipient: failed.recipient, status: "QUEUED", attempts: failed.attempts, payload: payload });
    var detail;
    if (failed.channel === "EMAIL") detail = EmailHelper.sendEmailDetailed(failed.recipient, payload.subject || "[System Reminder 2] Notifikasi", payload.htmlBody || payload.body || "", payload.plainText, payload.cc, payload.bcc);
    else detail = FonnteHelper.sendMessageDetailed(failed.recipient, payload.message || "");
    var result = recordDelivery({ dedupe_key: failed.dedupe_key, project_id: failed.project_id, rule_id: failed.rule_id, channel: failed.channel, recipient: failed.recipient, status: detail.sent ? "SENT" : "FAILED", attempts: Number(failed.attempts || 0) + 1, provider_id: detail.providerId, last_error: detail.error, payload: payload });
    return formatSuccessResponse({ queued: queued, delivery: result }, detail.sent ? "Delivery berhasil di-retry." : "Retry gagal, delivery tetap FAILED.");
  }
  function retryFailedDeliveries(limit) {
    var failed = deliveries.findAll(function(d) { return d.status === "FAILED"; }).slice(0, Number(limit || 20)), processed = 0;
    failed.forEach(function(d) { try { retryDelivery(d.delivery_id); processed++; } catch (ignore) {} });
    return { processed: processed, inspected: failed.length };
  }
  return { saveGroup: saveGroup, deleteGroup: deleteGroup, saveRule: saveRule, deleteRule: deleteRule, saveTemplate: saveTemplate, rollbackTemplate: rollbackTemplate, deleteTemplate: deleteTemplate, previewTemplate: previewTemplate, getConfig: getConfig, getRulesForProject: getRulesForProject, getRulesForEvent: getRulesForEvent, saveAdminItem: saveAdminItem, deleteAdminItem: deleteAdminItem, getAdminItems: getAdminItems, updateAdminItem: updateAdminItem, getTemplate: getTemplate, isRuleDue: isRuleDue, getRecipients: getRecipients, shouldSend: shouldSend, recordDelivery: recordDelivery, updateDelivery: updateDelivery, getDeliveries: getDeliveries, retryDelivery: retryDelivery, retryFailedDeliveries: retryFailedDeliveries, split: split };
})();
