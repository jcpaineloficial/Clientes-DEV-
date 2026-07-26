(function(){
  'use strict';

  const STORAGE = 'jc_v2_access_preview_v5';
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch (_) { return {}; } };
  const save = (data) => { try { localStorage.setItem(STORAGE, JSON.stringify(data)); } catch (_) {} };
  const nameOf = (group) => group.querySelector('.perm-head strong')?.textContent?.trim() || 'Função';
  const idOf = (group) => [...group.classList].find((x) => x.startsWith('perm-group-') && x !== 'perm-group')?.replace('perm-group-', '') || nameOf(group).toLowerCase().replace(/\W+/g, '-');

  function addIntro(){
    const tree = document.querySelector('#permissionTree');
    if (!tree || document.querySelector('.jc-v2-client-rule')) return;
    const box = document.createElement('div');
    box.className = 'jc-v2-client-rule';
    box.innerHTML = '<div><strong>Como o painel do cliente ficará</strong><span>Escolha o fluxo de cada módulo e configure as funções na tabela abaixo.</span></div><span class="jc-v2-soft-tag">Prévia visual</span>';
    tree.parentNode.insertBefore(box, tree);
  }

  function addCreditProfileHint(){
    const type = document.querySelector('#accountType');
    const field = document.querySelector('#creditsField');
    if (!type || !field || field.querySelector('.jc-v2-credit-hint')) return;
    const hint = document.createElement('div');
    hint.className = 'jc-v2-credit-hint';
    hint.innerHTML = '<strong>Perfil por créditos</strong><span>Informe o saldo e libere abaixo somente as funções que o cliente poderá usar.</span>';
    field.appendChild(hint);
    const update = () => hint.classList.toggle('hidden', type.value !== 'credits');
    type.addEventListener('change', update);
    update();
  }

  function setChecked(input, checked){
    if (!input || input.checked === checked) return;
    input.checked = checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function decorate(group){
    if (group.dataset.jcV2Decorated === '1') return;
    group.dataset.jcV2Decorated = '1';

    const gid = idOf(group);
    const state = load();
    const current = state[gid] || { mode: 'none', tests: 5, consume: {} };
    const head = group.querySelector('.perm-head');
    const permissionRows = [...group.querySelectorAll(':scope > label.check')].filter((row) => row.querySelector('.perm-check'));

    const accessBox = document.createElement('div');
    accessBox.className = 'jc-v2-access-box';
    accessBox.innerHTML = `
      <div class="jc-v2-access-title"><div><strong>Acesso deste módulo</strong><span>Configure aqui, sem procurar em outras telas.</span></div></div>
      <div class="jc-v2-mode-grid">
        <label class="jc-v2-mode"><input type="radio" name="mode-${gid}" value="none" ${current.mode === 'none' ? 'checked' : ''}><span><b>Sem acesso</b><small>Vai para Painel Completo</small></span></label>
        <label class="jc-v2-mode"><input type="radio" name="mode-${gid}" value="test" ${current.mode === 'test' ? 'checked' : ''}><span><b>Licença de Teste</b><small>Quantidade limitada</small></span></label>
        <label class="jc-v2-mode"><input type="radio" name="mode-${gid}" value="unlimited" ${current.mode === 'unlimited' ? 'checked' : ''}><span><b>Acesso ilimitado</b><small>Função comprada/liberada</small></span></label>
      </div>
      <div class="jc-v2-test-options ${current.mode === 'test' ? '' : 'jc-v2-hidden'}">
        <div class="field"><label>Usos liberados para teste</label><input type="number" min="1" max="999" data-tests value="${Number(current.tests) || 5}"></div>
        <div class="jc-v2-test-help"><strong>Licença de Teste</strong><span>O cliente não vê um saldo técnico. Ele apenas usa o recurso até terminar a quantidade liberada.</span></div>
      </div>`;
    (head || group).insertAdjacentElement(head ? 'afterend' : 'afterbegin', accessBox);

    const tableHeader = document.createElement('div');
    tableHeader.className = 'jc-v2-permission-header';
    tableHeader.innerHTML = '<strong>FUNÇÃO</strong><strong>CLIENTE</strong><strong data-consume-head>CONSOME</strong>';
    accessBox.insertAdjacentElement('afterend', tableHeader);

    permissionRows.forEach((row) => {
      row.classList.add('jc-v2-permission-row');
      const clientInput = row.querySelector('.perm-check');
      const functionId = clientInput.value;
      const text = row.querySelector('span');
      const clientCell = document.createElement('span');
      clientCell.className = 'jc-v2-client-cell';
      clientCell.appendChild(clientInput);
      const consumeCell = document.createElement('span');
      consumeCell.className = 'jc-v2-consume-cell';
      const consumeInput = document.createElement('input');
      consumeInput.type = 'checkbox';
      consumeInput.className = 'jc-v2-consume-check';
      consumeInput.dataset.consumeFunction = functionId;
      consumeInput.checked = Boolean(current.consume?.[functionId]);
      consumeCell.appendChild(consumeInput);
      row.innerHTML = '';
      row.append(text, clientCell, consumeCell);
    });

    function persist(){
      const all = load();
      const consume = {};
      group.querySelectorAll('.jc-v2-consume-check').forEach((input) => {
        consume[input.dataset.consumeFunction] = input.checked;
      });
      const mode = accessBox.querySelector('input[type="radio"]:checked')?.value || 'none';
      all[gid] = {
        mode,
        tests: Number(accessBox.querySelector('[data-tests]')?.value) || 5,
        consume
      };
      save(all);
    }

    function applyMode(forceSelection){
      const mode = accessBox.querySelector('input[type="radio"]:checked')?.value || 'none';
      const clientInputs = permissionRows.map((row) => row.querySelector('.perm-check'));
      const consumeInputs = [...group.querySelectorAll('.jc-v2-consume-check')];
      const showConsume = mode === 'test';

      accessBox.querySelector('.jc-v2-test-options')?.classList.toggle('jc-v2-hidden', mode !== 'test');
      group.classList.toggle('jc-v2-no-access', mode === 'none');
      group.classList.toggle('jc-v2-test-access', mode === 'test');
      group.classList.toggle('jc-v2-unlimited-access', mode === 'unlimited');
      group.classList.toggle('jc-v2-hide-consume', !showConsume);

      if (forceSelection) {
        if (mode === 'none') {
          clientInputs.forEach((input) => setChecked(input, false));
          consumeInputs.forEach((input) => { input.checked = false; });
        } else if (mode === 'unlimited') {
          clientInputs.forEach((input) => setChecked(input, true));
          consumeInputs.forEach((input) => { input.checked = false; });
        } else if (mode === 'test') {
          clientInputs.forEach((input) => setChecked(input, true));
        }
      }

      clientInputs.forEach((input) => { input.disabled = mode === 'none'; });
      consumeInputs.forEach((input) => {
        const client = group.querySelector(`.perm-check[value="${CSS.escape(input.dataset.consumeFunction)}"]`);
        input.disabled = mode !== 'test' || !client?.checked;
        if (!client?.checked) input.checked = false;
      });

      persist();
    }

    accessBox.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => applyMode(true));
    });
    accessBox.querySelector('[data-tests]')?.addEventListener('input', persist);
    group.addEventListener('change', (event) => {
      if (event.target.matches('.perm-check')) applyMode(false);
      if (event.target.matches('.jc-v2-consume-check')) persist();
    });

    applyMode(false);
  }


  function decoratePackageMatrix(group){
    if (!group || idOf(group) !== 'packages' || group.dataset.jcPackageMatrix === '1') return;
    const originalRows = [...group.querySelectorAll(':scope > label.jc-v2-permission-row')];
    const byId = new Map();
    originalRows.forEach((row) => {
      const client = row.querySelector('.perm-check');
      const consume = row.querySelector('.jc-v2-consume-check');
      if (client) byId.set(client.value, { row, client, consume });
    });
    const apks = [
      { key:'btv', label:'BTV APK' },
      { key:'stv', label:'STV APK' },
      { key:'xplus', label:'XPLUS APK' },
      { key:'eaigo', label:'EAIGO APK' }
    ].filter((apk) => byId.has(`package.${apk.key}.open`) || byId.has(`package.${apk.key}.access`));
    if (!apks.length) return;

    group.dataset.jcPackageMatrix = '1';
    originalRows.forEach((row) => row.classList.add('jc-v2-package-source-row'));
    const header = group.querySelector('.jc-v2-permission-header');
    const matrix = document.createElement('div');
    matrix.className = 'jc-v2-package-matrix';
    matrix.innerHTML = `
      <label class="check jc-v2-permission-row jc-v2-package-action-row"><span>Acessar APK</span><span class="jc-v2-client-cell"><input type="checkbox" data-package-action="access" data-package-column="client"></span><span class="jc-v2-consume-cell"><input type="checkbox" class="jc-v2-consume-check" data-package-action="access" data-package-column="consume"></span></label>
      <label class="check jc-v2-permission-row jc-v2-package-action-row"><span>Gerar códigos de download</span><span class="jc-v2-client-cell"><input type="checkbox" data-package-action="generate" data-package-column="client"></span><span class="jc-v2-consume-cell"><input type="checkbox" class="jc-v2-consume-check" data-package-action="generate" data-package-column="consume"></span></label>
      <label class="check jc-v2-permission-row jc-v2-package-action-row"><span>Copiar código de download</span><span class="jc-v2-client-cell"><input type="checkbox" data-package-action="copy" data-package-column="client"></span><span class="jc-v2-consume-cell"><input type="checkbox" class="jc-v2-consume-check" data-package-action="copy" data-package-column="consume"></span></label>
      <div class="jc-v2-package-divider"></div>
      ${apks.map((apk)=>`<label class="check jc-v2-permission-row jc-v2-package-apk-row"><span>${apk.label}</span><span class="jc-v2-client-cell"><input type="checkbox" data-package-apk="${apk.key}" data-package-column="client"></span><span class="jc-v2-consume-cell"><input type="checkbox" class="jc-v2-consume-check" data-package-apk="${apk.key}" data-package-column="consume"></span></label>`).join('')}
    `;
    header?.insertAdjacentElement('afterend', matrix);

    const storeKey = 'jc_v2_package_matrix_v1';
    const readMatrix = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch (_) { return {}; } };
    const writeMatrix = (value) => { try { localStorage.setItem(storeKey, JSON.stringify(value)); } catch (_) {} };
    const setRaw = (entry, checked, consumeChecked) => {
      if (!entry) return;
      if (entry.client.checked !== checked) {
        entry.client.checked = checked;
        entry.client.dispatchEvent(new Event('change', { bubbles:true }));
      }
      if (entry.consume) {
        entry.consume.checked = Boolean(checked && consumeChecked);
        entry.consume.dispatchEvent(new Event('change', { bubbles:true }));
      }
    };
    const mode = () => group.querySelector('.jc-v2-access-box input[type="radio"]:checked')?.value || 'none';

    function applyMatrix(){
      const data = readMatrix();
      const currentMode = mode();
      const actionState = {};
      ['access','generate','copy'].forEach((action) => {
        const client = matrix.querySelector(`[data-package-action="${action}"][data-package-column="client"]`);
        const consume = matrix.querySelector(`[data-package-action="${action}"][data-package-column="consume"]`);
        actionState[action] = { client:Boolean(client?.checked), consume:Boolean(consume?.checked) };
      });
      apks.forEach((apk) => {
        const client = matrix.querySelector(`[data-package-apk="${apk.key}"][data-package-column="client"]`);
        const consume = matrix.querySelector(`[data-package-apk="${apk.key}"][data-package-column="consume"]`);
        const enabled = Boolean(client?.checked) && currentMode !== 'none';
        const apkConsumes = Boolean(consume?.checked);
        setRaw(byId.get(`package.${apk.key}.open`), enabled, false);
        setRaw(byId.get(`package.${apk.key}.access`), enabled && actionState.access.client, apkConsumes && actionState.access.consume);
        setRaw(byId.get(`package.${apk.key}.generate`), enabled && actionState.generate.client, apkConsumes && actionState.generate.consume);
        setRaw(byId.get(`package.${apk.key}.copy`), enabled && actionState.copy.client, apkConsumes && actionState.copy.consume);
      });
      data.actions = actionState;
      data.apks = Object.fromEntries(apks.map((apk) => {
        const client = matrix.querySelector(`[data-package-apk="${apk.key}"][data-package-column="client"]`);
        const consume = matrix.querySelector(`[data-package-apk="${apk.key}"][data-package-column="consume"]`);
        return [apk.key, { client:Boolean(client?.checked), consume:Boolean(consume?.checked) }];
      }));
      writeMatrix(data);
      syncDisabled();
    }

    function syncDisabled(){
      const currentMode = mode();
      matrix.querySelectorAll('[data-package-column="client"]').forEach((input) => { input.disabled = currentMode === 'none'; });
      matrix.querySelectorAll('[data-package-column="consume"]').forEach((input) => {
        const owner = input.dataset.packageAction
          ? matrix.querySelector(`[data-package-action="${input.dataset.packageAction}"][data-package-column="client"]`)
          : matrix.querySelector(`[data-package-apk="${input.dataset.packageApk}"][data-package-column="client"]`);
        input.disabled = currentMode !== 'test' || !owner?.checked;
        if (input.disabled) input.checked = false;
      });
      matrix.classList.toggle('jc-v2-hide-consume', currentMode !== 'test');
    }

    function loadMatrixFromStore(){
      const data = readMatrix();
      const currentMode = mode();
      ['access','generate','copy'].forEach((action) => {
        const saved = data.actions?.[action];
        const client = matrix.querySelector(`[data-package-action="${action}"][data-package-column="client"]`);
        const consume = matrix.querySelector(`[data-package-action="${action}"][data-package-column="consume"]`);
        client.checked = saved ? Boolean(saved.client) : currentMode !== 'none';
        consume.checked = currentMode === 'test' && Boolean(saved?.consume);
      });
      apks.forEach((apk) => {
        const saved = data.apks?.[apk.key];
        const open = byId.get(`package.${apk.key}.open`)?.client.checked;
        const client = matrix.querySelector(`[data-package-apk="${apk.key}"][data-package-column="client"]`);
        const consume = matrix.querySelector(`[data-package-apk="${apk.key}"][data-package-column="consume"]`);
        client.checked = saved ? Boolean(saved.client) : Boolean(open);
        consume.checked = currentMode === 'test' && Boolean(saved?.consume);
      });
      syncDisabled();
    }

    matrix.addEventListener('change', (event) => {
      if (!event.target.matches('input')) return;
      applyMatrix();
    });
    group.querySelectorAll('.jc-v2-access-box input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const currentMode = mode();
        if (currentMode === 'none') {
          matrix.querySelectorAll('input').forEach((input) => { input.checked = false; });
        } else if (currentMode === 'unlimited') {
          matrix.querySelectorAll('[data-package-column="client"]').forEach((input) => { input.checked = true; });
        }
        setTimeout(applyMatrix, 0);
      });
    });
    group.querySelector('[data-group-all]')?.addEventListener('change', () => {
      setTimeout(() => {
        const checked = group.querySelector('[data-group-all]')?.checked;
        matrix.querySelectorAll('[data-package-column="client"]').forEach((input) => { input.checked = Boolean(checked); });
        applyMatrix();
      }, 0);
    });

    loadMatrixFromStore();
    applyMatrix();
  }

  function run(){
    addIntro();
    addCreditProfileHint();
    document.querySelectorAll('#permissionTree .perm-group').forEach((group) => { decorate(group); decoratePackageMatrix(group); });
  }

  document.addEventListener('DOMContentLoaded', run);
  new MutationObserver(run).observe(document.documentElement, { subtree: true, childList: true });
  setInterval(run, 1500);
})();
