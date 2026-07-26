(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const timers = new Map();
  const ACCESS_SECONDS = 10;
  const SUBMENU_SECONDS = 10;

  function setActive(element, active) {
    if (!element) return;
    element.style.removeProperty("display");
    element.classList.toggle("active", Boolean(active));
    element.setAttribute("aria-hidden", active ? "false" : "true");
  }

  function stopTimer(key) {
    const timer = timers.get(key);
    if (timer) window.clearInterval(timer);
    timers.delete(key);
  }

  function focusOpened(element) {
    if (!element) return;
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - 18);
        window.scrollTo({ top, behavior: "smooth" });
      }, 60);
    });
  }

  function countdown(key, seconds, element, template, done) {
    stopTimer(key);
    let remaining = Math.max(0, Number(seconds) || 0);
    const update = () => {
      if (element) element.textContent = String(template || "{n}").replace("{n}", remaining);
    };
    update();
    if (!remaining) {
      if (typeof done === "function") done();
      return;
    }
    const timer = window.setInterval(() => {
      remaining -= 1;
      update();
      if (remaining <= 0) {
        stopTimer(key);
        if (typeof done === "function") done();
      }
    }, 1000);
    timers.set(key, timer);
  }

  function closeActivationSubmenus() {
    document.querySelectorAll(".submenu-gerar-combinacoes, .submenu-gerador11, .submenu-digits-mass, .submenu-trial, .submenu-vip").forEach((el) => setActive(el, false));
    document.querySelectorAll('[data-jc-action="open-config"], [data-jc-action="open-activator"], [data-jc-action="open-digits-mass"], [data-jc-action="open-trial"], [data-jc-action="open-vip"]').forEach((button) => button.setAttribute("aria-expanded", "false"));
    stopTimer("config");
    stopTimer("activator11");
    stopTimer("activator16");
    stopTimer("activatorsMass");
    stopTimer("trial");
    stopTimer("vip");
    resetPreview();
  }

  function closePackageSubmenus(except) {
    document.querySelectorAll('.jc-package-submenu[data-package="btv"], .jc-package-submenu[data-package="stv"], .jc-package-submenu[data-package="xplus"], .jc-package-submenu[data-package="eaigo"]').forEach((el) => {
      if (el.dataset.package !== except) setActive(el, false);
    });
    document.querySelectorAll('[data-jc-action="open-package"]').forEach((button) => {
      if (button.dataset.jcPackage !== except) button.setAttribute("aria-expanded", "false");
    });
    ["btv", "stv", "xplus", "eaigo"].forEach((slug) => {
      if (slug !== except) stopTimer("package:" + slug);
    });
  }

  function resetPreview() {
    const box = $("preview_box");
    const content = $("preview_content");
    const status = $("status_bar");
    if (box) box.classList.remove("visible", "preview-config-bg", "preview-11-bg");
    if (content) content.innerHTML = "";
    if (status) status.className = "status-bar";
  }

  function mainSectionCard(section) {
    if (section === "activation") return $("activation_full_toggle")?.closest(".activation-card-real") || null;
    if (section === "package") return $("pacote_apk_full_toggle")?.closest(".pacote-apk-card, .pacote-apk-card-real") || null;
    return null;
  }

  function setMainSectionClosed(section, closed) {
    const card = mainSectionCard(section);
    if (!card) return;
    card.classList.toggle("menu-closed", Boolean(closed));
    const toggle = section === "activation" ? $("activation_full_toggle") : $("pacote_apk_full_toggle");
    const icon = section === "activation" ? $("activation_full_toggle_icon") : $("pacote_apk_full_toggle_icon");
    if (toggle) toggle.setAttribute("aria-expanded", closed ? "false" : "true");
    if (icon) icon.textContent = closed ? "▸" : "▾";
    if (closed && section === "activation") closeActivationSubmenus("");
    if (closed && section === "package") closePackageSubmenus("");
  }

  function openMainSection(section) {
    if (section !== "activation") setMainSectionClosed("activation", true);
    if (section !== "package") setMainSectionClosed("package", true);
    setMainSectionClosed(section, false);
    document.dispatchEvent(new CustomEvent("jc:main-section-open", { detail: { section } }));
  }

  function openConfig() {
    openMainSection("activation");
    closePackageSubmenus("");
    closeActivationSubmenus("config");
    $("btn_gerar")?.setAttribute("aria-expanded", "true");
    const notice = $("config_notice");
    const count = $("config_notice_count");
    setActive(notice, true);
    focusOpened($("btn_gerar"));
    countdown("config", SUBMENU_SECONDS, count, "Gerando pré-visualização em {n} segundos...", () => {
      ["config_download_tools", "btn_config_pack", "btn_unitv_codigos", "btn_versao"].forEach((id) => setActive($(id), true));
      document.dispatchEvent(new CustomEvent("jc:config-preview-ready"));
    });
  }

  function openActivator(type) {
    const normalized = String(type) === "11" ? "11" : "16";
    const key = "activator" + normalized;
    openMainSection("activation");
    closePackageSubmenus("");
    closeActivationSubmenus(key);

    // Mantém a lógica original do ZIP: primeiro exibe a mensagem própria e a
    // mini tela; após 10 segundos abre somente o painel escolhido.
    stopTimer(key);
    setActive($("ativador" + normalized + "_notice"), true);
    focusOpened($(normalized === "11" ? "btn_gerador11_11" : "btn_gerador11"));
    const panelId = normalized === "11" ? "painel_gerador11_visual_11" : "painel_gerador11_visual";
    const accessId = normalized === "11" ? "btn_ativador_5100_11" : "btn_ativador_5100";
    $(normalized === "11" ? "btn_gerador11_11" : "btn_gerador11")?.setAttribute("aria-expanded", "true");
    countdown(key, SUBMENU_SECONDS, $("ativador" + normalized + "_notice_count"), "Abrindo submenu em {n} segundos...", () => {
      setActive($(panelId), true);
      setActive($(accessId), true);
    });
  }

  function openTrial() {
    openMainSection("activation");
    closePackageSubmenus("");
    closeActivationSubmenus();
    setActive($("trial_notice"), true);
    $("btn_trial_3_days")?.setAttribute("aria-expanded", "true");
    focusOpened($("btn_trial_3_days"));
    countdown("trial", SUBMENU_SECONDS, $("trial_notice_count"), "Abrindo o teste gratuito em {n} segundos...", () => {
      setActive($("trial_panel"), true);
    });
  }

  function openVip() {
    openMainSection("activation");
    closePackageSubmenus("");
    closeActivationSubmenus();
    setActive($("vip_notice"), true);
    $("btn_activator_vip")?.setAttribute("aria-expanded", "true");
    focusOpened($("btn_activator_vip"));
    countdown("vip", SUBMENU_SECONDS, $("vip_notice_count"), "Abrindo o Ativador VIP em {n} segundos...", () => {
      setActive($("vip_panel"), true);
    });
  }

  function openDigitsMass() {
    openMainSection("activation");
    closePackageSubmenus("");
    closeActivationSubmenus();
    setActive($("digits_mass_notice"), true);
    $("btn_digits_mass")?.setAttribute("aria-expanded", "true");
    focusOpened($("btn_digits_mass"));
    countdown("activatorsMass", SUBMENU_SECONDS, $("digits_mass_notice_count"), "Abrindo gerador em massa em {n} segundos...", () => {
      setActive($("digits_mass_panel"), true);
    });
  }

  function openPackage(slug) {
    const safe = ["btv", "stv", "xplus", "eaigo"].includes(String(slug)) ? String(slug) : "";
    if (!safe) return;
    openMainSection("package");
    closeActivationSubmenus("");
    closePackageSubmenus(safe);
    const section = $("jc_pacote_submenu_" + safe);
    const tools = $("jc_package_tools_" + safe);
    const access = $("btn_pacote_" + safe + "_acessar");
    const count = $("jc_package_count_" + safe);
    setActive(section, true);
    document.querySelector(`[data-jc-action="open-package"][data-jc-package="${safe}"]`)?.setAttribute("aria-expanded", "true");
    if (tools) {
      tools.classList.add("jc-package-tools-locked");
      tools.setAttribute("aria-hidden", "true");
    }
    if (access) {
      access.disabled = true;
      access.classList.add("jc-package-access-locked");
    }
    countdown("package:" + safe, SUBMENU_SECONDS, count, "GERANDO PRÉ-VISUALIZAÇÃO EM {n} SEGUNDOS...", () => {
      if (tools) {
        tools.classList.remove("jc-package-tools-locked");
        tools.setAttribute("aria-hidden", "false");
      }
      if (access) {
        access.disabled = false;
        access.classList.remove("jc-package-access-locked");
      }
      if (count) count.textContent = "PRÉ-VISUALIZAÇÃO CONCLUÍDA.";
    });
  }

  function toggleCard(toggleId, cardSelector, iconId, section) {
    const toggle = $(toggleId);
    const card = toggle?.closest(cardSelector) || document.querySelector(cardSelector);
    if (!card) return;
    const opening = card.classList.contains("menu-closed");
    if (opening && section) {
      openMainSection(section);
      return;
    }
    card.classList.toggle("menu-closed");
    const closed = card.classList.contains("menu-closed");
    const icon = $(iconId);
    if (icon) icon.textContent = closed ? "▸" : "▾";
    if (toggle) toggle.setAttribute("aria-expanded", closed ? "false" : "true");
    if (closed && section === "activation") closeActivationSubmenus("");
    if (closed && section === "package") closePackageSubmenus("");
  }

  function toggleTutorial(header) {
    const root = header?.closest(".tutorial-card-real, .tutorial-section, .tutorial-container, .tutorial-block") || header?.parentElement;
    const content = root?.querySelector(".tutorial-body, .tutorial-toggle-content, .tutorial-content, [data-tutorial-content]");
    if (!root || !content) return;
    const active = !root.classList.contains("open");
    root.classList.toggle("open", active);
    content.classList.toggle("active", active);
    header.setAttribute("aria-expanded", active ? "true" : "false");
  }

  function setStatus(id, message, ok) {
    const el = $(id);
    if (!el) return;
    el.textContent = message || "";
    el.style.color = ok === false ? "#ffd5d5" : "#8fffc8";
  }

  function setCode(id, value) {
    const el = $(id);
    if (!el) return;
    const code = String(value || "");
    el.textContent = code || "-------";
    el.dataset.codigoAtual = code;
  }

  function getCode(id) {
    const el = $(id);
    return String(el?.dataset.codigoAtual || el?.textContent || "").trim();
  }

  function resetPanel(type) {
    const normalized = String(type) === "11" ? "11" : "16";
    setCode("download_code_" + normalized, "");
    setCode("download_code_" + normalized + "_right", "");
    setStatus("activation_status_" + normalized, "Painel pronto para gerar código.", true);
  }

  async function copyText(text, button) {
    const value = String(text || "").trim();
    if (!value || /^-+$/.test(value) || /CLIQUE EM GERAR/i.test(value)) throw new Error("Gere um código antes de copiar.");
    if (window.JC_APP?.copy) await window.JC_APP.copy(value);
    else if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      if (!document.execCommand("copy")) throw new Error("Não foi possível copiar automaticamente.");
      area.remove();
    }
    if (button) {
      const old = button.dataset.jcOriginalText || button.textContent;
      button.dataset.jcOriginalText = old;
      button.textContent = "COPIADO!";
      window.setTimeout(() => { button.textContent = old; }, 1400);
    }
  }

  function openUnitvCodes() {
    const modal = $("jc_unitv_codes_modal");
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  }

  function closeUnitvCodes() {
    const modal = $("jc_unitv_codes_modal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  function clearCounters() {
    Object.keys(localStorage).filter((key) => /click|contador|counter/i.test(key)).forEach((key) => localStorage.removeItem(key));
    document.querySelectorAll('[id^="count_"], [data-jc-counter]').forEach((el) => { el.textContent = "0"; });
    window.JC_APP?.toast?.("Contagem visual limpa.");
  }

  function formatMac(input) {
    const raw = String(input.value || "").toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 4);
    input.value = raw.replace(/(.{2})(?=.)/g, "$1:");
    input.closest(".activation-mac-center")?.classList.toggle("has-value", Boolean(input.value));
  }

  function showAccessWait(userType) {
    let overlay = $("telaEsperaAntesAcesso");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "telaEsperaAntesAcesso";
      overlay.style.cssText = "position:fixed;inset:0;z-index:9999999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(3,8,12,.96),rgba(0,35,22,.98));backdrop-filter:blur(10px);font-family:var(--mono,monospace);color:#eafff3;padding:20px";
      overlay.innerHTML = '<div style="width:min(520px,94vw);border:1px solid rgba(0,230,118,.28);border-radius:26px;background:rgba(5,14,20,.92);box-shadow:0 24px 80px rgba(0,0,0,.55);padding:30px;text-align:center"><div style="font-size:34px;margin-bottom:12px">🟢</div><div style="font-size:18px;font-weight:800;letter-spacing:.12em;color:#b8ffd8;margin-bottom:12px">PREPARANDO ACESSO</div><div style="font-size:12px;line-height:1.8;color:#b9d8c7;margin-bottom:18px">Aguarde enquanto o sistema prepara a plataforma.</div><div style="height:12px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin-bottom:16px"><div id="barraEsperaAcesso" style="width:0;height:100%;background:linear-gradient(90deg,#00e676,#1dff95);border-radius:999px;transition:width .3s linear"></div></div><div id="contadorEsperaAcesso" style="font-size:13px;font-weight:800;color:#1dff95">10s</div></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = "flex";
    let remaining = ACCESS_SECONDS;
    const count = $("contadorEsperaAcesso");
    const bar = $("barraEsperaAcesso");
    stopTimer("access");
    const finish = () => {
      try {
        sessionStorage.setItem("jc_apk_token", "ativo");
        sessionStorage.setItem("jc_apk_tipo_usuario", String(userType || "client"));
      } catch (_) {}
      overlay.style.display = "none";
      if ($("tokenLock")) $("tokenLock").style.display = "none";
    };
    if (count) count.textContent = remaining + "s";
    if (bar) bar.style.width = "0%";
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (count) count.textContent = Math.max(0, remaining) + "s";
      if (bar) bar.style.width = Math.min(100, ((ACCESS_SECONDS - remaining) / ACCESS_SECONDS) * 100) + "%";
      if (remaining <= 0) {
        stopTimer("access");
        finish();
      }
    }, 1000);
    timers.set("access", timer);
  }

  function initialize() {
    // Padrão aprovado no ZIP 3.0.2.0: os cards principais começam abertos, mas
    // nenhum submenu interno fica despejado na tela. O clique foca só a opção.
    setMainSectionClosed("activation", false);
    setMainSectionClosed("package", false);
    closeActivationSubmenus();
    closePackageSubmenus("");
    const showPass = $("showPass");
    showPass?.addEventListener("change", () => { if ($("login_pass")) $("login_pass").type = showPass.checked ? "text" : "password"; });
    [$("login_user"), $("login_pass")].filter(Boolean).forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.querySelector('[data-jc-action="login"]')?.click();
      }
    }));
    $("mac_input")?.addEventListener("input", (event) => formatMac(event.currentTarget));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeUnitvCodes(); });
    $("jc_unitv_codes_modal")?.addEventListener("click", (event) => { if (event.target.id === "jc_unitv_codes_modal") closeUnitvCodes(); });
  }

  window.liberarSistemaAposEspera = showAccessWait;
  window.JC_GENERATOR_UI = {
    initialize,
    openConfig,
    openActivator,
    openTrial,
    openVip,
    openDigitsMass,
    openPackage,
    closeActivationSubmenus,
    closePackageSubmenus,
    toggleActivationMenu: () => toggleCard("activation_full_toggle", ".activation-card-real", "activation_full_toggle_icon", "activation"),
    togglePackageMenu: () => toggleCard("pacote_apk_full_toggle", ".pacote-apk-card, .pacote-apk-card-real", "pacote_apk_full_toggle_icon", "package"),
    toggleTutorial,
    setStatus,
    setCode,
    getCode,
    resetPanel,
    copyText,
    openUnitvCodes,
    closeUnitvCodes,
    clearCounters,
    resetPreview,
    setActive,
    openMainSection,
    setMainSectionClosed,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
