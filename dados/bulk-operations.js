(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let bound = false;

  function setStatus(message, error) {
    const element = $("jc_config_bulk_status");
    if (!element) return;
    element.textContent = String(message || "");
    element.classList.toggle("is-error", Boolean(error));
  }

  function openConfigBulk() {
    const box = $("jc_config_bulk_box");
    if (!box) return;
    box.hidden = false;
    box.classList.add("is-open");
    setStatus("Escolha de 1 a 50 arquivos. O Supabase só será consultado depois da confirmação.");
    window.setTimeout(() => $("jc_config_bulk_quantity")?.focus({ preventScroll: true }), 40);
  }

  async function generateBulk() {
    const input = $("jc_config_bulk_quantity");
    const button = $("jc_config_bulk_generate");
    const quantity = Math.trunc(Number(input?.value || 0));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 50) {
      setStatus("Informe uma quantidade entre 1 e 50.", true);
      input?.focus();
      return;
    }
    if (!window.confirm(`Preparar ${quantity} arquivo(s) CONFIG e baixar um único ZIP?`)) {
      setStatus("Operação cancelada. Nenhuma consulta foi feita.");
      return;
    }
    if (!window.JC_CONFIG_DOWNLOAD?.bulk) {
      setStatus("O gerador de CONFIG ainda não carregou. Aguarde e tente novamente.", true);
      return;
    }
    if (button) {
      button.disabled = true;
      button.dataset.originalText ||= button.textContent;
      button.textContent = "PREPARANDO...";
    }
    try {
      const result = await window.JC_CONFIG_DOWNLOAD.bulk(quantity, (progress) => {
        setStatus(progress?.message || `Preparando ${progress?.current || 0} de ${progress?.total || quantity}...`);
      });
      const partial = Number(result?.delivered || 0) < Number(result?.requested || quantity);
      setStatus(partial
        ? `ZIP entregue com ${result.delivered} arquivo(s). O lote parou antes do fim para não repetir nem consumir arquivos com falha.`
        : `ZIP entregue com ${result.delivered} arquivo(s) CONFIG.`);
      window.JC_APP?.toast?.(partial ? "ZIP parcial entregue com segurança." : "ZIP de CONFIG concluído.", partial ? "warning" : "success");
    } catch (error) {
      setStatus(error?.message || "Não foi possível preparar o ZIP de CONFIG.", true);
      window.JC_APP?.toast?.(error?.message || "Não foi possível preparar o ZIP de CONFIG.", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = button.dataset.originalText || "GERAR ZIP";
      }
    }
  }

  function bind() {
    if (bound) return;
    const configChoice = document.querySelector('[data-jc-batch="config"]');
    const generate = $("jc_config_bulk_generate");
    if (!configChoice || !generate) return;
    bound = true;
    configChoice.addEventListener("click", openConfigBulk);
    generate.addEventListener("click", generateBulk);
    $("jc_config_bulk_quantity")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") generateBulk();
    });
    document.querySelectorAll('[data-jc-batch]:not([data-jc-batch="config"])').forEach((button) => {
      button.addEventListener("click", () => {
        const box = $("jc_config_bulk_box");
        if (box) { box.hidden = true; box.classList.remove("is-open"); }
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
  document.addEventListener("jc:access-ready", bind);
})();
