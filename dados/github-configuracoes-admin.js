(function () {
  "use strict";

  const CACHE_KEY = "jc_github_usage_v1";
  const CACHE_MS = 60 * 60 * 1000;

  const projects = [
    {
      id: "painel",
      title: "Painel JC-APK TV",
      icon: "🖥️",
      type: "repo",
      typeLabel: "Repositório do painel",
      apiUrl: "https://api.github.com/repos/JoaoJMuniz19/Painel-JC-APK-TV",
      openUrl: "https://github.com/JoaoJMuniz19/Painel-JC-APK-TV",
      updateUrl: "https://github.com/JoaoJMuniz19/Painel-JC-APK-TV/upload/main",
      updateLabel: "Enviar atualização"
    },
    {
      id: "autoatendimento",
      title: "Autoatendimento",
      icon: "🤖",
      type: "repo",
      typeLabel: "Repositório do atendente",
      apiUrl: "https://api.github.com/repos/JoaoJMuniz19/autoatendimento",
      openUrl: "https://github.com/JoaoJMuniz19/autoatendimento",
      updateUrl: "https://github.com/JoaoJMuniz19/autoatendimento/upload/main",
      updateLabel: "Enviar atualização"
    },
    {
      id: "downloads",
      title: "Downloads dos APKs",
      icon: "📦",
      type: "release",
      typeLabel: "Release downloads-oficiais",
      apiUrl: "https://api.github.com/repos/JoaoJMuniz19/JC-APK-TV-Downloads/releases/tags/downloads-oficiais",
      openUrl: "https://github.com/JoaoJMuniz19/JC-APK-TV-Downloads/releases/tag/downloads-oficiais",
      updateUrl: "https://github.com/JoaoJMuniz19/JC-APK-TV-Downloads/releases/edit/downloads-oficiais",
      updateLabel: "Editar Release"
    },
    {
      id: "midias",
      title: "Mídias",
      icon: "🎵",
      type: "release",
      typeLabel: "Release musicas-oficiais",
      apiUrl: "https://api.github.com/repos/JoaoJMuniz19/JC-APK-TV-Midias/releases/tags/musicas-oficiais",
      openUrl: "https://github.com/JoaoJMuniz19/JC-APK-TV-Midias/releases/tag/musicas-oficiais",
      updateUrl: "https://github.com/JoaoJMuniz19/JC-APK-TV-Midias/releases/edit/musicas-oficiais",
      updateLabel: "Editar Release"
    },
    {
      id: "roms",
      title: "ROM TV Box",
      icon: "💾",
      type: "release",
      typeLabel: "Release ROM-TV-BOX",
      apiUrl: "https://api.github.com/repos/JoaoJMuniz19/Rom-TV-BOX/releases/tags/ROM-TV-BOX",
      openUrl: "https://github.com/JoaoJMuniz19/Rom-TV-BOX/releases/tag/ROM-TV-BOX",
      updateUrl: "https://github.com/JoaoJMuniz19/Rom-TV-BOX/releases/edit/ROM-TV-BOX",
      updateLabel: "Editar Release"
    }
  ];

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const amount = value / Math.pow(1024, index);
    const decimals = index >= 3 ? 2 : index === 2 ? 1 : 0;
    return `${amount.toLocaleString("pt-BR", { maximumFractionDigits: decimals })} ${units[index]}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.savedAt && Array.isArray(parsed.items) ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function saveCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
    } catch (_error) {
      // O funcionamento não depende do cache local.
    }
  }

  async function githubJson(url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      let message = `GitHub respondeu ${response.status}`;
      try {
        const body = await response.json();
        if (body && body.message) message = body.message;
      } catch (_error) {}
      throw new Error(message);
    }
    return response.json();
  }

  async function loadProject(project) {
    try {
      const data = await githubJson(project.apiUrl);
      if (project.type === "repo") {
        return {
          ...project,
          bytes: Number(data.size || 0) * 1024,
          items: null,
          updatedAt: data.pushed_at || data.updated_at || null,
          detail: "Tamanho do repositório"
        };
      }

      const assets = Array.isArray(data.assets) ? data.assets : [];
      const bytes = assets.reduce((sum, asset) => sum + Number(asset && asset.size || 0), 0);
      const lastAssetUpdate = assets.reduce((latest, asset) => {
        const value = asset && (asset.updated_at || asset.created_at);
        return value && (!latest || new Date(value) > new Date(latest)) ? value : latest;
      }, null);

      return {
        ...project,
        bytes,
        items: assets.length,
        updatedAt: lastAssetUpdate || data.published_at || data.updated_at || null,
        detail: "Arquivos publicados na Release"
      };
    } catch (error) {
      return {
        ...project,
        bytes: 0,
        items: null,
        updatedAt: null,
        detail: "Não foi possível consultar",
        error: error && error.message ? error.message : String(error)
      };
    }
  }

  function render(items, source) {
    const validItems = items.filter((item) => !item.error);
    const totalBytes = validItems.reduce((sum, item) => sum + Number(item.bytes || 0), 0);
    const releaseAssets = validItems
      .filter((item) => item.type === "release")
      .reduce((sum, item) => sum + Number(item.items || 0), 0);
    const maxBytes = Math.max(1, ...validItems.map((item) => Number(item.bytes || 0)));

    $("totalSize").textContent = formatBytes(totalBytes);
    $("releaseAssetCount").textContent = releaseAssets.toLocaleString("pt-BR");
    $("projectCount").textContent = projects.length.toLocaleString("pt-BR");

    $("repoGrid").innerHTML = items.map((item) => {
      const percent = item.error ? 0 : Math.max(2, Math.round((Number(item.bytes || 0) / maxBytes) * 100));
      const itemLabel = item.type === "release"
        ? `${Number(item.items || 0).toLocaleString("pt-BR")} arquivo(s)`
        : "Branch principal";

      return `
        <article class="repo${item.error ? " error" : ""}">
          <div class="repo-top">
            <div class="repo-title">
              <div class="repo-icon">${escapeHtml(item.icon)}</div>
              <div><h3>${escapeHtml(item.title)}</h3><div class="repo-type">${escapeHtml(item.typeLabel)}</div></div>
            </div>
            <div class="repo-size">${item.error ? "Indisponível" : formatBytes(item.bytes)}<small>${escapeHtml(item.detail)}</small></div>
          </div>
          <div class="bar" aria-label="Comparação visual de uso"><span style="width:${percent}%"></span></div>
          <div class="meta">
            <div><small>Conteúdo</small><b>${escapeHtml(item.error ? item.error : itemLabel)}</b></div>
            <div><small>Última atualização</small><b>${escapeHtml(item.error ? "—" : formatDate(item.updatedAt))}</b></div>
          </div>
          <div class="repo-actions">
            <a class="btn" href="${escapeHtml(item.openUrl)}" target="_blank" rel="noopener">Abrir no GitHub</a>
            <a class="btn update" href="${escapeHtml(item.updateUrl)}" target="_blank" rel="noopener">${escapeHtml(item.updateLabel)}</a>
          </div>
        </article>`;
    }).join("");

    $("loadingState").hidden = true;
    $("usagePanel").hidden = false;
    const errors = items.filter((item) => item.error).length;
    $("status").className = errors ? "status error" : "status";
    $("status").textContent = errors
      ? `${errors} item(ns) não puderam ser consultados. Os atalhos continuam funcionando.`
      : source === "cache"
        ? "Dados carregados do cache local de 1 hora."
        : "Dados atualizados diretamente do GitHub.";
  }

  async function load(force) {
    const cached = readCache();
    if (!force && cached && Date.now() - cached.savedAt < CACHE_MS) {
      render(cached.items, "cache");
      return;
    }

    $("refreshBtn").disabled = true;
    $("status").className = "status";
    $("status").textContent = "Consultando cinco áreas públicas do GitHub...";
    $("loadingState").hidden = false;
    $("usagePanel").hidden = true;

    const items = await Promise.all(projects.map(loadProject));
    saveCache(items);
    render(items, "github");
    $("refreshBtn").disabled = false;
  }

  $("refreshBtn").addEventListener("click", function () {
    load(true).catch((error) => {
      $("status").className = "status error";
      $("status").textContent = `Falha ao atualizar: ${error && error.message ? error.message : error}`;
      $("refreshBtn").disabled = false;
    });
  });

  load(false).catch((error) => {
    $("loadingState").hidden = true;
    $("status").className = "status error";
    $("status").textContent = `Falha ao carregar: ${error && error.message ? error.message : error}`;
    $("refreshBtn").disabled = false;
  });
})();
